import axios from 'axios';
import { SchemaType } from "@google/generative-ai";
import { getDb, logAiAction, updateSourceScore } from './db.ts';
import { withGeminiRetry } from './gemini-client.ts';
import { chatWithOpenRouter } from './openrouter-client.ts';

const SEARXNG_URL = process.env.SEARXNG_URL || 'http://localhost:8082';

// Reliable image URLs per category using Unsplash source
const CATEGORY_IMAGES: Record<string, string[]> = {
  transformers: [
    'https://images.unsplash.com/photo-1558449028-b53a39d100fc?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1548337138-e87d889cc369?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1516774485771-3b83d9441197?w=800&h=600&fit=crop',
  ],
  rawMaterials: [
    'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1567789884554-0b844b597180?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1515516089376-88db1e26e9c0?w=800&h=600&fit=crop',
  ],
  photovoltaic: [
    'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1497440001374-f26997328c1b?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1542336391-ae2936d8ef46?w=800&h=600&fit=crop',
  ],
  opportunities: [
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1507537297725-24a1c029d3ca?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1554469384-e58fac16e23a?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800&h=600&fit=crop',
  ],
  tenders: [
    'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1573163231162-717dfc4e0463?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&h=600&fit=crop',
  ],
  events: [
    'https://images.unsplash.com/photo-1540575861501-7ad05823c23d?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1475721027785-f74dea9f2672?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&h=600&fit=crop',
  ],
  directory: [
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&h=600&fit=crop',
  ],
  report: [
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop',
  ],
};

function decodeHtmlEntities(text: string): string {
  if (!text) return "";
  return text
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    .replace(/&[a-z]+;/gi, (match) => {
      const entities: Record<string, string> = {
        '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'",
        '&eacute;': 'é', '&Eacute;': 'É', '&egrave;': 'è', '&Egrave;': 'È', '&agrave;': 'à', '&Agrave;': 'À', 
        '&acirc;': 'â', '&Acirc;': 'Â', '&icirc;': 'î', '&Icirc;': 'Î', '&ocirc;': 'ô', '&Ocirc;': 'Ô', 
        '&ucirc;': 'û', '&Ucirc;': 'Û', '&ccedil;': 'ç', '&Ccedil;': 'Ç', '&euml;': 'ë', '&iuml;': 'ï'
      };
      const key = match.toLowerCase() === match ? match : match; 
      return entities[match] || entities[match.toLowerCase()] || match;
    });
}

function getCategoryImage(category: string, seed: string): string {
  const images = CATEGORY_IMAGES[category] || CATEGORY_IMAGES.transformers;
  // Use seed to pick a consistent image for each article
  const index = Math.abs(seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % images.length;
  return images[index];
}

// --- Search Strategy Configuration (Database-Driven) ---

interface SearchQuery {
  id: string;
  query: string;
  language: string;
  category: string;
  region: string;
  priority: string;
  interval_minutes: number;
}

async function buildSearchQueriesFromDb(): Promise<SearchQuery[]> {
  const db = getDb();
  const result = await db.query(
    `SELECT * FROM search_configs 
     WHERE enabled = true 
     AND (
       last_run_at IS NULL 
       OR next_run_at <= CURRENT_TIMESTAMP
     )
     ORDER BY 
       CASE priority 
         WHEN 'high' THEN 1 
         WHEN 'medium' THEN 2 
         WHEN 'low' THEN 3 
         WHEN 'weekly' THEN 4
       END,
       last_run_at ASC NULLS FIRST`
  );
  return result.rows;
}

async function markQueryAsRun(queryId: string, intervalMinutes: number) {
  const db = getDb();
  await db.query(
    `UPDATE search_configs
     SET last_run_at = CURRENT_TIMESTAMP,
         next_run_at = CURRENT_TIMESTAMP + ($1 || ' minutes')::INTERVAL
     WHERE id = $2`,
    [intervalMinutes, queryId]
  );
}

// --- Search Engine ---
export async function isSearXNGAvailable(): Promise<boolean> {
  try {
    const response = await axios.get(`${SEARXNG_URL}/status`, { timeout: 5000 });
    return response.status === 200;
  } catch (error) {
    try {
      // Fallback check if /status is not available
      const response = await axios.get(`${SEARXNG_URL}/search?q=test&format=json`, { timeout: 5000 });
      return !!response.data;
    } catch (e) {
      return false;
    }
  }
}

interface SearchResult {
  title: string;
  url: string;
  content: string;
}

export async function searchIndustryInfo(query: string, language?: string, maxRetries = 3): Promise<SearchResult[]> {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      if (attempt > 0) {
        console.log(`[Search] Retrying (${attempt}/${maxRetries}): ${query}`);
        await new Promise(resolve => setTimeout(resolve, 3000 * attempt)); // Increased backoff
      } else {
        await logAiAction('Search', `Searching for: ${query}`, { language });
      }

      const response = await axios.get(`${SEARXNG_URL}/search`, {
        params: {
          q: query,
          format: 'json',
          engines: 'google,bing,duckduckgo',
          language: language || 'all',
        },
        timeout: 60000, // Increased to 60 second timeout
      });

      if (!response.data || !response.data.results) {
        throw new Error("Invalid response from SearXNG");
      }

      return response.data.results.map((r: any) => ({
        title: r.title,
        url: r.url,
        content: r.content || r.snippet || '',
      })).slice(0, 10);

    } catch (error: any) {
      attempt++;
      // Handle axios timeout specifically (code ECONNABORTED) and other network errors
      const isTimeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.message?.includes('timeout');
      const isRetryable = isTimeout || error.code === 'ECONNRESET' || error.message?.includes('socket hang up') || (error.response?.status >= 500);
      
      if (!isRetryable || attempt >= maxRetries) {
        console.error('SearXNG search error:', error.message);
        await logAiAction('Search Error', `Failed search: ${query}`, { error: String(error) });
        return [];
      }
      
      console.warn(`[Search] Attempt ${attempt} failed for "${query}": ${error.message}. Retrying...`);
    }
  }
  return [];
}

