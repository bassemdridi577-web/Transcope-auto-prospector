import axios from 'axios';

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function chatWithOpenRouter(messages: ChatMessage[], model: string = "openai/gpt-oss-120b:free") {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not defined in environment variables.");
  }

  // Debug log to verify which model is being used
  console.log(`[OpenRouter] Sending request using model: ${model}`);

  try {
    const response = await axios.post(
      OPENROUTER_URL,
      {
        model: model,
        messages: messages,
      },
      {
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://transcope.ai", 
          "X-Title": "Transcope AI",
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error?.message || error.message;
    console.error(`[OpenRouter] Error with model ${model}:`, errorMessage);
    throw new Error(errorMessage);
  }
}
