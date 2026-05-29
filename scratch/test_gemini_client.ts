import 'dotenv/config';
import { chatWithGemini } from '../src/lib/gemini-client.ts';

async function testGemini() {
  try {
    console.log("Testing Gemini...");
    const reply = await chatWithGemini([
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello, how are you?' }
    ]);
    console.log("Gemini Reply:", reply);
  } catch (err) {
    console.error("Gemini Test Failed:", err);
  }
}

testGemini();
