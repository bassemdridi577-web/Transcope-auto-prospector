
import { getDb } from '../src/lib/db.ts';

async function disableProspecting() {
  const db = getDb();
  try {
    console.log('Disabling prospecting feature...');
    await db.query(
      "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
      ['prospecting_enabled', JSON.stringify(false)]
    );
    console.log('Prospecting feature disabled successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to disable prospecting:', err);
    process.exit(1);
  }
}

disableProspecting();
