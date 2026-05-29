import { chatWithOpenRouter } from '../src/lib/openrouter-client.ts';

// The key should be set in the environment, not hardcoded.
const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.error("OPENROUTER_API_KEY is not set in environment variables.");
  process.exit(1);
}

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
  console.log("=== Testing NEW OpenRouter API Key ===");
  
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
