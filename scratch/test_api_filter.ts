import { getDb } from '../src/lib/db.ts';

async function testFilter() {
  const db = getDb();
  const type = 'news,report';
  const region = 'All';
  
  let query = "SELECT * FROM articles WHERE 1=1";
  const params: any[] = [];
  let paramIndex = 1;

  if (type) {
    const types = (type as string).split(',');
    const placeholders = types.map((_, i) => `$${paramIndex + i}`).join(',');
    query += ` AND type IN (${placeholders})`;
    params.push(...types);
    paramIndex += types.length;
  }

  query += " ORDER BY published_at DESC LIMIT 1";
  
  try {
    const result = await db.query(query, params);
    console.log("Top result:", result.rows[0]);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

testFilter();
