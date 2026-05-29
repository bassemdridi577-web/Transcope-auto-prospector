import { getDb } from '../lib/db.ts';
import 'dotenv/config';

async function checkLogs() {
  const db = getDb();

  // Check ai_logs columns
  const cols = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'ai_logs'");
  console.log("--- ai_logs columns ---");
  console.log(cols.rows.map(r => r.column_name).join(', '));

  // Get recent logs
  const logs = await db.query("SELECT * FROM ai_logs ORDER BY id DESC LIMIT 20");
  console.log("\n--- Recent AI Logs ---");
  logs.rows.forEach(r => console.log(JSON.stringify(r)));

  // Check recent articles
  const articles = await db.query("SELECT id, title, type, published_at FROM articles ORDER BY published_at DESC LIMIT 10");
  console.log("\n--- Recent Articles ---");
  articles.rows.forEach(r => console.log(`[${r.published_at}] (${r.type}) ${r.title}`));

  // Check search_configs last_run
  const configs = await db.query("SELECT category, region, last_run_at, next_run_at FROM search_configs WHERE last_run_at IS NOT NULL ORDER BY last_run_at DESC LIMIT 10");
  console.log("\n--- Recent Search Runs ---");
  configs.rows.forEach(r => console.log(`[${r.last_run_at}] ${r.category}::${r.region} → next: ${r.next_run_at}`));

  process.exit(0);
}

checkLogs().catch(console.error);

