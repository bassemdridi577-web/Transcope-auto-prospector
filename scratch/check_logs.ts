
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkLogs() {
  try {
    const res = await pool.query("SELECT * FROM ai_logs ORDER BY timestamp DESC LIMIT 50");
    console.log(JSON.stringify(res.rows, null, 2));
    
    const articlesRes = await pool.query("SELECT count(*) FROM articles");
    console.log(`Total articles: ${articlesRes.rows[0].count}`);
    
    const recentArticles = await pool.query("SELECT title, published_at FROM articles ORDER BY created_at DESC LIMIT 5");
    console.log("Recent articles:", JSON.stringify(recentArticles.rows, null, 2));

  } catch (err) {
    console.error('Error checking logs:', err);
  } finally {
    await pool.end();
  }
}

checkLogs();
