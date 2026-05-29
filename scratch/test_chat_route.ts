import 'dotenv/config';
import { GoogleGenerativeAI } from "@google/generative-ai";

const messages = [
  { role: 'system' as const, content: 'You are a helpful assistant.' },
  { role: 'user' as const, content: 'Hello' }
];

async function tryKeyAndRole(keyIndex: number, key: string, role: string) {
  try {
    const genAI = new GoogleGenerativeAI(key);
    // Let's try gemini-1.5-flash and gemini-2.0-flash
    const models = ["gemini-1.5-flash", "gemini-2.0-flash"];
    
    for (const modelName of models) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const systemMessage = "You are a helpful assistant.";
        const history = [
          {
            role: 'user',
            parts: [{ text: 'Hello' }]
          }
        ];

        const chat = model.startChat({
          history: history,
          systemInstruction: {
            role: role,
            parts: [{ text: systemMessage }]
          }
        });

        const result = await chat.sendMessage("How are you?");
        console.log(`[SUCCESS] Key #${keyIndex} | Model: ${modelName} | Role: "${role}":`, result.response.text().substring(0, 100));
        return true;
      } catch (err: any) {
        console.error(`[FAIL] Key #${keyIndex} | Model: ${modelName} | Role: "${role}":`, err.message || err);
      }
    }
  } catch (err: any) {
    console.error(`[CRITICAL FAIL] Key #${keyIndex}:`, err.message || err);
  }
  return false;
}

async function run() {
  const keys = [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5,
  ].filter(Boolean) as string[];

  console.log(`Found ${keys.length} keys to test.`);
  
  const roles = ["system", "user", "model"];
  
  for (let i = 0; i < keys.length; i++) {
    console.log(`\n================ Testing Key #${i + 1} ================`);
    for (const role of roles) {
      await tryKeyAndRole(i + 1, keys[i], role);
    }
  }
}

run();