// --- AI Synthesis ---

const categoryLabels: Record<string, string> = {
  transformers: "Transformateurs & Énergie",
  opportunities: "Opportunités d'Affaires",
  tenders: "Appels d'Offres (Transformateurs)",
  rawMaterials: "Matières Premières",
  photovoltaic: "Photovoltaïque & Renouvelables",
  events: "Salons & Événements Industriels",
  directory: "Annuaire des Entreprises",
  report: "Rapports d'Analyse"
};

export async function synthesizeArticlesFromResults(
  region: string,
  category: string,
  results: SearchResult[],
  existingTitles: string[] = []
) {
  // Use specialized synthesis for tenders to ensure strict validation
  if (category === 'tenders') {
    return synthesizeTendersFromResults(region, results, existingTitles);
  }

  const focus = categoryLabels[category] || category;
  const prompt = `
Vous êtes un analyste stratégique senior pour **Tunisie Transformateurs**.

Votre tâche : Synthétiser 1-3 articles d'intelligence économique à partir des résultats de recherche.

**Sujet**: ${focus}
**Zone géographique**: ${region} (priorité absolue à la Tunisie et l'Afrique)

**OBJECTIF STRATÉGIQUE**: Identifiez les opportunités de marché, les appels d'offres à venir, les projets d'infrastructure d'envergure (STEG, SONELGAZ, etc.) et les mouvements de la concurrence (ex: SACEM) qui pourraient impacter **Tunisie Transformateurs**.

**Règles de rédaction**:
1. **Langue**: Français uniquement.
2. **Structure**: Utilisez des titres Markdown (##) et des paragraphes clairs. Laissez deux sauts de ligne entre chaque section.
3. **STYLE**: Ne mettez pas de paragraphes entiers en gras.
4. **PAS DE DOUBLONS**: Ne générez pas de doublons de ces titres : ${existingTitles.join(', ')}.

Résultats de recherche:
${JSON.stringify(results)}
  `;

  const schema: any = {
    description: "Liste d'articles synthétisés",
    type: SchemaType.ARRAY,
    items: {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING },
        summary: { type: SchemaType.STRING },
        body: { type: SchemaType.STRING },
        sources: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        published_at: { type: SchemaType.STRING },
        article_type: { 
          type: SchemaType.STRING, 
          enum: ["news", "opportunities", "report"] 
        },
      },
      required: ["title", "summary", "body", "sources", "article_type"]
    }
  };

  try {
    const result = await generateWithFallback(prompt, schema, "synthesis");
    const articles = JSON.parse(result.response.text());
    return articles;
  } catch (err: any) {
    console.error("[Synthesis Error]", err.message);
    throw err;
  }
}

/**
 * Specialized synthesis for Tenders (Appels d'Offres)
 * Deep intelligence extraction with strict transformer-only filtering.
 */
