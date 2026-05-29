
import { getDb } from '../src/lib/db.ts';

async function updateReportsInterval() {
  const db = getDb();
  try {
    console.log('Updating report search configs to weekly interval...');
    // 10080 minutes = 1 week
    await db.query(`
      UPDATE search_configs 
      SET priority = 'weekly', 
          interval_minutes = 10080,
          next_run_at = CURRENT_TIMESTAMP + '1 week'::INTERVAL
      WHERE category = 'report'
    `);
    console.log('Report intervals updated successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to update report intervals:', err);
    process.exit(1);
  }
}

updateReportsInterval();
