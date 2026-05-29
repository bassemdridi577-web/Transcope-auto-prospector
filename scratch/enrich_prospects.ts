
import pg from 'pg';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_1!);

async function enrichProspects() {
  try {
    const res = await pool.query('SELECT id, company_name FROM prospects WHERE contact_info IS NULL');
    console.log(`Found ${res.rows.length} prospects to enrich.`);
    
    for (const row of res.rows) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const prompt = `Trouve une information de contact (Site web ou email type) pour l'entreprise suivante dans le secteur électrique : "${row.company_name}". Réponds uniquement avec l'info de contact (ex: www.sonelgaz.dz ou contact@giz.de).`;
        const result = await model.generateContent(prompt);
        const contact = result.response.text().trim();
        
        await pool.query('UPDATE prospects SET contact_info = $1 WHERE id = $2', [contact, row.id]);
        console.log(`Enriched ${row.company_name} with: ${contact}`);
      } catch (e) {
        console.error(`Failed to enrich ${row.company_name}`);
      }
    }
  } catch (err) {
    console.error('Error enriching prospects:', err);
  } finally {
    await pool.end();
  }
}

enrichProspects();
