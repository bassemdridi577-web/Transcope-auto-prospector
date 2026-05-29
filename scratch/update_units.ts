import { getDb } from '../src/lib/db.ts';

async function updateUnits() {
    const db = getDb();
    console.log('Updating units in database...');
    try {
        const result = await db.query("UPDATE materials SET unit = REPLACE(unit, 'mt', 'tonne métrique') WHERE unit LIKE '%mt%'");
        console.log(`Updated ${result.rowCount} materials.`);
    } catch (err) {
        console.error('Error updating units:', err);
    }
}

updateUnits();