export async function synthesizeTendersFromResults(
  region: string,
  results: SearchResult[],
  existingTitles: string[] = []
) {
  const prompt = `
Tu es un expert senior en marchés publics et veille stratégique pour **Tunisie Transformateurs**, un fabricant spécialisé en transformateurs électriques de puissance et de distribution.

**TA MISSION** : Analyser les résultats de recherche et extraire les appels d'offres RÉELS pour la fourniture de transformateurs électriques. Pour chaque appel d'offre identifié, tu dois fournir une fiche d'intelligence complète.

**PRODUITS CIBLES (INCLURE):**
- Transformateurs de puissance (HT/MT, > 1 MVA)
- Transformateurs de distribution (MT/BT, jusqu'à 2500 kVA)
- Transformateurs de mesure / instrument (TC, TT, TP)
- Lots incluant la fourniture de transformateurs comme composant principal

**EXCLURE STRICTEMENT :**
- Accessoires seuls (traversées, huile, bornes, ventilateurs, protections, relais)
- Câbles, disjoncteurs, compteurs, panneaux solaires, onduleurs, groupes électrogènes
- Articles de presse, rapports, études de marché (ce ne sont PAS des appels d'offres)
- "Transformation" au sens figuré (digitale, organisationnelle, etc.)
- Résultats sans portail de soumission vérifiable

**INTELLIGENCE À EXTRAIRE PAR TENDER :**
- **Titre** : Titre officiel de l'appel d'offre, traduit en français
- **Organisme émetteur** : Nom exact de l'entité (STEG, SONELGAZ, Senelec, AfDB, Banque Mondiale, etc.)
- **Date limite** : Date limite de soumission si disponible (format YYYY-MM-DD), sinon "Non précisée"
- **Valeur estimée** : Montant estimé du marché si mentionné, sinon "Non communiquée"
- **Type de transformateur** : "puissance", "distribution", "mesure" ou "mixte"
- **Résumé** : 2-3 phrases incluant : qui achète, quoi exactement, où, quand
- **Corps détaillé** : Spécifications techniques extraites (puissance en kVA/MVA, tension, quantité, lieu de livraison, conditions)
- **Score de pertinence** : 1 à 5 (5 = parfaitement adapté à Tunisie Transformateurs)
  - 5: Transformateur de distribution/puissance, Afrique/Tunisie, volume important
  - 4: Transformateur dans zone cible, spécifications compatibles
  - 3: Transformateur mondial, spécifications standards
  - 2: Lot mixte incluant des transformateurs
  - 1: Mention de transformateur mais pertinence faible

**VALIDATION DU LIEN SOURCE :**
Le lien DOIT pointer vers un portail de marchés publics ou une page officielle.
Acceptés : TUNEPS, dgMarket, UNGM, AfDB, Banque Mondiale, TED Europa, portails gouvernementaux, sites utilities.
Refusés : blogs, journaux, Wikipedia, forums, LinkedIn.

**LANGUE** : Ignore les résultats exclusivement en espagnol sauf portails multilingues.
**ZÉRO HALLUCINATION** : Aucun résultat valide → retourne [].
**DOUBLONS** : Ne génère pas de titres similaires à : ${existingTitles.join(' | ')}

**Zone géographique prioritaire**: ${region} (Tunisie > Afrique > Monde).
**Langue de sortie**: Français.

Résultats de recherche à analyser :
${JSON.stringify(results)}
  `;

  const schema: any = {
    type: SchemaType.ARRAY,
    items: {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING, description: "Titre officiel en français" },
        issuing_organization: { type: SchemaType.STRING, description: "Organisme émetteur" },
        deadline: { type: SchemaType.STRING, description: "Date limite (YYYY-MM-DD ou Non précisée)" },
        estimated_value: { type: SchemaType.STRING, description: "Valeur estimée ou Non communiquée" },
        transformer_type: { type: SchemaType.STRING, description: "puissance, distribution, mesure, ou mixte" },
        relevance_score: { type: SchemaType.NUMBER, description: "Score 1-5" },
        summary: { type: SchemaType.STRING, description: "Résumé : qui, quoi, où, quand" },
        body: { type: SchemaType.STRING, description: "Détails techniques complets" },
        sources: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "URLs officielles" },
        region: { type: SchemaType.STRING, enum: ["Tunisia", "Africa", "World"] }
      },
      required: ["title", "issuing_organization", "deadline", "transformer_type", "relevance_score", "summary", "body", "sources", "region"]
    }
  };

  try {
    const result = await generateWithFallback(prompt, schema, "tenders-synthesis");
    const tenders = JSON.parse(result.response.text());
    
    // Post-synthesis intelligence filtering
    return tenders
      .filter((t: any) => {
        if (!t.sources || t.sources.length === 0) return false;
        if (!t.sources.some((s: string) => s.startsWith('http'))) return false;
        if (t.relevance_score < 2) return false;
        
        // Content-based dedup: reject if title words overlap >70% with existing
        const titleWords = new Set(t.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3));
        const isDuplicate = existingTitles.some(existing => {
          const existingWords = existing.toLowerCase().split(/\s+/).filter(w => w.length > 3);
          if (existingWords.length === 0) return false;
          const overlap = existingWords.filter(w => titleWords.has(w)).length;
          return overlap / existingWords.length > 0.7;
        });
        return !isDuplicate;
      })
      .sort((a: any, b: any) => b.relevance_score - a.relevance_score);
  } catch (err: any) {
    console.error("[Tenders Synthesis Error]", err.message);
    return [];
  }
}

