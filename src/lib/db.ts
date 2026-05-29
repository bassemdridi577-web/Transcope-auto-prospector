import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getDb() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.warn('DATABASE_URL is not defined in environment variables. Database connection may fail.');
    }
    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }
  return pool;
}

export async function initializeDatabase() {
  const db = getDb();
  
  // Create tables if they don't exist
  await db.query(`
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL, -- 'news' or 'report'
      title TEXT NOT NULL,
      summary TEXT,
      body TEXT,
      region TEXT, -- 'Tunisia' | 'Africa' | 'World'
      published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      sources TEXT, -- JSON array of URLs
      image_url TEXT
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      start_date TIMESTAMP NOT NULL,
      end_date TIMESTAMP NOT NULL,
      location TEXT,
      region TEXT, -- 'Tunisia' | 'Africa' | 'World'
      url TEXT,
      sources TEXT -- JSON array of URLs
    );

    CREATE TABLE IF NOT EXISTS materials (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL, -- e.g., 'Copper', 'Aluminum', 'Silicon Steel', 'Transformer Oil'
      unit TEXT NOT NULL,
      current_price DECIMAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ai_commentary TEXT,
      trend_percentage DECIMAL DEFAULT 0,
      source_url TEXT
    );

    CREATE TABLE IF NOT EXISTS material_prices (
      id TEXT PRIMARY KEY,
      material_id TEXT NOT NULL,
      price DECIMAL NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (material_id) REFERENCES materials (id)
    );

    CREATE TABLE IF NOT EXISTS directory_entries (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'manufacturer' | 'project' | 'stakeholder'
      region TEXT, 
      country TEXT,
      description TEXT,
      website TEXT
    );

    CREATE TABLE IF NOT EXISTS ai_logs (
      id SERIAL PRIMARY KEY,
      action TEXT NOT NULL, -- 'Search', 'Synthesis', 'Automation'
      description TEXT,
      details JSONB,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS search_configs (
      id TEXT PRIMARY KEY,
      query TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'en',
      category TEXT NOT NULL,
      region TEXT NOT NULL DEFAULT 'World',
      priority TEXT NOT NULL DEFAULT 'medium',
      enabled BOOLEAN DEFAULT true,
      interval_minutes INTEGER NOT NULL DEFAULT 60,
      last_run_at TIMESTAMP,
      next_run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS source_scores (
      domain TEXT PRIMARY KEY,
      score INTEGER DEFAULT 0,
      total_articles INTEGER DEFAULT 0,
      last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Migrations
    ALTER TABLE materials ADD COLUMN IF NOT EXISTS source_url TEXT;

    CREATE TABLE IF NOT EXISTS prospects (
      id SERIAL PRIMARY KEY,
      company_name TEXT NOT NULL,
      contact_info TEXT,
      opportunity_id TEXT,
      pitch TEXT,
      status TEXT DEFAULT 'New', -- 'New' | 'Contacted' | 'Interested'
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (opportunity_id) REFERENCES articles (id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL
    );

    INSERT INTO settings (key, value) 
    VALUES ('prospecting_enabled', 'false'::jsonb)
    ON CONFLICT (key) DO UPDATE SET value = 'false'::jsonb;

    -- Add 30 minutes to all existing automation intervals (one-time migration)
    INSERT INTO settings (key, value) VALUES ('intervals_delayed_v1', 'true'::jsonb)
    ON CONFLICT (key) DO NOTHING;

    UPDATE search_configs 
    SET interval_minutes = interval_minutes + 30,
        next_run_at = next_run_at + '30 minutes'::INTERVAL
    WHERE id IN (
      SELECT id FROM search_configs 
      WHERE (SELECT value FROM settings WHERE key = 'intervals_delayed_v1') = 'true'::jsonb
    ) AND NOT EXISTS (SELECT 1 FROM settings WHERE key = 'intervals_delayed_v1_applied');

    INSERT INTO settings (key, value) VALUES ('intervals_delayed_v1_applied', 'true'::jsonb)
    ON CONFLICT (key) DO NOTHING;

    -- Migration: enforce twice-daily intervals on all existing search_configs
    INSERT INTO settings (key, value) VALUES ('intervals_twicedaily_v1', 'true'::jsonb)
    ON CONFLICT (key) DO NOTHING;

    UPDATE search_configs SET
      interval_minutes = CASE priority
        WHEN 'high'   THEN 720
        WHEN 'medium' THEN 1440
        WHEN 'low'    THEN 2880
        WHEN 'weekly' THEN 10080
        ELSE 720
      END,
      next_run_at = CURRENT_TIMESTAMP
    WHERE NOT EXISTS (
      SELECT 1 FROM settings WHERE key = 'intervals_twicedaily_v1_applied'
    );

    INSERT INTO settings (key, value) VALUES ('intervals_twicedaily_v1_applied', 'true'::jsonb)
    ON CONFLICT (key) DO NOTHING;

    -- Migration: Insert Tenders specific configs
    INSERT INTO search_configs (id, query, language, category, region, priority, interval_minutes)
    VALUES 
      ('tnd-tun-fr', 'appel d''offre transformateur STEG Tunisie 2026', 'fr', 'tenders', 'Tunisia', 'high', 720),
      ('tnd-afr-fr', 'appel d''offre transformateur distribution puissance Afrique SONELGAZ Senelec CEET', 'fr', 'tenders', 'Africa', 'high', 720),
      ('tnd-afr-en', 'transformer procurement tender Africa utility 2026', 'en', 'tenders', 'Africa', 'high', 720),
      ('tnd-world-en', 'international tender electric power transformer global 2026', 'en', 'tenders', 'World', 'medium', 1440),
      ('tnd-world-ar', 'مناقصة محولات كهربائية أفريقيا تونس 2026', 'ar', 'tenders', 'Africa', 'high', 720)
    ON CONFLICT (id) DO NOTHING;
  `);

  await seedSearchConfigs(db);
}

