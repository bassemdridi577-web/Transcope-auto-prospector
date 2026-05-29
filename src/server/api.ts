import { Router } from "express";
import { getDb } from "../lib/db.ts";
import { 
  runAutomationCycle, 
  searchIndustryInfo, 
  synthesizeArticlesFromResults,
  synthesizeTendersFromResults,
  runSingleSearchConfig,
  updateMaterialPrices,
  isSearXNGAvailable
} from "../lib/automation.ts";
import axios from 'axios';
import { chatWithOpenRouter } from "../lib/openrouter-client.ts";
import { chatWithGemini } from "../lib/gemini-client.ts";

const router = Router();

router.get("/health", (req, res) => res.json({ status: "ok" }));

router.post("/automation/run", async (req, res) => {
  try {
    // Run in background
    runAutomationCycle().catch(err => console.error("Manual automation run failed:", err));
    res.json({ success: true, message: "Automation cycle started in background" });
  } catch (err) {
    res.status(500).json({ error: "Failed to start automation" });
  }
});

router.get("/settings", async (req, res) => {
  const db = getDb();
  try {
    const result = await db.query("SELECT * FROM settings");
    const settings: Record<string, any> = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

router.post("/settings", async (req, res) => {
  const { key, value } = req.body;
  const db = getDb();
  try {
    await db.query(
      "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
      [key, JSON.stringify(value)]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update setting" });
  }
});

// Test endpoint: search SearXNG
router.post("/test/search", async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: "Query is required" });
  try {
    const results = await searchIndustryInfo(query);
    res.json({ query, resultCount: results.length, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Search failed" });
  }
});

// --- Tenders (Appels d'Offres) dedicated search ---
router.post("/tenders/search", async (req, res) => {
  try {
    console.log("[Tenders] Manual multi-language search triggered...");

    const tenderQueries = [
      { q: "appel d'offre fourniture transformateur électrique puissance distribution 2026", lang: "fr" },
      { q: "appel d'offre acquisition transformateur STEG Tunisie 2026", lang: "fr" },
      { q: "appel d'offre fourniture transformateur Afrique SONELGAZ Senelec 2026", lang: "fr" },
      { q: "tender supply power distribution transformer Africa 2026", lang: "en" },
      { q: "procurement bid power transformer supply delivery 2026", lang: "en" },
      { q: "مناقصة توريد محولات كهربائية قدرة توزيع أفريقيا تونس 2026", lang: "ar" },
    ];

    // Sequential search to avoid overloading SearXNG
    const allResults: any[] = [];
    for (const entry of tenderQueries) {
      const results = await searchIndustryInfo(entry.q, entry.lang);
      allResults.push(...results);
      await new Promise(r => setTimeout(r, 1500));
    }

    // Deduplicate by URL
    const seen = new Set<string>();
    const uniqueResults = allResults.filter(r => {
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });

    console.log(`[Tenders] ${uniqueResults.length} unique results from ${tenderQueries.length} queries`);

    if (uniqueResults.length === 0) {
      return res.json({ success: true, message: "Aucun résultat trouvé", count: 0 });
    }

    // Get existing titles for dedup
    const db = getDb();
    const existingRes = await db.query("SELECT title FROM articles WHERE type = 'tenders' ORDER BY published_at DESC LIMIT 100");
    const existingTitles = existingRes.rows.map((r: any) => r.title);

    // Use the specialized tender synthesis with intelligence extraction
    const tenders = await synthesizeTendersFromResults("World", uniqueResults, existingTitles);

    // Save verified tenders with embedded intelligence
    let savedCount = 0;
    for (const tender of tenders) {
      if (!tender.sources || tender.sources.length === 0) continue;
      const hasValidUrl = tender.sources.some((s: string) => s.startsWith('http'));
      if (!hasValidUrl) continue;

      // Embed intelligence into summary and body
      const enrichedSummary = [
        `🏛️ ${tender.issuing_organization || 'Organisme non précisé'}`,
        `📅 Échéance: ${tender.deadline || 'Non précisée'}`,
        `💰 ${tender.estimated_value || 'Non communiquée'}`,
        `⚡ Type: ${tender.transformer_type || 'Non précisé'}`,
        '',
        tender.summary || ''
      ].join('\n');

      const enrichedBody = [
        `**Organisme émetteur:** ${tender.issuing_organization || 'Non précisé'}`,
        `**Date limite de soumission:** ${tender.deadline || 'Non précisée'}`,
        `**Valeur estimée:** ${tender.estimated_value || 'Non communiquée'}`,
        `**Type de transformateur:** ${tender.transformer_type || 'Non précisé'}`,
        `**Score de pertinence:** ${'⭐'.repeat(Math.min(tender.relevance_score || 3, 5))} (${tender.relevance_score}/5)`,
        '',
        tender.body || ''
      ].join('\n');

      const id = Math.random().toString(36).substring(7);
      await db.query(`
        INSERT INTO articles (id, type, title, summary, body, region, sources, image_url, published_at)
        VALUES ($1, 'tenders', $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO NOTHING
      `, [
        id,
        (tender.title || '').replace(/\0/g, '').replace(/^#+\s*/, '').trim(),
        enrichedSummary.replace(/\0/g, ''),
        enrichedBody.replace(/\0/g, ''),
        tender.region || 'World',
        JSON.stringify(tender.sources),
        `https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=600&fit=crop`
      ]);
      savedCount++;
      console.log(`[Tenders] Saved: "${tender.title}" (Score: ${tender.relevance_score}/5, Org: ${tender.issuing_organization})`);
    }

    console.log(`[Tenders] Saved ${savedCount} verified tenders (from ${tenders.length} extracted)`);
    res.json({ success: true, savedCount, extracted: tenders.length });
  } catch (err) {
    console.error("[Tenders] Search failed:", err);
    res.status(500).json({ error: "Tenders search failed" });
  }
});

// Test endpoint: search + synthesize with Gemini
router.post("/test/synthesize", async (req, res) => {
    const { query, region, category } = req.body;
  if (!query) return res.status(400).json({ error: "Query is required" });
  try {
    const searchResults = await searchIndustryInfo(query);
    if (searchResults.length === 0) {
      return res.json({ query, articles: [], message: "No search results found" });
    }
    const articles = await synthesizeArticlesFromResults(region || "World", category || "transformers", searchResults);
    res.json({ query, region: region || "World", category: category || "transformers", searchResultCount: searchResults.length, articles });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Synthesis failed" });
  }
});

router.post("/articles", async (req, res) => {
  const db = getDb();
  const { id, type, title, summary, body, region, sources, image_url } = req.body;
  
  try {
    await db.query(`
      INSERT INTO articles (id, type, title, summary, body, region, sources, image_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT(id) DO UPDATE SET 
        title=EXCLUDED.title, 
        summary=EXCLUDED.summary, 
        body=EXCLUDED.body,
        sources=EXCLUDED.sources
    `, [id, type, title, summary, body, region, JSON.stringify(sources), image_url]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

router.post("/events", async (req, res) => {
  const db = getDb();
  const { id, name, description, start_date, end_date, location, region, url, sources } = req.body;
  try {
    await db.query(`
      INSERT INTO events (id, name, description, start_date, end_date, location, region, url, sources)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT(id) DO UPDATE SET 
        name=EXCLUDED.name, 
        description=EXCLUDED.description
    `, [id, name, description, start_date, end_date, location, region, url, JSON.stringify(sources)]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

router.post("/materials", async (req, res) => {
  const db = getDb();
  const { id, name, unit, current_price, currency, ai_commentary, trend_percentage, source_url } = req.body;
  
  try {
    // Insert/update material
    await db.query(`
      INSERT INTO materials (id, name, unit, current_price, currency, ai_commentary, trend_percentage, source_url, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET 
        current_price=EXCLUDED.current_price,
        ai_commentary=EXCLUDED.ai_commentary,
        trend_percentage=EXCLUDED.trend_percentage,
        source_url=EXCLUDED.source_url,
        updated_at=CURRENT_TIMESTAMP
    `, [id, name, unit, current_price, currency, ai_commentary, trend_percentage, source_url]);
    
    // Record price history
    await db.query(`
      INSERT INTO material_prices (id, material_id, price)
      VALUES ($1, $2, $3)
    `, [Math.random().toString(36).substring(7), id, current_price]);
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

router.delete("/articles/:id", async (req, res) => {
  const db = getDb();
  try {
    await db.query("DELETE FROM articles WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete article" });
  }
});

router.get("/articles", async (req, res) => {
  const { type, region, date } = req.query;
  const db = getDb();
  let query = "SELECT * FROM articles WHERE 1=1";
  const params: any[] = [];
  
  let paramIndex = 1;
  if (type) {
    const types = (Array.isArray(type) ? type : String(type || '').split(','))
      .map(t => String(t).trim())
      .filter(Boolean);
    if (types.length > 0) {
      const placeholders = types.map((_, i) => `$${paramIndex + i}`).join(',');
      query += ` AND type IN (${placeholders})`;
      params.push(...types);
      paramIndex += types.length;
    }
  }
  if (region && region !== 'All') {
    query += ` AND region = $${paramIndex++}`;
    params.push(String(region));
  }

  if (date === 'today') {
    query += ` AND published_at::date = CURRENT_DATE`;
  } else if (date) {
    query += ` AND published_at::date = $${paramIndex++}`;
    params.push(String(date));
  }

  query += " ORDER BY published_at DESC LIMIT 50";
  
  try {
    const result = await db.query(query, params);
    res.json(result.rows.map((r: any) => {
      let parsedSources = [];
      try {
        parsedSources = r.sources ? (typeof r.sources === 'string' ? JSON.parse(r.sources) : r.sources) : [];
      } catch (e) {
        console.error(`Failed to parse sources for article ${r.id}:`, e);
      }
      
      return {
        ...r,
        sources: Array.isArray(parsedSources) ? parsedSources : []
      };
    }));
  } catch (err) {
    console.error("Database error in GET /articles:", err);
    res.status(500).json({ error: "Database error" });
  }
});

router.get("/articles/:id", async (req, res) => {
  const db = getDb();
  const id = req.params.id;
  try {
    let result = await db.query("SELECT * FROM articles WHERE id = $1", [id]);
    
    // Fallback: If not found by ID, try searching by title (for AI-generated links using titles)
    if (result.rows.length === 0) {
      result = await db.query("SELECT * FROM articles WHERE title ILIKE $1 OR title = $2", [`%${id}%`, id]);
    }

    const article = result.rows[0];
    if (!article) return res.status(404).json({ error: "Not found" });
    res.json({
      ...article,
      sources: article.sources ? JSON.parse(article.sources) : []
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

router.get("/events", async (req, res) => {
  const { region } = req.query;
  const db = getDb();
  let query = "SELECT * FROM events WHERE 1=1";
  const params: any[] = [];
  
  if (region && region !== 'All') {
    query += " AND region = $1";
    params.push(region);
  }
  query += " ORDER BY start_date ASC LIMIT 50";
  
  try {
    const result = await db.query(query, params);
    res.json(result.rows.map((r: any) => ({
      ...r,
      sources: r.sources ? JSON.parse(r.sources) : []
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

router.get("/materials", async (req, res) => {
  const db = getDb();
  try {
    const result = await db.query("SELECT * FROM materials");
    const materials = result.rows;
    
    // Get historical prices for sparklines
    const materialsWithHistory = await Promise.all(materials.map(async (m: any) => {
      const historyResult = await db.query("SELECT price, timestamp FROM material_prices WHERE material_id = $1 ORDER BY timestamp ASC LIMIT 30", [m.id]);
      return { ...m, history: historyResult.rows };
    }));
    
    res.json(materialsWithHistory);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

router.get("/directory", async (req, res) => {
  const { region, type } = req.query;
  const db = getDb();
  let query = "SELECT * FROM directory_entries WHERE 1=1";
  const params: any[] = [];
  
  let paramIndex = 1;
  if (region && region !== 'All') {
    query += ` AND region = $${paramIndex++}`;
    params.push(region);
  }
  if (type && type !== 'All') {
    query += ` AND type = $${paramIndex++}`;
    params.push(type);
  }
  
  try {
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

router.get("/logs", async (req, res) => {
  const db = getDb();
  try {
    const result = await db.query("SELECT * FROM ai_logs ORDER BY timestamp DESC LIMIT 100");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// --- Search Config CRUD ---

router.get("/search-configs", async (req, res) => {
  const db = getDb();
  try {
    const result = await db.query(
      "SELECT * FROM search_configs ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END, category, region"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

router.post("/search-configs", async (req, res) => {
  const db = getDb();
  const { query, language, category, region, priority } = req.body;
  if (!query || !category) return res.status(400).json({ error: "Query and category are required" });

  const priorityIntervals: Record<string, number> = { high: 30, medium: 60, low: 240, weekly: 10080 };
  const intervalMinutes = priorityIntervals[priority || 'medium'] || 60;
  const id = Math.random().toString(36).substring(2, 10);

  try {
    await db.query(
      `INSERT INTO search_configs (id, query, language, category, region, priority, interval_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, query, language || 'en', category, region || 'World', priority || 'medium', intervalMinutes]
    );
    res.json({ success: true, id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

router.put("/search-configs/:id", async (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { query, language, category, region, priority } = req.body;

  const priorityIntervals: Record<string, number> = { high: 30, medium: 60, low: 240, weekly: 10080 };
  const intervalMinutes = priorityIntervals[priority || 'medium'] || 60;

  try {
    await db.query(
      `UPDATE search_configs
       SET query = $1, language = $2, category = $3, region = $4, priority = $5, interval_minutes = $6
       WHERE id = $7`,
      [query, language || 'en', category, region || 'World', priority || 'medium', intervalMinutes, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

router.delete("/search-configs/:id", async (req, res) => {
  const db = getDb();
  try {
    await db.query("DELETE FROM search_configs WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

router.patch("/search-configs/:id/toggle", async (req, res) => {
  const db = getDb();
  try {
    await db.query("UPDATE search_configs SET enabled = NOT enabled WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

router.post("/search-configs/:id/run", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await runSingleSearchConfig(id);
    res.json(result);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to run search config" });
  }
});

// --- Source Scores ---

router.get("/source-scores", async (req, res) => {
  const db = getDb();
  try {
    const result = await db.query("SELECT * FROM source_scores ORDER BY score DESC LIMIT 100");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

router.get("/prospects", async (req, res) => {
  const db = getDb();
  try {
    const result = await db.query(`
      SELECT p.*, a.title as opportunity_title, a.summary as opportunity_summary, a.region as opportunity_region
      FROM prospects p
      LEFT JOIN articles a ON p.opportunity_id = a.id
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

router.patch("/prospects/:id", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const db = getDb();
    try {
        await db.query("UPDATE prospects SET status = $1 WHERE id = $2", [status, id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
});

router.get("/materials/catalog", async (req, res) => {
  const db = getDb();
  try {
    const trackedResult = await db.query("SELECT id FROM materials");
    const trackedIds = new Set(trackedResult.rows.map((r: any) => r.id));

    const catalog = [
      { id: "copper-lme", name: "Cuivre Grade A (LME)", unit: "USD/tonne métrique", category: "Métaux de base", source_url: "https://www.lme.com/en/metals/non-ferrous/lme-copper", reason: "Composant principal des enroulements de transformateurs. Représente 30-40% du coût matière." },
      { id: "aluminium-lme", name: "Aluminium (LME)", unit: "USD/tonne métrique", category: "Métaux de base", source_url: "https://www.lme.com/en/metals/non-ferrous/lme-aluminium", reason: "Alternative au cuivre pour les enroulements basse tension et les conducteurs." },
      { id: "crgo-steel", name: "Acier CRGO (Grain Orienté)", unit: "USD/tonne métrique", category: "Aciers spéciaux", source_url: "https://www.mysteel.net/market-insight/silicon-steel/", reason: "Acier silicium à grains orientés pour les noyaux magnétiques. Critique pour l'efficacité." },
      { id: "crngo-steel", name: "Acier CRNGO (Non Orienté)", unit: "USD/tonne métrique", category: "Aciers spéciaux", source_url: "https://www.argusmedia.com/en/metals/argus-steel", reason: "Acier silicium pour les moteurs et transformateurs de distribution." },
      { id: "transformer-oil", name: "Huile Minérale Transformateur", unit: "USD/bbl", category: "Fluides isolants", source_url: "https://www.nynas.com/transformer-oils/", reason: "Fluide diélectrique naphténique pour isolation et refroidissement des transformateurs." },
      { id: "ester-oil", name: "Ester Naturel (FR3)", unit: "USD/bbl", category: "Fluides isolants", source_url: "https://www.cargill.com/bioindustrial/fr3-fluid", reason: "Fluide biodégradable à point de feu élevé. Tendance croissante pour les transformateurs verts." },
      { id: "kraft-paper", name: "Papier Kraft Isolant", unit: "USD/tonne métrique", category: "Isolants solides", source_url: "https://www.weidmann-electrical.com/insulation/", reason: "Isolation inter-couches des enroulements haute tension." },
      { id: "epoxy-resin", name: "Résine Époxy (Bisphenol A)", unit: "USD/kg", category: "Isolants solides", source_url: "https://www.icis.com/explore/commodities/chemicals/epoxy-resins/", reason: "Utilisée pour les transformateurs secs (enrobés). Sensible au prix du pétrole." },
      { id: "tin-lme", name: "Étain (LME)", unit: "USD/tonne métrique", category: "Métaux de base", source_url: "https://www.lme.com/en/metals/non-ferrous/lme-tin", reason: "Composant des soudures et des connexions électriques de haute qualité." },
      { id: "silver-spot", name: "Argent (Spot)", unit: "USD/oz", category: "Métaux précieux", source_url: "https://www.kitco.com/silver-price-today-usa/", reason: "Utilisé dans les contacts électriques de haute performance et les brasures." },
      { id: "crude-oil-brent", name: "Pétrole Brut Brent", unit: "USD/bbl", category: "Énergie", source_url: "https://www.tradingeconomics.com/commodity/brent-crude-oil", reason: "Détermine le coût de transport et impacte les prix des dérivés pétrochimiques (résines, huiles)." },
      { id: "pressboard", name: "Presspan / Carton Pressé", unit: "USD/tonne métrique", category: "Isolants solides", source_url: "https://www.weidmann-electrical.com/insulation/transformerboard/", reason: "Isolation structurelle entre enroulements et noyaux. Haute tenue mécanique et diélectrique." },
    ];

    const enriched = catalog.map(item => ({
      ...item,
      is_tracked: trackedIds.has(item.id)
    }));

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

router.post("/materials/pin", async (req, res) => {
  const { id, name, unit, source_url } = req.body;
  const db = getDb();
  try {
    await db.query(`
      INSERT INTO materials (id, name, unit, current_price, currency, trend_percentage, ai_commentary, source_url)
      VALUES ($1, $2, $3, 0, 'USD', 0, '', $4)
      ON CONFLICT (id) DO NOTHING
    `, [id, name, unit, source_url]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

router.post("/materials/:id/analyze", async (req, res) => {
  const { id } = req.params;
  const db = getDb();
  
  try {
    const matResult = await db.query("SELECT * FROM materials WHERE id = $1", [id]);
    const mat = matResult.rows[0];
    if (!mat) return res.status(404).json({ error: "Material not found" });

    const historyResult = await db.query(
      "SELECT price, timestamp FROM material_prices WHERE material_id = $1 ORDER BY timestamp ASC LIMIT 50", 
      [id]
    );
    const history = historyResult.rows;

    // Search for recent market news/forecasts
    const searchResults = await searchIndustryInfo(`${mat.name} price forecast market analysis 2026`);
    
    if (searchResults.length === 0) {
      return res.status(400).json({ 
        error: "Aucun résultat de recherche trouvé pour l'analyse. Analyse IA annulée pour économiser le quota." 
      });
    }


    const prompt = `
      Tu es l'analyste stratégique en chef de **Tunisie Transformateurs**.
      Analyse approfondie pour : **${mat.name}** (${mat.unit}).
      
      **Données Historiques Internes :**
      ${JSON.stringify(history)}
      
      **Actualités du Marché (Web) :**
      ${JSON.stringify(searchResults)}
      
      **Ta Tâche :**
      1. Analyse la tendance technique (histoire) et fondamentale (news).
      2. Prédis la direction du prix pour les 30 prochains jours.
      3. Fournis une explication détaillée et précise.
      4. Indique un score de confiance (0-100%).
      
      Réponds AU FORMAT JSON uniquement :
      {
        "prediction_direction": "up" | "down" | "stable",
        "confidence": number,
        "expected_change_pct": number,
        "analysis": "Explication détaillée de la prévision en français (max 250 caractères). Cite les facteurs clés."
      }
    `;

    const messages = [
      { role: 'system' as const, content: 'Tu es un expert en marchés de matières premières industrielles. Réponds en JSON pur.' },
      { role: 'user' as const, content: prompt }
    ];

    const openRouterResponse = await chatWithOpenRouter(messages);
    const analysis = JSON.parse(openRouterResponse);
    
    // Update the DB with the deep analysis
    await db.query(`
      UPDATE materials 
      SET ai_commentary = $1,
          trend_percentage = $2
      WHERE id = $3
    `, [analysis.analysis, analysis.expected_change_pct, id]);

    res.json({ success: true, analysis });
  } catch (err: any) {
    console.error("Deep analysis error:", err);
    res.status(500).json({ error: err.message || "Failed to perform deep analysis" });
  }
});

router.delete("/materials/:id", async (req, res) => {
  const db = getDb();
  try {
    await db.query("DELETE FROM materials WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

router.post("/chat", async (req, res) => {
  const { message, history, articleId, model } = req.body;
  const db = getDb();
  console.log(`[Chat] Message received. Model: "${model || 'DEFAULT'}", Context: ${articleId || 'None'}`);

  try {
    // Gather platform context for the AI
    let articlesRes, materialsRes, opportunitiesRes, prospectsRes;
    try {
      [articlesRes, materialsRes, opportunitiesRes, prospectsRes] = await Promise.all([
        db.query("SELECT id, title, summary, region, type FROM articles ORDER BY published_at DESC LIMIT 10"),
        db.query("SELECT name, current_price, currency, unit, trend_percentage, ai_commentary FROM materials LIMIT 10"),
        db.query("SELECT id, title, summary, region FROM articles WHERE type = 'opportunities' ORDER BY published_at DESC LIMIT 5"),
        db.query("SELECT company_name, pitch, status FROM prospects ORDER BY created_at DESC LIMIT 5").catch(e => {
          console.warn("[Chat] Prospects query failed (table might not exist yet):", e.message);
          return { rows: [] };
        })
      ]);
    } catch (dbErr: any) {
      console.error("[Chat] Database context gathering failed:", dbErr.message);
      return res.status(500).json({ error: "Erreur de base de données contextuelle: " + dbErr.message });
    }

    let verificationContext = "";

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Extract articleId from message if a Transcope URL is pasted
    const urlMatch = message.match(/\/article\/([a-z0-9]+)/i);
    const effectiveArticleId = articleId || (urlMatch ? urlMatch[1] : null);

    // Case 1: Specific article verification
    if (effectiveArticleId) {
      try {
        const artRes = await db.query("SELECT * FROM articles WHERE id = $1", [effectiveArticleId]);
        if (artRes.rows.length > 0) {
          const art = artRes.rows[0];
          console.log(`[Chat] Verifying article context: ${art.title}`);
          const searchResults = await searchIndustryInfo(`"${art.title}" 2026 verification`);
          
          verificationContext = `
**CONTEXTE DE L'ARTICLE :**
L'utilisateur consulte actuellement cet article :
Titre : ${art.title}
Résumé : ${art.summary}

**RÉSULTATS DE RECHERCHE WEB EN TEMPS RÉEL :**
${searchResults.map((r: any) => `- ${r.title}: ${r.content} (${r.url})`).join('\n')}

**INSTRUCTIONS :**
L'utilisateur te demande des informations sur cet article précis. Utilise les résultats de recherche web ci-dessus pour confirmer, infirmer ou compléter les informations de la plateforme. Sois honnête si les informations divergent.
`;
        }
      } catch (e: any) {
        console.warn("[Chat] Article verification failed:", e.message);
      }
    } 

    // Case 2: General web search request
    if (!verificationContext && message.toLowerCase().match(/(recherche|cherche|search|searsh|serch|trouve|web|internet|actualité|nouvelles)/)) {
      try {
        console.log(`[Chat] General search triggered for: ${message}`);
        const searchResults = await searchIndustryInfo(message);
        verificationContext = `
**RÉSULTATS DE RECHERCHE WEB EN DIRECT :**
${searchResults.map((r: any) => `- ${r.title}: ${r.content} (${r.url})`).join('\n')}

**INSTRUCTIONS :**
Réponds en utilisant ces résultats récents du web pour fournir l'information la plus à jour possible. Cite tes sources.
`;
      } catch (e: any) {
        console.warn("[Chat] Web search failed:", e.message);
      }
    }

    const context = `
Tu es l'assistant IA de **Transcope**, la plateforme de veille stratégique de **Tunisie Transformateurs**.
Tu as un accès en temps réel au web via SearXNG pour répondre aux questions d'actualité ou vérifier des données.

${verificationContext}

**Données disponibles sur la plateforme en ce moment :**

Dernières actualités :
${articlesRes.rows.map((a: any) => `- [${a.type}] [${a.title}](/article/${a.id}) (${a.region})`).join('\n')}

Matières premières suivies (incluant les analyses profondes) :
${materialsRes.rows.map((m: any) => `- ${m.name}: ${m.current_price} ${m.currency}/${m.unit} (tendance: ${m.trend_percentage}%, Analyse: ${m.ai_commentary || 'Pas encore d\'analyse profonde'})`).join('\n')}

Dernières opportunités :
${opportunitiesRes.rows.map((o: any) => `- [${o.title}](/article/${o.id}) (${o.region})`).join('\n')}

Derniers prospects :
${prospectsRes.rows.map((p: any) => `- ${p.company_name} [${p.status}]: ${p.pitch?.substring(0, 80)}`).join('\n')}

**RÈGLE CRUCIALE DE LIENS :**
Chaque fois que tu cites une opportunité ou un article présent sur la plateforme, tu DOIS créer un lien Markdown vers sa page.
Format : [Titre de l'article](/article/id)
Exemple : "Voici l'appel d'offres [NamPower](/article/z3shf8) en Namibie."

**Règles générales :**
- Réponds toujours en français.
- Sois concis, direct et utile.
- Quand tu cites des données de la plateforme, sois précis.
- Si on te demande quelque chose hors de ton domaine, redirige vers les fonctionnalités de Transcope.
`;

    // Format history for OpenRouter
    const messages = [
      { role: 'system' as const, content: context },
      ...(history || []).map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'assistant' as 'user' | 'assistant' | 'system',
        content: msg.content
      })),
      { role: 'user' as const, content: message }
    ];

    try {
      const reply = await chatWithOpenRouter(messages, model || "openai/gpt-oss-120b:free");
      res.json({ reply });
    } catch (aiErr: any) {
      console.warn("[Chat] OpenRouter failed, attempting Gemini fallback. Error:", aiErr.message);
      
      try {
        // Fallback to a reliable Gemini model
        const fallbackReply = await chatWithGemini(messages, "gemini-1.5-flash");
        res.json({ reply: fallbackReply + "\n\n*(Note: Réponse générée via Gemini suite à une indisponibilité temporaire du modèle principal)*" });
      } catch (geminiErr: any) {
        console.error("[Chat] All AI providers failed:", geminiErr.message);
        res.status(500).json({ error: "Tous les services d'IA sont actuellement indisponibles. Veuillez réessayer plus tard." });
      }
    }
  } catch (err: any) {
    console.error("Chat fatal error:", err.message);
    if (err.stack) console.error(err.stack);
    res.status(500).json({ error: "Erreur critique du chatbot: " + (err.message || "Inconnue") });
  }
});

export default router;