/**
 * Reusable helper for Gemini generation with fallback and rate-limit awareness.
 */
async function generateWithFallback(
  prompt: string,
  schema: any,
  contextName: string
) {
  const models = ["gemini-3-flash-preview", "gemini-2.5-flash", "gemini-2.0-flash"];
  let lastError: any;

  for (let i = 0; i < models.length; i++) {
    try {
      return await withGeminiRetry(models[i], async (genAI) => {
        const model = genAI.getGenerativeModel({ model: models[i] });
        return await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: schema,
          },
        });
      });
    } catch (e: any) {
      lastError = e;
      const errorStr = JSON.stringify(e);
      const isQuota = e.status === 429 || e.message?.includes("429") || e.message?.includes("quota") || errorStr.includes("quota");

      if (i < models.length - 1) {
        const reason = isQuota ? 'quota exhausted' : `failed (${e.message})`;
        console.warn(`[${contextName}] ${models[i]} ${reason}, falling back to ${models[i + 1]}`);
        continue;
      }
      console.warn(`[${contextName}] All Gemini models exhausted. Last error: ${e.message}`);
    }
  }

  // Final fallback: OpenRouter
  try {
    console.log(`[${contextName}] Attempting OpenRouter fallback...`);
    const messages = [
      { role: 'system' as const, content: 'Tu es un analyste stratégique expert. Réponds toujours au format JSON valide selon le schéma demandé. Utilisez l\'encodage UTF-8 pur et conservez scrupuleusement tous les accents français (é, è, à, ç, etc.). Ne retourne RIEN d\'autre que du JSON pur.' },
      { role: 'user' as const, content: prompt }
    ];

    const result = await chatWithOpenRouter(messages, "openai/gpt-oss-120b:free");
    
    if (result) {
      console.log(`[${contextName}] OpenRouter fallback succeeded.`);
      return {
        response: {
          text: () => result
        }
      };
    }
  } catch (openRouterErr: any) {
    console.error(`[${contextName}] OpenRouter fallback also failed:`, openRouterErr.message);
  }

  throw lastError;
}

export async function synthesizeEventsFromResults(region: string, results: SearchResult[]) {
  const prompt = `Extraire les événements de l'industrie (conférences, salons, webinaires, appels d'offres avec dates limites) pour la région ${region} à partir de : ${JSON.stringify(results)}. Langue: Français.`;
  
  const schema: any = {
    type: SchemaType.ARRAY,
    items: {
      type: SchemaType.OBJECT,
      properties: {
        name: { type: SchemaType.STRING },
        description: { type: SchemaType.STRING },
        start_date: { type: SchemaType.STRING },
        end_date: { type: SchemaType.STRING },
        location: { type: SchemaType.STRING },
        url: { type: SchemaType.STRING },
        sources: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
      },
      required: ["name", "description", "start_date", "end_date", "location"]
    }
  };

  try {
    const result = await generateWithFallback(prompt, schema, "events");
    return JSON.parse(result.response.text());
  } catch (err: any) {
    await logAiAction('Events Error', `Failed for ${region}`, { error: err.message });
    throw err;
  }
}

export async function synthesizeDirectoryFromResults(region: string, results: SearchResult[]) {
  const prompt = `Identifier les entreprises (fabricants, consultants, EPC) et grands projets dans l'industrie électrique pour ${region} à partir de : ${JSON.stringify(results)}. Langue: Français.`;
  
  const schema: any = {
    type: SchemaType.ARRAY,
    items: {
      type: SchemaType.OBJECT,
      properties: {
        name: { type: SchemaType.STRING },
        type: { type: SchemaType.STRING },
        country: { type: SchemaType.STRING },
        description: { type: SchemaType.STRING },
        website: { type: SchemaType.STRING }
      },
      required: ["name", "type", "description"]
    }
  };

  try {
    const result = await generateWithFallback(prompt, schema, "directory");
    return JSON.parse(result.response.text());
  } catch (err: any) {
    await logAiAction('Directory Error', `Failed for ${region}`, { error: err.message });
    throw err;
  }
}


