import { getDb } from '../src/lib/db.ts';

async function checkSavedLogs() {
  const db = getDb();
  try {
    const res = await db.query("SELECT action, description, timestamp FROM ai_logs WHERE description LIKE '%Saved%' ORDER BY timestamp DESC LIMIT 20");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkSavedLogs();
