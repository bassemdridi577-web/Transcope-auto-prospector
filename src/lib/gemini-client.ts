import { GoogleGenerativeAI } from "@google/generative-ai";

const keys = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5,
].filter(Boolean) as string[];

let currentKeyIndex = 0;
const keyCooldowns: Record<number, number> = {};
const exhaustedKeys = new Set<string>(); // "keyIndex:modelName"

// Simple semaphore for concurrency control
let activeRequests = 0;
const MAX_CONCURRENT = 1; // Strictly 1 for free tier stability
const requestQueue: (() => void)[] = [];

async function acquireLock() {
  if (activeRequests < MAX_CONCURRENT) {
    activeRequests++;
    return;
  }
  return new Promise<void>(resolve => requestQueue.push(resolve));
}

function releaseLock() {
  activeRequests--;
  const next = requestQueue.shift();
  if (next) {
    activeRequests++;
    next();
  }
}

export function getGeminiClient(modelName?: string) {
  if (keys.length === 0) {
    throw new Error("No Gemini API keys found in environment variables.");
  }
  
  const now = Date.now();
  let attempts = 0;
  
  // Find the next available key that is not on cooldown and not exhausted for this model
  while (attempts < keys.length) {
    const index = currentKeyIndex;
    currentKeyIndex = (currentKeyIndex + 1) % keys.length;
    
    const exhaustionKey = `${index}:${modelName || 'any'}`;
    const cooldownUntil = keyCooldowns[index] || 0;
    
    if (now >= cooldownUntil && !exhaustedKeys.has(exhaustionKey)) {
      return { client: new GoogleGenerativeAI(keys[index]), index };
    }
    attempts++;
  }
  
  // If all keys are exhausted/on cooldown, return any but withGeminiRetry will handle it
  const index = currentKeyIndex;
  currentKeyIndex = (currentKeyIndex + 1) % keys.length;
  return { client: new GoogleGenerativeAI(keys[index]), index };
}

export async function withGeminiRetry<T>(
  modelName: string | undefined,
  fn: (client: GoogleGenerativeAI) => Promise<T>
): Promise<T> {
  await acquireLock();
  
  try {
    let lastError: any;
    const maxAttempts = keys.length;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const { client, index } = getGeminiClient(modelName);
      const exhaustionKey = `${index}:${modelName || 'any'}`;

      if (exhaustedKeys.has(exhaustionKey) && attempt < maxAttempts - 1) {
        continue; // Try next key if this one is already known to be exhausted for this model
      }

      try {
        return await fn(client);
      } catch (error: any) {
        lastError = error;
        
        const errorStr = JSON.stringify(error);
        const isRetryable = error.status === 429 || error.status === 503 || error.message?.includes("429") || error.message?.includes("503") || error.message?.includes("quota") || errorStr.includes("quota");
        
        if (isRetryable) {
          const isDailyLimit = errorStr.includes("PerDay") || error.message?.includes("limit: 0") || error.message?.includes("limit: 20");
          
          if (isDailyLimit) {
            console.warn(`Gemini Key #${index + 1}: Daily quota exhausted for ${modelName || 'model'}.`);
            exhaustedKeys.add(exhaustionKey);
            // Don't wait, immediately try next key
            continue;
          }

          // Otherwise, it's a per-minute limit or temporary overload
          let delay = 3000;
          if (error.errorDetails) {
            const retryInfo = error.errorDetails.find((d: any) => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo');
            if (retryInfo?.retryDelay) {
              const seconds = parseInt(retryInfo.retryDelay);
              if (!isNaN(seconds)) delay = (seconds + 1) * 1000;
            }
          }

          keyCooldowns[index] = Date.now() + delay;
          console.warn(`Gemini Key #${index + 1} rate limited. Cooldown: ${delay/1000}s. Trying next key...`);
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        
        // Non-quota error, propagate immediately
        throw error;
      }
    }
    
    throw lastError || new Error("All model attempts failed or no API keys were available.");
  } finally {
    releaseLock();
  }
}

export async function chatWithGemini(messages: { role: 'system' | 'user' | 'assistant', content: string }[], modelName: string = "gemini-1.5-flash") {
  return await withGeminiRetry(modelName, async (genAI) => {
    const model = genAI.getGenerativeModel({ model: modelName });
    
    // Separate system message from history
    const systemMessage = messages.find(m => m.role === 'system')?.content;
    const history = messages
      .filter(m => m.role !== 'system')
      .slice(0, -1)
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));
    
    const lastMessage = messages[messages.length - 1].content;

    const chat = model.startChat({
      history: history,
      systemInstruction: systemMessage ? { text: systemMessage } : undefined,
    });

    const result = await chat.sendMessage(lastMessage);
    return result.response.text();
  });
}