/**
 * Shared helper to save an article and its associated prospects/source scores.
 * Follows DRY principle (Rule 1).
 */
async function saveArticleAndProspects(db: any, article: any, group: { category: string; region: string }, existingTitles: string[]) {
  if (existingTitles.includes(article.title.toLowerCase())) return null;

  // Logic: Always respect AI's 'opportunities' tag, or force it if the search config itself is for opportunities.
  // Otherwise, default to 'news' (Actualités).
  let articleType = article.article_type || 'news';
  
  if (group.category === 'opportunities') {
    articleType = 'opportunities';
  } else if (group.category === 'tenders') {
    articleType = 'tenders';
  } else if (group.category === 'report') {
    articleType = 'report';
  }

  // Ensure automated synthesis articles appear at the top of the feed.
  // We use the current date unless the AI provided a very recent specific date.
  let publishedAt = new Date(); 
  const aiDate = article.published_at ? new Date(article.published_at) : null;
  
  // If AI provided a valid date within the last 48 hours, use it to maintain precision.
  // Otherwise, use 'now' so the intelligence is visible in 'Recent' tabs.
  if (aiDate && !isNaN(aiDate.getTime())) {
    const fortyEightHoursAgo = new Date().getTime() - (48 * 60 * 60 * 1000);
    if (aiDate.getTime() > fortyEightHoursAgo && aiDate.getTime() <= new Date().getTime()) {
      publishedAt = aiDate;
    }
  }

  const id = Math.random().toString(36).substring(7);
  await db.query(`
    INSERT INTO articles (id, type, title, summary, body, region, sources, image_url, published_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (id) DO NOTHING
  `, [
    id,
    articleType,
    decodeHtmlEntities(article.title),
    decodeHtmlEntities(article.summary),
    decodeHtmlEntities(article.body),
    group.region,
    JSON.stringify(article.sources),
    getCategoryImage(group.category, id),
    publishedAt.toISOString()
  ]);

  console.log(`[Automation] Saved [${articleType}] article: ${article.title}`);
  existingTitles.push(article.title.toLowerCase());

  if (articleType === 'opportunities') {
    try {
      // Check if prospecting is enabled globally
      const settingsRes = await db.query("SELECT value FROM settings WHERE key = 'prospecting_enabled'");
      const prospectingEnabled = settingsRes.rows[0]?.value === true;

      if (prospectingEnabled) {
        const dirResult = await db.query("SELECT name, type, region, country, description, website FROM directory_entries LIMIT 100");
        const prospect = await generateProspects(article, dirResult.rows);
        await db.query(`
          INSERT INTO prospects (company_name, opportunity_id, pitch, contact_info)
          VALUES ($1, $2, $3, $4)
        `, [prospect.company_name, id, prospect.pitch, prospect.contact_info]);
      } else {
        console.log(`[Automation] Prospecting skipped for ${id} (disabled in settings)`);
      }
    } catch (pError) {
      console.error('[Prospecting Error]', pError);
    }
  }

  for (const source of article.sources) {
    await updateSourceScore(source, 1);
  }

  return id;
}



export async function generateProspects(opportunity: any, directoryEntries: any[]) {
  const prompt = `En tant qu'expert commercial pour 'Tunisia Transformateurs', analysez cette opportunité : "${opportunity.title} - ${opportunity.summary}". 
  Voici une liste d'entreprises locales/régionales (annuaire) : ${JSON.stringify(directoryEntries)}.
  
  Tâche :
  1. Identifier l'entreprise la plus susceptible d'être intéressée ou impliquée dans ce projet.
  2. Si aucune ne correspond, identifier le TYPE d'entreprise à prospecter.
  3. Rédiger un argumentaire de vente (pitch) court et percutant expliquant pourquoi 'Tunisia Transformateurs' est le partenaire idéal pour ce projet spécifique.
  4. **IMPORTANT** : Fournir l'information de contact la plus précise possible (Email direct, Site Web/Contact, ou Nom du département concerné). Si l'annuaire ne le précise pas, essayez d'inférer un format type (ex: contact@entreprise.com).
  `;

  const schema: any = {
    type: SchemaType.OBJECT,
    properties: {
      company_name: { type: SchemaType.STRING },
      pitch: { type: SchemaType.STRING },
      contact_info: { type: SchemaType.STRING, description: "Email direct, Site Web ou contact suggéré" }
    },
    required: ["company_name", "pitch", "contact_info"]
  };

  try {
    const result = await generateWithFallback(prompt, schema, "prospects");
    return JSON.parse(result.response.text());
  } catch (err: any) {
    await logAiAction('Prospecting Error', `Failed for ${opportunity.title}`, { error: err.message });
    throw err;
  }
}


