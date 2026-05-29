
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkRecentArticles() {
  try {
    const res = await pool.query("SELECT title, published_at FROM articles ORDER BY published_at DESC LIMIT 10");
    console.log("Most recent articles by published_at:", JSON.stringify(res.rows, null, 2));
    
    const errors = await pool.query("SELECT * FROM ai_logs WHERE action LIKE '%Error%' ORDER BY timestamp DESC LIMIT 20");
    console.log("Recent Errors:", JSON.stringify(errors.rows, null, 2));

    const synthesis = await pool.query("SELECT * FROM ai_logs WHERE action = 'Synthesis' ORDER BY timestamp DESC LIMIT 10");
    console.log("Recent Synthesis Logs:", JSON.stringify(synthesis.rows, null, 2));

  } catch (err) {
    console.error('Error checking:', err);
  } finally {
    await pool.end();
  }
}

checkRecentArticles();
