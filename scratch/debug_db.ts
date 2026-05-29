
import 'dotenv/config';
import { getDb, initializeDatabase } from '../src/lib/db.ts';

async function checkConfigs() {
  await initializeDatabase();
  const db = getDb();
  const configs = await db.query("SELECT category, query, enabled, interval_minutes, last_run_at, next_run_at FROM search_configs");
  console.log("--- Search Configurations ---");
  console.table(configs.rows);
  
  const articlesCount = await db.query("SELECT type, count(*) as count FROM articles GROUP BY type");
  console.log("\n--- Articles Count ---");
  console.table(articlesCount.rows);
  
  process.exit(0);
}

checkConfigs().catch(err => {
  console.error(err);
  process.exit(1);
});