export async function runAutomationCycle() {
  const db = getDb();

  // 1. Check Global Lock / Minimum interval between global cycles
  // We don't want to run a full cycle more than once every 4 hours even on restarts
  const globalCheck = await db.query("SELECT value FROM settings WHERE key = 'last_global_automation_run'");
  const lastGlobalRun = globalCheck.rows[0]?.value?.timestamp;
  
  if (lastGlobalRun) {
    const hoursSinceLastRun = (Date.now() - new Date(lastGlobalRun).getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastRun < 4) {
      console.log(`[Scheduler] Global automation cycle skipped. Last run was ${hoursSinceLastRun.toFixed(1)} hours ago.`);
      return;
    }
  }

  console.log('=== Starting Automation Cycle ===');
  
  // Update last global run timestamp immediately to "lock" other attempts
  await db.query(`
    INSERT INTO settings (key, value) 
    VALUES ('last_global_automation_run', $1::jsonb)
    ON CONFLICT (key) DO UPDATE SET value = $1::jsonb
  `, [JSON.stringify({ timestamp: new Date().toISOString() })]);

  // Health Check: Don't even start if SearXNG is down
  if (!(await isSearXNGAvailable())) {
    console.error('[Scheduler] SearXNG is unreachable. Aborting cycle.');
    await logAiAction('System Error', 'SearXNG unreachable, cycle aborted', { status: 'down' });
    return;
  }
  
  const existingArticlesResult = await db.query("SELECT title FROM articles ORDER BY published_at DESC LIMIT 200");
  const existingTitles = existingArticlesResult.rows.map((r: any) => r.title.toLowerCase());

  const existingEventsResult = await db.query("SELECT name FROM events LIMIT 200");
  const existingEvents = existingEventsResult.rows.map((r: any) => r.name.toLowerCase());

  const existingDirResult = await db.query("SELECT name FROM directory_entries LIMIT 200");
  const existingDirectory = existingDirResult.rows.map((r: any) => r.name.toLowerCase());

  const queries = await buildSearchQueriesFromDb();
  console.log(`[Scheduler] ${queries.length} queries eligible for this cycle`);

  // Group queries by category+region to batch search results before synthesis
  const grouped: Record<string, { results: SearchResult[]; category: string; region: string }> = {};

  // Phase 1: Sequential Execution to prevent overloading SearXNG
  console.log(`[Search] Executing ${queries.length} searches...`);
  const SEARCH_CONCURRENCY = 1; // Strictly sequential for SearXNG stability
  for (let i = 0; i < queries.length; i += SEARCH_CONCURRENCY) {
    const batch = queries.slice(i, i + SEARCH_CONCURRENCY);
    await Promise.all(batch.map(async (sq) => {
      const key = `${sq.category}::${sq.region}`;
      const results = await searchIndustryInfo(sq.query, sq.language);

      if (!grouped[key]) {
        grouped[key] = { results: [], category: sq.category, region: sq.region };
      }
      grouped[key].results.push(...results);

      // Mark this query as run and schedule next execution
      await markQueryAsRun(sq.id, sq.interval_minutes);
    }));
    
    if (i + SEARCH_CONCURRENCY < queries.length) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Increased rate limit delay
    }
  }

  // Deduplicate results within each group by URL
  for (const key of Object.keys(grouped)) {
    const seen = new Set<string>();
    grouped[key].results = grouped[key].results.filter(r => {
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });
    console.log(`[Group] ${key}: ${grouped[key].results.length} unique results`);
  }

  // Phase 2: Parallel Synthesis with Concurrency Control
  const entries = Object.entries(grouped);
  const CONCURRENCY_LIMIT = 1; // Sequential to conserve free-tier quota (20 req/day/model)
  
  for (let i = 0; i < entries.length; i += CONCURRENCY_LIMIT) {
    const batch = entries.slice(i, i + CONCURRENCY_LIMIT);
    console.log(`[Synthesis] Starting batch of ${batch.length} groups...`);
    
    await Promise.all(batch.map(async ([key, group]) => {
      if (group.results.length === 0) return;

      try {
        console.log(`[Synthesize] ${key}...`);
        
        if (group.category === 'events') {
          const events = await synthesizeEventsFromResults(group.region, group.results);
          for (const e of events) {
            if (existingEvents.includes(e.name.toLowerCase())) continue;
            
            const id = Math.random().toString(36).substring(7);
            await db.query(`
              INSERT INTO events (id, name, description, start_date, end_date, location, region, url, sources)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
              ON CONFLICT (id) DO NOTHING
            `, [id, e.name, e.description, e.start_date, e.end_date, e.location, group.region, e.url, JSON.stringify(e.sources || [])]);
            existingEvents.push(e.name.toLowerCase());
          }
          return;
        }

        if (group.category === 'directory') {
          const entries = await synthesizeDirectoryFromResults(group.region, group.results);
          for (const e of entries) {
            if (existingDirectory.includes(e.name.toLowerCase())) continue;

            const id = Math.random().toString(36).substring(7);
            await db.query(`
              INSERT INTO directory_entries (id, name, type, region, country, description, website)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
              ON CONFLICT (id) DO NOTHING
            `, [id, e.name, e.type, group.region, e.country, e.description, e.website]);
            existingDirectory.push(e.name.toLowerCase());
          }
          return;
        }

        const rawArticles = await synthesizeArticlesFromResults(group.region, group.category, group.results, existingTitles);

        // Sanitize AI output to prevent DB encoding errors and clean titles
        const articles = rawArticles.map((a: any) => ({
          title: (a.title || '').replace(/\0/g, '').replace(/^#+\s*/, '').trim(),
          summary: (a.summary || '').replace(/\0/g, ''),
          body: (a.body || '').replace(/\0/g, ''),
          sources: (a.sources || []).map((s: string) => s.replace(/\0/g, '')),
          published_at: a.published_at || null,
          article_type: a.article_type || 'news'
        }));

        for (const article of articles) {
          try {
            await saveArticleAndProspects(db, article, group, existingTitles);
          } catch (dbError) {
            console.error('[DB Error]', dbError);
          }
        }

      } catch (synthesisError: any) {
        console.error(`[Synthesis Error] ${key}:`, synthesisError);
        await logAiAction('Automation Error', `Cycle failed for ${key}`, { error: synthesisError.message });
      }
    }));
    
    // Longer delay between batches to conserve free-tier quota
    await new Promise(resolve => setTimeout(resolve, 30000));
  }

  console.log('=== Automation Cycle Finished ===');

  // Also update material prices
  updateMaterialPrices().catch(err => console.error('[Automation] Material price update failed:', err));
}

