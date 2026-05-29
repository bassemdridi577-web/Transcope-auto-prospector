import 'dotenv/config';
import readline from 'readline';
import axios from 'axios';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { withGeminiRetry } from '../lib/gemini-client.ts';
import { chatWithOpenRouter } from '../lib/openrouter-client.ts';

// Check for keys
const keysFound = Object.keys(process.env).filter(k => k.startsWith('GEMINI_API_KEY_')).length;
if (keysFound === 0) {
  console.error("CRITICAL: No GEMINI_API_KEY_X found in environment variables!");
  console.log("Make sure you have a .env file in the root directory.");
} else {
  console.log(`System: Found ${keysFound} Gemini API keys.`);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const models = [
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "openrouter-gemini"
];

async function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function testGemini(modelName: string, prompt: string) {
  console.log(`\n--- Testing ${modelName} (via Google API) ---`);
  try {
    const response = await withGeminiRetry(modelName, async (genAI) => {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text();
    });
    console.log("Response:", response);
  } catch (err: any) {
    console.error("Error details:", err);
  }
}

async function testOpenRouter(prompt: string) {
  console.log(`\n--- Testing OpenRouter (openai/gpt-oss-120b:free) ---`);
  try {
    const response = await chatWithOpenRouter([{ role: 'user', content: prompt }]);
    console.log("Response:", response);
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

async function main() {
  console.log("=== AI Model Tester ===");
  
  while (true) {
    console.log("\nAvailable models:");
    models.forEach((m, i) => console.log(`${i + 1}. ${m}`));
    console.log("q. Quit");
    
    const choice = await ask("\nSelect a model (number) or 'q': ");
    if (choice.toLowerCase() === 'q') break;
    
    const index = parseInt(choice) - 1;
    if (isNaN(index) || index < 0 || index >= models.length) {
      console.log("Invalid choice.");
      continue;
    }
    
    const prompt = await ask("Enter your prompt: ");
    const selectedModel = models[index];
    
    if (selectedModel === "openrouter-gemini") {
      await testOpenRouter(prompt);
    } else {
      await testGemini(selectedModel, prompt);
    }
  }
  
  rl.close();
}

main().catch(console.error);
