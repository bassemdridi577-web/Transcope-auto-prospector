import { getDb } from '../src/lib/db.ts';

async function bumpDates() {
  const db = getDb();
  try {
    const res = await db.query(`
      UPDATE articles 
      SET published_at = CURRENT_TIMESTAMP 
      WHERE title LIKE '%Expansion stratégique%' 
         OR title LIKE '%ELMED%' 
         OR title LIKE '%autoconsommation%' 
         OR title LIKE '%2,2 milliards%'
    `);
    console.log(`Updated ${res.rowCount} articles to current timestamp.`);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

bumpDates();