export async function runSingleSearchConfig(configId: string) {
  const db = getDb();
  const result = await db.query("SELECT * FROM search_configs WHERE id = $1", [configId]);
  const config = result.rows[0];
  if (!config) throw new Error("Search config not found");

  console.log(`[Manual Run] Starting: "${config.query}"`);
  
  const results = await searchIndustryInfo(config.query, config.language);
  if (results.length === 0) {
    console.log(`[Manual Run] No results for "${config.query}"`);
    return { success: true, articles: [], message: "Aucun résultat trouvé." };
  }

  // Reuse logic from cycle but for a single group
  const existingArticlesResult = await db.query("SELECT title FROM articles ORDER BY published_at DESC LIMIT 100");
  const existingTitles = existingArticlesResult.rows.map((r: any) => r.title.toLowerCase());

  if (config.category === 'events') {
    const events = await synthesizeEventsFromResults(config.region, results);
    for (const e of events) {
      const id = Math.random().toString(36).substring(7);
      await db.query(`
        INSERT INTO events (id, name, description, start_date, end_date, location, region, url, sources)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING
      `, [id, e.name, e.description, e.start_date, e.end_date, e.location, config.region, e.url, JSON.stringify(e.sources || [])]);
    }
    return { success: true, count: events.length };
  }

  if (config.category === 'directory') {
    const entries = await synthesizeDirectoryFromResults(config.region, results);
    for (const e of entries) {
      const id = Math.random().toString(36).substring(7);
      await db.query(`
        INSERT INTO directory_entries (id, name, type, region, country, description, website)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING
      `, [id, e.name, e.type, config.region, e.country, e.description, e.website]);
    }
    return { success: true, count: entries.length };
  }

  const rawArticles = await synthesizeArticlesFromResults(config.region, config.category, results, existingTitles);
  const articles = rawArticles.map((a: any) => ({
    title: (a.title || '').replace(/\0/g, '').replace(/^#+\s*/, '').trim(),
    summary: (a.summary || '').replace(/\0/g, ''),
    body: (a.body || '').replace(/\0/g, ''),
    sources: (a.sources || []).map((s: string) => s.replace(/\0/g, '')),
    article_type: a.article_type || 'news'
  }));

  let savedCount = 0;
  for (const article of articles) {
    const id = await saveArticleAndProspects(db, article, config, existingTitles);
    if (id) savedCount++;
  }


  // Update last_run_at
  await db.query("UPDATE search_configs SET last_run_at = CURRENT_TIMESTAMP WHERE id = $1", [configId]);

  return { success: true, savedCount };
}

export async function updateMaterialPrices() {
  console.log('[Materials] Starting periodic deep analysis for all materials...');
  const db = getDb();
  const result = await db.query("SELECT * FROM materials");
  const materials = result.rows;

  if (materials.length === 0) return;

  for (const mat of materials) {
    try {
      console.log(`[Materials] Deep Analysis for ${mat.name}...`);
      
      // 1. Search for real-time market data
      const searchResults = await searchIndustryInfo(`${mat.name} current price market forecast 2026`);
      
      if (searchResults.length === 0) {
        console.warn(`[Materials] No search results for ${mat.name}, skipping AI analysis to save quota.`);
        continue;
      }
      
      // 2. Get history
      const historyRes = await db.query("SELECT price, timestamp FROM material_prices WHERE material_id = $1 ORDER BY timestamp ASC LIMIT 30", [mat.id]);
      const history = historyRes.rows;

      // 3. AI Synthesis (using OpenRouter / Gemini fallback)
      const prompt = `
        Tu es l'analyste stratégique en chef.
        Analyse pour : **${mat.name}** (${mat.unit}).
        
        **Historique Interne :** ${JSON.stringify(history)}
        **Actualités Marché :** ${JSON.stringify(searchResults)}
        
        Tâche :
        1. Extraire le prix spot actuel.
        2. Prédire la tendance (up/down/stable) et le changement attendu (%).
        3. Rédiger une analyse experte courte (max 200 car.).
        4. **IMPORTANT** : Si les résultats de recherche contiennent une nouvelle majeure, urgente ou capitale (ex: fermeture de mine, nouvelle taxe, crise énergétique impactant ce matériau), crée un objet "breaking_news".
        
        Réponds en JSON uniquement :
        {
          "price": number,
          "currency": "USD",
          "trend_direction": "up" | "down" | "stable",
          "expected_change_pct": number,
          "analysis": "string",
          "breaking_news": {
            "should_create": boolean,
            "title": "string",
            "summary": "string",
            "body": "string",
            "sources": ["string"]
          }
        }
      `;
      
      const schema: any = {
        type: SchemaType.OBJECT,
        properties: {
          price: { type: SchemaType.NUMBER },
          currency: { type: SchemaType.STRING },
          trend_direction: { type: SchemaType.STRING },
          expected_change_pct: { type: SchemaType.NUMBER },
          analysis: { type: SchemaType.STRING },
          breaking_news: {
            type: SchemaType.OBJECT,
            properties: {
              should_create: { type: SchemaType.BOOLEAN },
              title: { type: SchemaType.STRING },
              summary: { type: SchemaType.STRING },
              body: { type: SchemaType.STRING },
              sources: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
            },
            required: ["should_create"]
          }
        },
        required: ["price", "currency", "trend_direction", "expected_change_pct", "analysis", "breaking_news"]
      };
      
      const res = await generateWithFallback(prompt, schema, "deep-material-analysis");
      const info = JSON.parse(res.response.text());

      if (info && typeof info.price === 'number') {
        await db.query(`
          UPDATE materials 
          SET current_price = $1, 
              currency = $2, 
              trend_percentage = $3, 
              ai_commentary = $4,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $5
        `, [info.price, info.currency || 'USD', info.expected_change_pct, info.analysis, mat.id]);
        
        await db.query(`
          INSERT INTO material_prices (id, material_id, price)
          VALUES ($1, $2, $3)
        `, [Math.random().toString(36).substring(7), mat.id, info.price]);
        
        console.log(`[Materials] Deep Analysis completed for ${mat.name}`);

        // Create news only if AI detected an important external information
        if (info.breaking_news && info.breaking_news.should_create) {
          const article = {
            title: info.breaking_news.title,
            summary: info.breaking_news.summary,
            body: info.breaking_news.body,
            sources: info.breaking_news.sources || searchResults.slice(0, 3).map(r => r.url),
            article_type: 'news'
          };
          console.log(`[Materials] AI detected breaking news for ${mat.name}: ${article.title}`);
          await saveArticleAndProspects(db, article, { category: 'rawMaterials', region: 'World' }, []);
        }
      }
    } catch (err) {
      console.error(`[Materials] Analysis failed for ${mat.name}:`, err);
    }
  }
}
