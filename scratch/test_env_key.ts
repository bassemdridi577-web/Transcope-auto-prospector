import 'dotenv/config';

console.log("GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? `${process.env.GEMINI_API_KEY.substring(0, 7)}... (length: ${process.env.GEMINI_API_KEY.length})` : "undefined");
console.log("GEMINI_API_KEY_1:", process.env.GEMINI_API_KEY_1 ? `${process.env.GEMINI_API_KEY_1.substring(0, 7)}... (length: ${process.env.GEMINI_API_KEY_1.length})` : "undefined");
console.log("OPENROUTER_API_KEY:", process.env.OPENROUTER_API_KEY ? `${process.env.OPENROUTER_API_KEY.substring(0, 7)}... (length: ${process.env.OPENROUTER_API_KEY.length})` : "undefined");
