
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkProspects() {
  try {
    const res = await pool.query('SELECT COUNT(*) FROM prospects');
    console.log('Prospects count:', res.rows[0].count);
    const recent = await pool.query('SELECT * FROM prospects ORDER BY created_at DESC LIMIT 5');
    console.log('Recent prospects:', recent.rows);
  } catch (err) {
    console.error('Error checking prospects:', err);
  } finally {
    await pool.end();
  }
}

checkProspects();