// Priority → interval mapping (minutes)
const PRIORITY_INTERVALS: Record<string, number> = {
  high: 720,      // 12 hours
  medium: 1440,   // 24 hours
  low: 2880,      // 48 hours
  weekly: 10080,  // 7 days
};

// If the user wants 30m added to EVERYTHING strictly:
// weekly: 10080 + 30,


async function seedSearchConfigs(db: pg.Pool) {
  const existing = await db.query("SELECT COUNT(*) as count FROM search_configs");
  if (parseInt(existing.rows[0].count) > 0) return;

  console.log("[Seed] Populating search_configs with default queries...");

  const defaults = [
    // Transformers — English
    { q: 'electric power transformer industry news Tunisia Africa', lang: 'en', cat: 'transformers', region: 'Tunisia', priority: 'high' },
    { q: 'distribution transformer manufacturing Africa market 2026', lang: 'en', cat: 'transformers', region: 'Africa', priority: 'medium' },
    { q: 'transformer procurement tenders Africa infrastructure', lang: 'en', cat: 'transformers', region: 'Africa', priority: 'high' },
    { q: 'high voltage transformer grid modernization Africa', lang: 'en', cat: 'transformers', region: 'Africa', priority: 'medium' },
    { q: 'transformer market growth North Africa Middle East', lang: 'en', cat: 'transformers', region: 'World', priority: 'low' },
    // Transformers — French
    { q: 'transformateur électrique industrie Tunisie actualités', lang: 'fr', cat: 'transformers', region: 'Tunisia', priority: 'high' },
    { q: 'fabrication transformateurs Afrique marché 2026', lang: 'fr', cat: 'transformers', region: 'Africa', priority: 'medium' },
    { q: "appel d'offre transformateur réseau électrique Tunisie STEG", lang: 'fr', cat: 'transformers', region: 'Tunisia', priority: 'high' },
    { q: 'transformateur haute tension modernisation réseau Afrique SONELGAZ CEET Senelec', lang: 'fr', cat: 'transformers', region: 'Africa', priority: 'medium' },
    // Transformers — Arabic
    { q: 'محولات كهربائية صناعة تونس أفريقيا', lang: 'ar', cat: 'transformers', region: 'Tunisia', priority: 'medium' },
    { q: 'سوق المحولات الكهربائية شمال أفريقيا 2026', lang: 'ar', cat: 'transformers', region: 'Africa', priority: 'medium' },
    // Opportunities
    { q: 'upcoming electrical infrastructure projects Tunisia 2026 2030', lang: 'en', cat: 'opportunities', region: 'Tunisia', priority: 'high' },
    { q: 'projets infrastructure électrique Tunisie 2026 2030 STEG', lang: 'fr', cat: 'opportunities', region: 'Tunisia', priority: 'high' },
    { q: 'tenders distribution transformers Africa 2026', lang: 'en', cat: 'opportunities', region: 'Africa', priority: 'high' },
    { q: "appels d'offres transformateurs de distribution Afrique 2026", lang: 'fr', cat: 'opportunities', region: 'Africa', priority: 'high' },
    { q: 'Tunisia renewable energy grid expansion projects', lang: 'en', cat: 'opportunities', region: 'Tunisia', priority: 'medium' },
    { q: "investissements réseaux électriques Afrique de l'Ouest", lang: 'fr', cat: 'opportunities', region: 'Africa', priority: 'medium' },
    { q: 'competitor news SACEM industrial transformers Africa', lang: 'en', cat: 'opportunities', region: 'Africa', priority: 'medium' },
    // Raw Materials
    { q: 'transformer raw materials copper silicon steel price 2026', lang: 'en', cat: 'rawMaterials', region: 'World', priority: 'medium' },
    { q: 'grain oriented electrical steel GOES market supply Africa', lang: 'en', cat: 'rawMaterials', region: 'Africa', priority: 'medium' },
    { q: 'transformer oil insulation materials market trends', lang: 'en', cat: 'rawMaterials', region: 'World', priority: 'low' },
    { q: 'copper wire winding transformer cost supply chain Africa', lang: 'en', cat: 'rawMaterials', region: 'Africa', priority: 'medium' },
    { q: 'CRGO steel price forecast transformer manufacturing', lang: 'en', cat: 'rawMaterials', region: 'World', priority: 'medium' },
    { q: 'epoxy resin insulation transformer materials shortage', lang: 'en', cat: 'rawMaterials', region: 'World', priority: 'low' },
    { q: 'matières premières transformateur cuivre acier prix 2026', lang: 'fr', cat: 'rawMaterials', region: 'World', priority: 'medium' },
    { q: 'tôle magnétique acier silicium marché Afrique', lang: 'fr', cat: 'rawMaterials', region: 'Africa', priority: 'medium' },
    { q: 'huile transformateur isolant approvisionnement Tunisie', lang: 'fr', cat: 'rawMaterials', region: 'Tunisia', priority: 'medium' },
    { q: 'مواد خام محولات نحاس فولاذ سليكون أسعار', lang: 'ar', cat: 'rawMaterials', region: 'World', priority: 'low' },
    // Photovoltaic
    { q: 'photovoltaic solar transformer inverter Africa market 2026', lang: 'en', cat: 'photovoltaic', region: 'Africa', priority: 'medium' },
    { q: 'solar farm transformer specifications Africa grid connection', lang: 'en', cat: 'photovoltaic', region: 'Africa', priority: 'medium' },
    { q: 'PV plant transformer procurement Tunisia renewable energy', lang: 'en', cat: 'photovoltaic', region: 'Tunisia', priority: 'high' },
    { q: 'solar energy transformer station Africa infrastructure', lang: 'en', cat: 'photovoltaic', region: 'Africa', priority: 'medium' },
    { q: 'renewable energy transformer demand Africa growth', lang: 'en', cat: 'photovoltaic', region: 'Africa', priority: 'low' },
    { q: 'transformateur photovoltaïque solaire Tunisie Afrique 2026', lang: 'fr', cat: 'photovoltaic', region: 'Tunisia', priority: 'high' },
    { q: 'centrale solaire transformateur raccordement réseau Tunisie', lang: 'fr', cat: 'photovoltaic', region: 'Tunisia', priority: 'medium' },
    { q: 'énergie renouvelable transformateur demande Afrique', lang: 'fr', cat: 'photovoltaic', region: 'Africa', priority: 'medium' },
    { q: 'محولات الطاقة الشمسية تونس أفريقيا 2026', lang: 'ar', cat: 'photovoltaic', region: 'Tunisia', priority: 'medium' },
    { q: 'محطة طاقة شمسية محولات ربط شبكة', lang: 'ar', cat: 'photovoltaic', region: 'World', priority: 'low' },
    // Events
    { q: 'electrical power industry conferences exhibitions Africa 2026', lang: 'en', cat: 'events', region: 'Africa', priority: 'low' },
    { q: 'événements industrie électrique Afrique Tunisie 2026', lang: 'fr', cat: 'events', region: 'Tunisia', priority: 'low' },
    { q: 'tender deadlines distribution transformers STEG SONELGAZ', lang: 'en', cat: 'events', region: 'World', priority: 'medium' },
    // Directory
    { q: 'transformer manufacturers North Africa directory', lang: 'en', cat: 'directory', region: 'Africa', priority: 'low' },
    { q: 'fabricants transformateurs Afrique annuaire', lang: 'fr', cat: 'directory', region: 'Africa', priority: 'low' },
    { q: 'major grid expansion projects Africa list', lang: 'en', cat: 'directory', region: 'Africa', priority: 'low' },
    // Reports (Weekly)
    { q: 'African electric power sector annual strategic report 2026', lang: 'en', cat: 'report', region: 'Africa', priority: 'weekly' },
    { q: 'Tunisia energy transition and grid modernization white paper', lang: 'en', cat: 'report', region: 'Tunisia', priority: 'weekly' },
    { q: 'transformer technology trends and future market analysis 2030', lang: 'en', cat: 'report', region: 'World', priority: 'weekly' },
    { q: 'rapport stratégique industrie électrique Afrique 2026', lang: 'fr', cat: 'report', region: 'Africa', priority: 'weekly' },
    // Tenders (New Tab requirements)
    { q: 'appel d\'offre transformateur STEG Tunisie 2026', lang: 'fr', cat: 'tenders', region: 'Tunisia', priority: 'high' },
    { q: 'appel d\'offre transformateur distribution puissance Afrique SONELGAZ Senelec CEET', lang: 'fr', cat: 'tenders', region: 'Africa', priority: 'high' },
    { q: 'transformer procurement tender Africa utility 2026', lang: 'en', cat: 'tenders', region: 'Africa', priority: 'high' },
    { q: 'international tender electric power transformer global 2026', lang: 'en', cat: 'tenders', region: 'World', priority: 'medium' },
    { q: 'licitación transformador eléctrico potencia distribución 2026', lang: 'es', cat: 'tenders', region: 'World', priority: 'medium' },
    { q: 'مناقصة محولات كهربائية أفريقيا تونس 2026', lang: 'ar', cat: 'tenders', region: 'Africa', priority: 'high' },
  ];

  for (const entry of defaults) {
    const id = Math.random().toString(36).substring(2, 10);
    const interval = PRIORITY_INTERVALS[entry.priority] || 60;
    await db.query(
      `INSERT INTO search_configs (id, query, language, category, region, priority, interval_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [id, entry.q, entry.lang, entry.cat, entry.region, entry.priority, interval]
    );
  }

  console.log(`[Seed] Inserted ${defaults.length} default search configs.`);
}

export async function logAiAction(action: string, description: string, details: any = {}) {
  const db = getDb();
  try {
    await db.query(
      "INSERT INTO ai_logs (action, description, details) VALUES ($1, $2, $3)",
      [action, description, JSON.stringify(details)]
    );
  } catch (err) {
    console.error("Failed to log AI action:", err);
  }
}

export async function updateSourceScore(url: string, delta: number) {
  const db = getDb();
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    await db.query(
      `INSERT INTO source_scores (domain, score, total_articles, last_seen_at)
       VALUES ($1, $2, 1, CURRENT_TIMESTAMP)
       ON CONFLICT (domain) DO UPDATE SET
         score = source_scores.score + $2,
         total_articles = source_scores.total_articles + 1,
         last_seen_at = CURRENT_TIMESTAMP`,
      [domain, delta]
    );
  } catch (err) {
    // Silently fail for invalid URLs
  }
}
