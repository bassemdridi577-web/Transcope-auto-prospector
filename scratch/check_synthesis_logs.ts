import { getDb } from '../src/lib/db.ts';

async function checkSynthesis() {
  const db = getDb();
  try {
    const res = await db.query("SELECT action, description, timestamp FROM ai_logs WHERE action LIKE '%Synthesis%' OR action LIKE '%Automation%' ORDER BY timestamp DESC LIMIT 20");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkSynthesis();
