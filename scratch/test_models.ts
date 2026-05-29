
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const key = process.env.GEMINI_API_KEY_1;
const genAI = new GoogleGenerativeAI(key!);

async function listModels() {
  try {
    // The SDK doesn't have a direct listModels, but we can try to hit the endpoint or just guess
    // Actually, let's just try a simple generateContent with a few model names
    const models = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-2.0-flash"];
    for (const m of models) {
      try {
        const model = genAI.getGenerativeModel({ model: m });
        const result = await model.generateContent("test");
        console.log(`Model ${m} is WORKING`);
      } catch (err: any) {
        console.log(`Model ${m} FAILED: ${err.message}`);
      }
    }
  } catch (err) {
    console.error('Error listing models:', err);
  }
}

listModels();
