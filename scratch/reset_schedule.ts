
import 'dotenv/config';
import { getDb, initializeDatabase } from '../src/lib/db.ts';

async function resetSchedule() {
  await initializeDatabase();
  const db = getDb();
  
  console.log("Resetting next_run_at for all enabled search configurations...");
  const res = await db.query(`
    UPDATE search_configs 
    SET next_run_at = CURRENT_TIMESTAMP 
    WHERE enabled = true
    RETURNING id, query
  `);
  
  console.log(`Successfully reset ${res.rowCount} configurations.`);
  console.log("The next automation cycle will pick these up immediately.");
  
  process.exit(0);
}

resetSchedule().catch(err => {
  console.error(err);
  process.exit(1);
});
