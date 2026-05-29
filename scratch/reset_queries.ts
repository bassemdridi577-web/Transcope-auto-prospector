
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function resetQueries() {
  try {
    await pool.query("UPDATE search_configs SET next_run_at = NULL, last_run_at = NULL");
    console.log("All search configurations have been reset to run immediately.");
  } catch (err) {
    console.error('Error resetting queries:', err);
  } finally {
    await pool.end();
  }
}

resetQueries();
