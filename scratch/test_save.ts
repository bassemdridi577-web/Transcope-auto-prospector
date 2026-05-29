import { getDb } from '../src/lib/db.ts';

async function testSave() {
  const db = getDb();
  const id = 'test-' + Date.now();
  const title = 'TEST ARTICLE ' + new Date().toLocaleString();
  const type = 'news';
  const region = 'Tunisia';
  const publishedAt = new Date();

  console.log(`Saving ${title} at ${publishedAt.toISOString()}`);

  try {
    await db.query(`
      INSERT INTO articles (id, type, title, summary, body, region, sources, image_url, published_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [id, type, title, 'Test summary', 'Test body', region, JSON.stringify([]), 'https://via.placeholder.com/150', publishedAt.toISOString()]);
    
    console.log("Saved successfully");
    
    const check = await db.query("SELECT * FROM articles WHERE id = $1", [id]);
    console.log("Verified in DB:", check.rows[0]);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

testSave();
