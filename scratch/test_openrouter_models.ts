import 'dotenv/config';
import { chatWithOpenRouter } from '../src/lib/openrouter-client.ts';

const models = [
  "openai/gpt-oss-120b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "baidu/qianfan-ocr-fast:free",
  "openrouter/free"
];

const messages = [
  { role: 'user' as const, content: 'Hello, this is a test. Answer with exactly "OK".' }
];

async function run() {
  console.log("=== Testing Chatbot OpenRouter Models ===");
  console.log(`API Key defined? ${!!process.env.OPENROUTER_API_KEY}`);
  if (process.env.OPENROUTER_API_KEY) {
    console.log(`API Key prefix: ${process.env.OPENROUTER_API_KEY.substring(0, 10)}...`);
  }

  for (const model of models) {
    console.log(`\nTesting model: "${model}"...`);
    try {
      const reply = await chatWithOpenRouter(messages, model);
      console.log(`[SUCCESS] "${model}":`, reply);
    } catch (err: any) {
      console.error(`[FAIL] "${model}":`, err.message || err);
    }
  }
}

run();
