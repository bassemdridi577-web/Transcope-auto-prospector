import { initializeDatabase, getDb } from '../src/lib/db.ts';

async function checkArticles() {
  await initializeDatabase();
  const db = getDb();
  const res = await db.query("SELECT id, title, type FROM articles ORDER BY published_at DESC LIMIT 10");
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit(0);
}

checkArticles().catch(console.error);
