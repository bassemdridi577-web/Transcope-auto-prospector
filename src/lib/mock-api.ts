/**
 * Transcope Mock API Interceptor for GitHub Pages Hosting (Demo Format)
 * intercepting window.fetch to simulate a robust Node.js/PostgreSQL backend in-browser.
 */

import { predictPriceTrend } from './forecasting';

// Cache original fetch for asset loading
const originalFetch = window.fetch;

// In-memory loading promise to ensure we only seed once and serialize all API queries
let initializationPromise: Promise<void> | null = null;

// --- INITIAL DATA SEED CONSTANTS ---

const DEFAULT_MATERIALS_CATALOG = [
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
  { id: "pressboard", name: "Presspan / Carton Pressé", unit: "USD/tonne métrique", category: "Isolants solides", source_url: "https://www.weidmann-electrical.com/insulation/transformerboard/", reason: "Isolation structurelle entre enroulements et noyaux. Haute tenue mécanique et diélectrique." }
];

const DEFAULT_SEARCH_CONFIGS = [
  { id: 'tnd-tun-fr', query: "appel d'offre transformateur STEG Tunisie 2026", language: 'fr', category: 'tenders', region: 'Tunisia', priority: 'high', enabled: true, interval_minutes: 720 },
  { id: 'tnd-afr-fr', query: "appel d'offre transformateur distribution puissance Afrique SONELGAZ Senelec CEET", language: 'fr', category: 'tenders', region: 'Africa', priority: 'high', enabled: true, interval_minutes: 720 },
  { id: 'tnd-afr-en', query: "transformer procurement tender Africa utility 2026", language: 'en', category: 'tenders', region: 'Africa', priority: 'high', enabled: true, interval_minutes: 720 },
  { id: 'tnd-world-en', query: "international tender electric power transformer global 2026", language: 'en', category: 'tenders', region: 'World', priority: 'medium', enabled: true, interval_minutes: 1440 },
  { id: 'cfg-cop-en', query: "transformer raw materials copper silicon steel price 2026", language: 'en', category: 'rawMaterials', region: 'World', priority: 'medium', enabled: true, interval_minutes: 1440 },
  { id: 'cfg-sol-fr', query: "transformateur photovoltaïque solaire Tunisie Afrique 2026", language: 'fr', category: 'photovoltaic', region: 'Tunisia', priority: 'high', enabled: true, interval_minutes: 720 },
  { id: 'cfg-evt-fr', query: "événements industrie électrique Afrique Tunisie 2026", language: 'fr', category: 'events', region: 'Tunisia', priority: 'low', enabled: true, interval_minutes: 2880 }
];

const DEFAULT_EVENTS = [
  {
    id: "evt-01",
    name: "Salon International de la Transition Énergétique (SITE 2026)",
    description: "Le carrefour méditerranéen des technologies solaires et éoliennes, avec un focus sur le raccordement et les transformateurs photovoltaïques.",
    start_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15).toISOString(), // +15 days
    end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 18).toISOString(),
    location: "Palais des Congrès, Tunis, Tunisie",
    region: "Tunisia",
    url: "https://www.site-tunis.com",
    sources: ["https://steg.com.tn"]
  },
  {
    id: "evt-02",
    name: "Africa Energy Forum (AEF 2026)",
    description: "La plus grande rencontre des décideurs, ministères de l'Énergie et directeurs de compagnies d'électricité nationales (STEG, SONELGAZ, Senelec).",
    start_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString(), // +90 days
    end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 93).toISOString(),
    location: "KICC, Nairobi, Kenya",
    region: "Africa",
    url: "https://www.africa-energy-forum.com",
    sources: ["https://www.afdb.org"]
  },
  {
    id: "evt-03",
    name: "CIGRE Session 2026",
    description: "Événement mondial de référence pour les grands réseaux électriques et les équipements haute tension (transformateurs de puissance, disjoncteurs).",
    start_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60).toISOString(), // +60 days
    end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 65).toISOString(),
    location: "Palais des Congrès de Paris, France",
    region: "World",
    url: "https://www.cigre.org",
    sources: ["https://www.cigre.org"]
  }
];

const DEFAULT_DIRECTORY = [
  { id: "dir-01", name: "Tunisie Transformateurs (SACEM)", type: "manufacturer", region: "Tunisia", country: "Tunisie", description: "Leader de la construction et de la maintenance de transformateurs de distribution immergés en Afrique du Nord.", website: "https://sacem.com.tn" },
  { id: "dir-02", name: "STEG (Société Tunisienne de l'Électricité et du Gaz)", type: "stakeholder", region: "Tunisia", country: "Tunisie", description: "Compagnie publique nationale en charge de la production, du transport et de la distribution de l'électricité et du gaz en Tunisie.", website: "https://www.steg.com.tn" },
  { id: "dir-03", name: "Elsewedy Electric", type: "manufacturer", region: "Africa", country: "Égypte", description: "Géant multinational fournissant des câbles, transformateurs de puissance, et infrastructures clés en main à travers toute l'Afrique.", website: "https://www.elsewedyelectric.com" },
  { id: "dir-04", name: "SONELGAZ", type: "stakeholder", region: "Africa", country: "Algérie", description: "Groupe industriel public en charge de la distribution d'électricité en Algérie, client majeur pour transformateurs HTB/MT.", website: "https://www.sonelgaz.dz" },
  { id: "dir-05", name: "Projet Interconnexion Électrique Égypte-Arabie Saoudite", type: "project", region: "World", country: "Égypte / Arabie Saoudite", description: "Projet d'interconnexion massif en courant continu de 3000 MW nécessitant des transformateurs convertisseurs géants.", website: "https://www.gegridsolutions.com" }
];

const DEFAULT_PROSPECTS = [
  { id: 1, company_name: "Tunisia Green Energy", contact_info: "contact@tungreen.com", opportunity_id: "opt-steg-goes", pitch: "Fourniture de 15 transformateurs de distribution étanches et écologiques (ester naturel) pour le parc solaire de Tataouine.", status: "New", created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
  { id: 2, company_name: "Senelec Grid Extension Team", contact_info: "procurement@senelec.sn", opportunity_id: "opt-benin-dist", pitch: "Soumission pour la fourniture de 40 transformateurs de distribution 160 kVA dans le cadre de l'électrification rurale de la Casamance.", status: "Contacted", created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
  { id: 3, company_name: "Algeria Steel Partners", contact_info: "h.benyahia@algeriasteel.dz", opportunity_id: "opt-sonelgaz-pow", pitch: "Besoin de sous-traitance pour un transformateur de four à arc de 80 MVA au complexe sidérurgique d'El Hadjar.", status: "Interested", created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString() }
];

const DEFAULT_AI_LOGS = [
  { id: 101, action: "Automation", description: "Cycle d'automatisation global exécuté. 42 sources indexées.", details: { articles_extracted: 6, tenders_found: 2, raw_materials_updated: true }, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString() },
  { id: 102, action: "Synthesis", description: "Synthèse IA générative complétée pour l'appel d'offres STEG.", details: { input_sources: ["steg.com.tn", "web-scraping"], quality_score: 95 }, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() },
  { id: 103, action: "Search", description: "Recherche SearXNG déclenchée pour: 'CRGO steel prices forecast 2026'.", details: { results_count: 8, engine: "searxng" }, timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString() }
];

const DEFAULT_SOURCE_SCORES = [
  { domain: "steg.com.tn", score: 98, total_articles: 14, last_seen_at: new Date().toISOString() },
  { domain: "lme.com", score: 95, total_articles: 24, last_seen_at: new Date().toISOString() },
  { domain: "sonelgaz.dz", score: 92, total_articles: 8, last_seen_at: new Date().toISOString() },
  { domain: "reuters.com", score: 85, total_articles: 19, last_seen_at: new Date().toISOString() }
];

// --- DATA ENRICHMENT UTILITIES ---

function getRegionFromTitle(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('steg') || t.includes('tunis') || t.includes('sacem') || t.includes('bizerte') || t.includes('sousse')) {
    return 'Tunisia';
  }
  if (t.includes('afrique') || t.includes('bénin') || t.includes('senelec') || t.includes('sonelgaz') || t.includes('algérie') || t.includes('south africa') || t.includes('congo') || t.includes('sénégal') || t.includes('nampower') || t.includes('maroc')) {
    return 'Africa';
  }
  return 'World';
}

function getImageUrlFromTitle(title: string, type: string): string {
  const t = title.toLowerCase();
  if (type === 'opportunities' || type === 'tenders') {
    if (t.includes('solaire') || t.includes('pv') || t.includes('solar') || t.includes('renouvelable')) {
      return 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&auto=format&fit=crop';
    }
    return 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&auto=format&fit=crop'; // contract/desk
  }
  if (t.includes('cuivre') || t.includes('copper') || t.includes('acier') || t.includes('steel') || t.includes('métal') || t.includes('huile') || t.includes('oil')) {
    return 'https://images.unsplash.com/photo-1538634812854-cf36d65427d1?w=800&auto=format&fit=crop'; // metals
  }
  if (t.includes('grid') || t.includes('réseau') || t.includes('ligne') || t.includes('tension') || t.includes('interconnexion')) {
    return 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&auto=format&fit=crop'; // pylon/wire
  }
  return 'https://images.unsplash.com/photo-1620336655055-128821c60b7d?w=800&auto=format&fit=crop'; // transformer substation
}

function generateMockBody(title: string, type: string, region: string): { summary: string, body: string } {
  const desc = `Ce rapport d'intelligence de la plateforme **Transcope** analyse en profondeur l'enjeu stratégique relatif à : *"${title}"*.`;
  
  const summary = `Analyse stratégique de l'impact de cet événement sur le marché des transformateurs en région ${region}. Évaluation des opportunités de raccordement réseau et de fourniture de sous-stations électriques.`;

  const body = `## 1. Contexte Général
${desc}

Le marché de l'énergie en région **${region}** traverse actuellement une phase de restructuration majeure, portée par la transition énergétique et le besoin critique de modernisation des infrastructures électriques moyenne et haute tension.

## 2. Enjeux pour Tunisie Transformateurs
En tant qu'acteur industriel leader, cette évolution présente plusieurs opportunités et risques :
*   **Renforcement du Sourcing local** : Consolider nos parts de marché dans le secteur public (STEG / SONELGAZ).
*   **Avantage Concurrentiel** : Nos technologies de transformateurs immergés sous huile végétale (Ester naturel FR3) s'alignent parfaitement avec ces exigences de réduction d'empreinte carbone.
*   **Contraintes Matières** : L'accès aux tôles magnétiques CRGO (aciers à grains orientés) et la volatilité du cuivre au LME imposent un contrôle rigoureux de nos coûts d'approvisionnement.

## 3. Recommandations Stratégiques
1.  **Surveillance active** des appels d'offres publiés sur le portail des marchés publics de la zone d'influence.
2.  **Partenariat d'ingénierie** avec les promoteurs de centrales photovoltaïques off-grid pour se positionner dès la phase de design.
3.  **Arbitrage de couverture** sur les stocks de cuivre physique pour amortir les hausses de cours prévisibles d'ici les 30 prochains jours.`;

  return { summary, body };
}

// --- DATABASE IN-BROWSER INITIALIZER ---

async function initializeMockDatabase() {
  if (localStorage.getItem('transcope_seeded') === 'true') {
    return;
  }

  console.log('[MockDB] Starting initial seed operations...');

  // 1. Load articles list from static public folder
  try {
    const response = await originalFetch('/articles_list.json');
    if (!response.ok) throw new Error('Failed to fetch articles list');
    const rawArticles = await response.json();

    const enrichedArticles = rawArticles.map((art: any, index: number) => {
      const id = art.id || `art-${index}-${Math.random().toString(36).substring(2, 7)}`;
      const region = art.region || getRegionFromTitle(art.title);
      const { summary, body } = generateMockBody(art.title, art.type, region);
      return {
        id,
        type: art.type || 'news',
        title: art.title,
        summary: art.summary || summary,
        body: art.body || body,
        region,
        published_at: art.published_at || new Date(Date.now() - index * 1000 * 60 * 120).toISOString(),
        image_url: art.image_url || getImageUrlFromTitle(art.title, art.type),
        sources: art.sources || ["https://www.lesoleil.sn", "https://steg.com.tn"]
      };
    });

    localStorage.setItem('transcope_articles', JSON.stringify(enrichedArticles));
    console.log(`[MockDB] Successfully enriched and seeded ${enrichedArticles.length} articles.`);
  } catch (err) {
    console.error('[MockDB] Failed to load initial articles list:', err);
    // Fallback seed
    localStorage.setItem('transcope_articles', JSON.stringify([]));
  }

  // 2. Seed Materials and Generate histories (30 entries per material for sparklines)
  const seededMaterials = DEFAULT_MATERIALS_CATALOG.slice(0, 4).map(mat => {
    // Generate base prices
    let basePrice = 8500;
    let trend = 1.8;
    if (mat.id === 'copper-lme') { basePrice = 8940; trend = 2.4; }
    else if (mat.id === 'aluminium-lme') { basePrice = 2450; trend = -1.2; }
    else if (mat.id === 'crgo-steel') { basePrice = 3200; trend = 3.5; }
    else if (mat.id === 'transformer-oil') { basePrice = 115; trend = 0.5; }

    const history = [];
    for (let i = 29; i >= 0; i--) {
      // Simulate random walk
      const date = new Date(Date.now() - i * 1000 * 60 * 60 * 24);
      const noise = (Math.random() - 0.48) * (basePrice * 0.015);
      const price = Number((basePrice - (i * (basePrice * 0.002)) + noise).toFixed(2));
      history.push({ price, timestamp: date.toISOString() });
    }

    return {
      id: mat.id,
      name: mat.name,
      unit: mat.unit,
      current_price: basePrice,
      currency: 'USD',
      updated_at: new Date().toISOString(),
      ai_commentary: `Surveillance renforcée. La dynamique récente suggère une consolidation technique. Les contrats à terme soutiennent la tendance vers une ${trend > 0 ? 'hausse' : 'baisse'} modérée de ${Math.abs(trend)}% sous 30 jours due aux barrières logistiques en mer Rouge.`,
      trend_percentage: trend,
      source_url: mat.source_url,
      history
    };
  });

  localStorage.setItem('transcope_materials', JSON.stringify(seededMaterials));
  localStorage.setItem('transcope_catalog', JSON.stringify(DEFAULT_MATERIALS_CATALOG));
  localStorage.setItem('transcope_search_configs', JSON.stringify(DEFAULT_SEARCH_CONFIGS));
  localStorage.setItem('transcope_events', JSON.stringify(DEFAULT_EVENTS));
  localStorage.setItem('transcope_directory', JSON.stringify(DEFAULT_DIRECTORY));
  localStorage.setItem('transcope_prospects', JSON.stringify(DEFAULT_PROSPECTS));
  localStorage.setItem('transcope_logs', JSON.stringify(DEFAULT_AI_LOGS));
  localStorage.setItem('transcope_source_scores', JSON.stringify(DEFAULT_SOURCE_SCORES));

  // 3. Seed Settings
  const settings = {
    prospecting_enabled: true,
    openai_key_configured: false,
    automation_interval: 720
  };
  localStorage.setItem('transcope_settings', JSON.stringify(settings));

  localStorage.setItem('transcope_seeded', 'true');
  console.log('[MockDB] Seed operations completed successfully.');
}

// Global promise to guarantee DB is fully active before serving calls
function getDbPromise(): Promise<void> {
  if (!initializationPromise) {
    initializationPromise = initializeMockDatabase();
  }
  return initializationPromise;
}

// --- MOCK OFF-LINE CHATBOT LOGIC ---

function simulateChatResponse(message: string, history: any[], articleId: string | null): string {
  const msg = message.toLowerCase();
  
  // Try retrieving local records for smarter responses
  const localArticles = JSON.parse(localStorage.getItem('transcope_articles') || '[]');
  const localMaterials = JSON.parse(localStorage.getItem('transcope_materials') || '[]');

  // Check if viewing specific article
  if (articleId) {
    const art = localArticles.find((a: any) => a.id === articleId);
    if (art) {
      return `Je vois que vous lisez l'article **"${art.title}"** (Région : *${art.region}*).

Cet article fait état d'un enjeu de premier plan dans le secteur des transformateurs. D'après notre analyse stratégique :
1. Cet impact est très corrélé aux chantiers d'électrification rurale de la zone **${art.region}**.
2. Il justifie un suivi technique immédiat par notre département R&D, notamment sur la tenue en charge thermique des appareils.
3. Les sources citées pour cette analyse (${art.sources?.join(', ') || 'IA'}) sont notées avec un score de confiance de **98%** par notre outil SearXNG.

Avez-vous des questions précises sur le cahier des charges ou la faisabilité technique de cette opportunité pour SACEM / Tunisie Transformateurs ?`;
    }
  }

  // General raw materials query
  if (msg.includes('cuivre') || msg.includes('copper')) {
    const copper = localMaterials.find((m: any) => m.id === 'copper-lme');
    const priceText = copper ? `**${copper.current_price.toLocaleString()} USD/tonne** (Tendance: \`${copper.trend_percentage > 0 ? '▲' : '▼'} ${Math.abs(copper.trend_percentage)}%\`)` : "**8 940 USD/tonne**";
    return `Le cours du **Cuivre Grade A (LME)** est actuellement évalué à ${priceText}.
    
**Analyse d'impact sur nos transformateurs :**
*   Le cuivre représente plus de **35% du coût de revient** de nos enroulements.
*   *Recommandation* : En raison des tensions sur l'offre minière au Pérou, nous prévoyons une poursuite de la hausse. Il est recommandé de bloquer nos contrats à terme de couverture d'ici la fin de la semaine.
    
Vous pouvez suivre l'évolution en temps réel sur la page [Matières Premières](/materials).`;
  }

  if (msg.includes('acier') || msg.includes('steel') || msg.includes('crgo')) {
    const steel = localMaterials.find((m: any) => m.id === 'crgo-steel');
    const priceText = steel ? `**${steel.current_price.toLocaleString()} USD/tonne** (Tendance: \`${steel.trend_percentage > 0 ? '▲' : '▼'} ${Math.abs(steel.trend_percentage)}%\`)` : "**3 200 USD/tonne**";
    return `L'**Acier CRGO (tôle magnétique à grains orientés)** se négocie à environ ${priceText}.

Cet acier spécial est indispensable pour manufacturer les noyaux magnétiques de nos transformateurs haute efficacité à faibles pertes. Les délais de livraison mondiaux s'allongent à 12 semaines en raison des quotas d'importation européens.
    
Vous pouvez consulter le tableau de bord de suivi dans l'espace dédié aux [Matières Premières](/materials).`;
  }

  // Tenders and opportunities query
  if (msg.includes('opportunité') || msg.includes('opportunity') || msg.includes('appel') || msg.includes('offre') || msg.includes('tender')) {
    const opps = localArticles.filter((a: any) => a.type === 'opportunities' || a.type === 'tenders').slice(0, 3);
    
    if (opps.length > 0) {
      let list = opps.map((o: any) => `- **[${o.title}](/article/${o.id})** (${o.region}) – Échéance estimée le 30 Juin 2026.`).join('\n');
      return `Voici les dernières opportunités et appels d'offres identifiés en direct par l'IA de Transcope :

${list}

*   **Action requise** : Je vous invite à soumettre un pitch de prospection IA depuis la page de chaque article, ou à suivre ces opportunités sur notre tableau de bord de [Prospection](/prospecting).`;
    }
    return "Aucun appel d'offres n'est enregistré pour l'instant. Vous pouvez forcer une synchronisation dans l'onglet **Configurations de recherche**.";
  }

  if (msg.includes('tunisie') || msg.includes('steg')) {
    return `**Focus Tunisie & Réseau STEG :**
    
La Société Tunisienne de l'Électricité et du Gaz (STEG) déploie actuellement son plan de modernisation des réseaux de distribution ruraux (Horizon 2026-2028).
*   **Enjeu clé** : Le remplacement de 1 200 transformateurs monophasés par des transformateurs triphasés basse tension.
*   **Opportunité SACEM** : Nous restons favoris sur ces lots grâce à notre logistique locale de maintenance rapide.

Consultez l'annuaire stratégique [Annuaire](/directory) pour connaître nos contacts clés à la STEG.`;
  }

  if (msg.includes('afrique') || msg.includes('prospect')) {
    return `**Analyse de Prospection en Afrique de l'Ouest (Senelec / SONELGAZ) :**
    
Le plan régional de la CEDEAO soutient massivement le raccordement de mini-réseaux solaires ruraux. Nos transformateurs de distribution étanches à haute protection thermique sont parfaitement calibrés pour ces marchés sub-sahariens.
    
Découvrez nos fiches de prospects qualifiées sur la page [Prospection IA](/prospecting).`;
  }

  // Default strategically professional response
  return `Bonjour ! Je suis **l'Assistant IA Transcope**, spécialisé dans la veille stratégique pour **Tunisie Transformateurs (SACEM)**.

Je peux vous renseigner précisément sur :
1.  Les cours des métaux industriels et isolants (ex: **Cuivre**, **Acier CRGO**).
2.  Les appels d'offres en cours pour le réseau **STEG** ou à l'échelle de l'**Afrique** (ex: *Senelec*, *SONELGAZ*).
3.  Notre annuaire d'acteurs industriels clés.

Que souhaitez-vous analyser aujourd'hui ? (Exemple: *« Quel est le prix du cuivre ? »* ou *« Cite-moi les opportunités d'appels d'offres. »*)`;
}

// --- CORE FETCH INTERCEPTOR LOGIC ---

window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const urlString = input.toString();

  // If the request is not directed to the local API, let it pass normally
  if (!urlString.includes('/api/')) {
    return originalFetch(input, init);
  }

  // Await the asynchronous database initialization before resolving any route
  await getDbPromise();

  // Parse HTTP method and query parameters
  const method = (init?.method || 'GET').toUpperCase();
  const url = new URL(urlString, window.location.origin);
  const path = url.pathname;

  // Retrieve mutable arrays from LocalStorage
  const getArticles = () => JSON.parse(localStorage.getItem('transcope_articles') || '[]');
  const saveArticles = (arr: any[]) => localStorage.setItem('transcope_articles', JSON.stringify(arr));

  const getMaterials = () => JSON.parse(localStorage.getItem('transcope_materials') || '[]');
  const saveMaterials = (arr: any[]) => localStorage.setItem('transcope_materials', JSON.stringify(arr));

  const getCatalog = () => JSON.parse(localStorage.getItem('transcope_catalog') || '[]');
  const saveCatalog = (arr: any[]) => localStorage.setItem('transcope_catalog', JSON.stringify(arr));

  const getSearchConfigs = () => JSON.parse(localStorage.getItem('transcope_search_configs') || '[]');
  const saveSearchConfigs = (arr: any[]) => localStorage.setItem('transcope_search_configs', JSON.stringify(arr));

  const getProspects = () => JSON.parse(localStorage.getItem('transcope_prospects') || '[]');
  const saveProspects = (arr: any[]) => localStorage.setItem('transcope_prospects', JSON.stringify(arr));

  const getLogs = () => JSON.parse(localStorage.getItem('transcope_logs') || '[]');
  const saveLogs = (arr: any[]) => localStorage.setItem('transcope_logs', JSON.stringify(arr));

  const getSourceScores = () => JSON.parse(localStorage.getItem('transcope_source_scores') || '[]');

  const getEvents = () => JSON.parse(localStorage.getItem('transcope_events') || '[]');
  const getDirectory = () => JSON.parse(localStorage.getItem('transcope_directory') || '[]');

  const getSettings = () => JSON.parse(localStorage.getItem('transcope_settings') || '{}');
  const saveSettings = (obj: any) => localStorage.setItem('transcope_settings', JSON.stringify(obj));

  // Helper response builder
  const jsonResponse = (data: any, status = 200) => {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  // --- API ROUTER MOCK IMPLEMENTATION ---

  try {
    // 1. GET /api/settings & POST /api/settings
    if (path === '/api/settings') {
      if (method === 'GET') {
        return jsonResponse(getSettings());
      }
      if (method === 'POST') {
        const body = JSON.parse(init?.body || '{}');
        const settings = getSettings();
        if (body.key) {
          settings[body.key] = body.value;
          saveSettings(settings);
        }
        return jsonResponse({ success: true });
      }
    }

    // 2. GET /api/articles (with filtration & limit)
    if (path === '/api/articles' && method === 'GET') {
      const typeParam = url.searchParams.get('type');
      const regionParam = url.searchParams.get('region');
      const dateParam = url.searchParams.get('date');

      let filtered = getArticles();

      if (typeParam) {
        const types = typeParam.split(',').map(t => t.trim());
        filtered = filtered.filter((art: any) => types.includes(art.type));
      }
      if (regionParam && regionParam !== 'All') {
        filtered = filtered.filter((art: any) => art.region === regionParam);
      }
      if (dateParam === 'today') {
        // Since it's a demo, simulate half of items are today's
        filtered = filtered.slice(0, Math.ceil(filtered.length / 2));
      }

      return jsonResponse(filtered.slice(0, 50));
    }

    // 3. GET /api/articles/:id (detailed lookup)
    const articleIdMatch = path.match(/^\/api\/articles\/([a-zA-Z0-9\-]+)$/);
    if (articleIdMatch && method === 'GET') {
      const id = articleIdMatch[1];
      const articles = getArticles();
      let art = articles.find((a: any) => a.id === id);
      
      // Title loose fallback
      if (!art) {
        const searchTitle = decodeURIComponent(id).toLowerCase();
        art = articles.find((a: any) => a.title.toLowerCase().includes(searchTitle));
      }

      if (!art) {
        return jsonResponse({ error: 'Article non trouvé' }, 404);
      }
      return jsonResponse(art);
    }

    // 4. DELETE /api/articles/:id
    if (articleIdMatch && method === 'DELETE') {
      const id = articleIdMatch[1];
      const articles = getArticles();
      const nextArticles = articles.filter((a: any) => a.id !== id);
      saveArticles(nextArticles);
      return jsonResponse({ success: true });
    }

    // 5. GET /api/events (filtration by region)
    if (path === '/api/events' && method === 'GET') {
      const regionParam = url.searchParams.get('region');
      let filtered = getEvents();
      if (regionParam && regionParam !== 'All') {
        filtered = filtered.filter((evt: any) => evt.region === regionParam);
      }
      return jsonResponse(filtered);
    }

    // 6. GET /api/directory
    if (path === '/api/directory' && method === 'GET') {
      const regionParam = url.searchParams.get('region');
      const typeParam = url.searchParams.get('type');

      let filtered = getDirectory();

      if (regionParam && regionParam !== 'All') {
        filtered = filtered.filter((dir: any) => dir.region.toLowerCase() === regionParam.toLowerCase());
      }
      if (typeParam && typeParam !== 'All') {
        filtered = filtered.filter((dir: any) => dir.type.toLowerCase() === typeParam.toLowerCase());
      }

      return jsonResponse(filtered);
    }

    // 7. GET /api/logs
    if (path === '/api/logs' && method === 'GET') {
      return jsonResponse(getLogs());
    }

    // 8. GET /api/source-scores
    if (path === '/api/source-scores' && method === 'GET') {
      return jsonResponse(getSourceScores());
    }

    // 9. GET /api/prospects & PATCH /api/prospects/:id
    if (path === '/api/prospects' && method === 'GET') {
      return jsonResponse(getProspects());
    }

    const prospectIdMatch = path.match(/^\/api\/prospects\/(\d+)$/);
    if (prospectIdMatch && method === 'PATCH') {
      const id = parseInt(prospectIdMatch[1]);
      const body = JSON.parse(init?.body || '{}');
      const prospects = getProspects();
      const idx = prospects.findIndex((p: any) => p.id === id);
      if (idx !== -1) {
        prospects[idx].status = body.status || prospects[idx].status;
        saveProspects(prospects);
        return jsonResponse({ success: true });
      }
      return jsonResponse({ error: 'Prospect non trouvé' }, 404);
    }

    // 10. GET /api/materials (Pinned / Tracked ones)
    if (path === '/api/materials' && method === 'GET') {
      return jsonResponse(getMaterials());
    }

    // 11. GET /api/materials/catalog
    if (path === '/api/materials/catalog' && method === 'GET') {
      const materials = getMaterials();
      const trackedIds = new Set(materials.map((m: any) => m.id));
      const catalog = getCatalog().map((cat: any) => ({
        ...cat,
        is_tracked: trackedIds.has(cat.id)
      }));
      return jsonResponse(catalog);
    }

    // 12. POST /api/materials/pin (Surveiller une matière)
    if (path === '/api/materials/pin' && method === 'POST') {
      const body = JSON.parse(init?.body || '{}');
      const materials = getMaterials();
      
      if (!materials.some((m: any) => m.id === body.id)) {
        // Generate price history
        const basePrice = body.id.includes('oil') ? 120 : body.id.includes('resin') ? 4.5 : 2500;
        const history = [];
        for (let i = 29; i >= 0; i--) {
          const date = new Date(Date.now() - i * 1000 * 60 * 60 * 24);
          history.push({
            price: Number((basePrice - (i * (basePrice * 0.001)) + (Math.random() - 0.5) * (basePrice * 0.01)).toFixed(2)),
            timestamp: date.toISOString()
          });
        }

        materials.push({
          id: body.id,
          name: body.name,
          unit: body.unit,
          current_price: basePrice,
          currency: 'USD',
          updated_at: new Date().toISOString(),
          ai_commentary: `Surveillance active initiée. Le cours initial est estimé sur la base des indices Spot internationaux.`,
          trend_percentage: 0.5,
          source_url: body.source_url,
          history
        });
        saveMaterials(materials);

        // Record AI log
        const logs = getLogs();
        logs.unshift({
          id: Math.ceil(Math.random() * 10000),
          action: "Automation",
          description: `Ajout de la matière première: ${body.name} à la liste de surveillance active.`,
          details: { material_id: body.id },
          timestamp: new Date().toISOString()
        });
        saveLogs(logs);
      }
      return jsonResponse({ success: true });
    }

    // 13. DELETE /api/materials/:id (Unpin)
    const materialIdMatch = path.match(/^\/api\/materials\/([a-zA-Z0-9\-]+)$/);
    if (materialIdMatch && method === 'DELETE') {
      const id = materialIdMatch[1];
      const materials = getMaterials();
      const nextMaterials = materials.filter((m: any) => m.id !== id);
      saveMaterials(nextMaterials);
      return jsonResponse({ success: true });
    }

    // 14. POST /api/materials/:id/analyze (Deep Intel Analysis simulation)
    const analyzeIdMatch = path.match(/^\/api\/materials\/([a-zA-Z0-9\-]+)\/analyze$/);
    if (analyzeIdMatch && method === 'POST') {
      const id = analyzeIdMatch[1];
      const materials = getMaterials();
      const idx = materials.findIndex((m: any) => m.id === id);
      if (idx !== -1) {
        // Perform simulated deep forecasting
        const forecastDirection = Math.random() > 0.45 ? 'up' : 'down';
        const pct = Number(((Math.random() * 3.5) + 0.5).toFixed(2));
        const trend = forecastDirection === 'up' ? pct : -pct;
        
        materials[idx].trend_percentage = trend;
        materials[idx].ai_commentary = `ANALYSE PROFONDE COMPLÈTE (Simulée) : Le cours du ${materials[idx].name} montre un signal de ${forecastDirection === 'up' ? 'hausse technique' : 'baisse technique'} de ${pct}% pour les 30 prochains jours. Des tensions géopolitiques limitent l'offre physique tandis que la demande industrielle de bobines reste soutenue.`;
        materials[idx].updated_at = new Date().toISOString();
        
        // Add current price entry
        const lastPrice = materials[idx].history[materials[idx].history.length - 1].price;
        const newPrice = Number((lastPrice * (1 + (trend / 200))).toFixed(2));
        materials[idx].current_price = newPrice;
        materials[idx].history.push({ price: newPrice, timestamp: new Date().toISOString() });
        
        saveMaterials(materials);

        // Record AI log
        const logs = getLogs();
        logs.unshift({
          id: Math.ceil(Math.random() * 10000),
          action: "Synthesis",
          description: `Analyse profonde de marché IA complétée pour ${materials[idx].name}.`,
          details: { forecast_trend: trend, confidence_score: 87 },
          timestamp: new Date().toISOString()
        });
        saveLogs(logs);

        return jsonResponse({ success: true, analysis: { prediction_direction: forecastDirection, confidence: 87, expected_change_pct: trend, analysis: materials[idx].ai_commentary } });
      }
      return jsonResponse({ error: 'Matière non trouvée' }, 404);
    }

    // 15. GET /api/search-configs & POST /api/search-configs
    if (path === '/api/search-configs') {
      if (method === 'GET') {
        return jsonResponse(getSearchConfigs());
      }
      if (method === 'POST') {
        const body = JSON.parse(init?.body || '{}');
        const configs = getSearchConfigs();
        const id = `cfg-${Math.random().toString(36).substring(2, 7)}`;
        const priorityIntervals: Record<string, number> = { high: 720, medium: 1440, low: 2880, weekly: 10080 };
        const interval = priorityIntervals[body.priority || 'medium'] || 1440;

        const newConfig = {
          id,
          query: body.query,
          language: body.language || 'fr',
          category: body.category,
          region: body.region || 'World',
          priority: body.priority || 'medium',
          enabled: true,
          interval_minutes: interval
        };

        configs.unshift(newConfig);
        saveSearchConfigs(configs);
        return jsonResponse({ success: true, id });
      }
    }

    // 16. PUT /api/search-configs/:id & DELETE /api/search-configs/:id & PATCH /api/search-configs/:id/toggle & POST /api/search-configs/:id/run
    const configIdMatch = path.match(/^\/api\/search-configs\/([a-zA-Z0-9\-]+)$/);
    if (configIdMatch) {
      const id = configIdMatch[1];
      const configs = getSearchConfigs();

      if (method === 'PUT') {
        const body = JSON.parse(init?.body || '{}');
        const idx = configs.findIndex((c: any) => c.id === id);
        if (idx !== -1) {
          configs[idx].query = body.query || configs[idx].query;
          configs[idx].language = body.language || configs[idx].language;
          configs[idx].category = body.category || configs[idx].category;
          configs[idx].region = body.region || configs[idx].region;
          configs[idx].priority = body.priority || configs[idx].priority;
          saveSearchConfigs(configs);
          return jsonResponse({ success: true });
        }
        return jsonResponse({ error: 'Config non trouvée' }, 404);
      }

      if (method === 'DELETE') {
        const nextConfigs = configs.filter((c: any) => c.id !== id);
        saveSearchConfigs(nextConfigs);
        return jsonResponse({ success: true });
      }
    }

    const configToggleMatch = path.match(/^\/api\/search-configs\/([a-zA-Z0-9\-]+)\/toggle$/);
    if (configToggleMatch && method === 'PATCH') {
      const id = configToggleMatch[1];
      const configs = getSearchConfigs();
      const idx = configs.findIndex((c: any) => c.id === id);
      if (idx !== -1) {
        configs[idx].enabled = !configs[idx].enabled;
        saveSearchConfigs(configs);
        return jsonResponse({ success: true });
      }
      return jsonResponse({ error: 'Config non trouvée' }, 404);
    }

    const configRunMatch = path.match(/^\/api\/search-configs\/([a-zA-Z0-9\-]+)\/run$/);
    if (configRunMatch && method === 'POST') {
      const id = configRunMatch[1];
      const configs = getSearchConfigs();
      const config = configs.find((c: any) => c.id === id);
      if (!config) return jsonResponse({ error: 'Config non trouvée' }, 404);

      // Simulate a successful background run cycle
      const articles = getArticles();
      const generatedId = `art-sim-${Math.random().toString(36).substring(2, 6)}`;
      
      const newSimulatedArticle = {
        id: generatedId,
        type: config.category || 'news',
        title: `[Synthèse IA] Résultat pour: ${config.query}`,
        summary: `Cette étude de marché synthétisée par l'IA analyse en temps réel les flux repérés pour la requête "${config.query}". Évaluation de pertinence élevée (Score : 5/5).`,
        body: `## Analyse de Veille – Rapport Automatique\nLa plateforme Transcope a analysé les signaux faibles et flux d'actualités liés à la recherche : **${config.query}** (Zone : ${config.region}).\n\n### Points Clés :\n- **Opportunité identifiée** : Raccordement et fourniture de bobines d'enroulement renforcées pour transformateurs industriels.\n- **Indicateur de marché** : Demande en hausse constante sur le trimestre.\n- **Action recommandée** : Nos commerciaux doivent contacter les promoteurs locaux.`,
        region: config.region || 'World',
        published_at: new Date().toISOString(),
        image_url: getImageUrlFromTitle(config.query, config.category),
        sources: ["https://steg.com.tn", "https://reuters.com"]
      };

      articles.unshift(newSimulatedArticle);
      saveArticles(articles);

      // Add log
      const logs = getLogs();
      logs.unshift({
        id: Math.ceil(Math.random() * 10000),
        action: "Search",
        description: `Exécution manuelle du flux: "${config.query}".`,
        details: { result_added: generatedId, status: "success", category: config.category },
        timestamp: new Date().toISOString()
      });
      saveLogs(logs);

      return jsonResponse({ success: true, message: "Flux de recherche exécuté. Nouvelle synthèse générée." });
    }

    // 17. POST /api/tenders/search (Triggers manual tenders scraping cycle)
    if (path === '/api/tenders/search' && method === 'POST') {
      const articles = getArticles();
      const numGenerated = 2;
      const ids = [];

      // Generate 2 new tenders
      for (let i = 0; i < numGenerated; i++) {
        const id = `tnd-proc-${Math.random().toString(36).substring(2, 6)}`;
        ids.push(id);
        const tenderTitle = i === 0 
          ? "Appel d'offre national : Fourniture de 200 transformateurs monophasés STEG (2026-N2)"
          : "Acquisition internationale de transformateurs de puissance élévateurs 90 MVA - SONELGAZ Algérie";

        const enrichedSummary = [
          `🏛️ ${i === 0 ? 'STEG (Tunisie)' : 'SONELGAZ (Algérie)'}`,
          `📅 Échéance: 14 Juillet 2026`,
          `💰 ${i === 0 ? 'Budget estimé: 1.2M TND' : 'Non communiquée'}`,
          `⚡ Type: Distribution MT / Puissance HTB`,
          '',
          `Appel d'offres stratégique pour la fabrication et la livraison sur site de transformateurs électriques pour le renforcement des réseaux régionaux.`
        ].join('\n');

        const enrichedBody = [
          `**Organisme émetteur:** ${i === 0 ? 'STEG (Tunisie)' : 'SONELGAZ (Algérie)'}`,
          `**Date limite de soumission:** 14 Juillet 2026`,
          `**Valeur estimée:** ${i === 0 ? '1 200 000 TND' : 'Non communiquée'}`,
          `**Type de transformateur:** ${i === 0 ? 'Transformateur de distribution immergé 100-250kVA' : 'Transformateur de puissance HTB 90MVA'}`,
          `**Score de pertinence:** ⭐⭐⭐⭐⭐ (5/5)`,
          '',
          `### Spécifications techniques requises :`,
          `1.  Pertes à vide réduites s'alignant sur la réglementation européenne Ecodesign Tier 2.`,
          `2.  Cuve hermétique avec huile isolante diélectrique (norme CEI 60296).`,
          `3.  Garantie constructeur de 5 ans avec pièces et main-d'œuvre incluant les essais de type.`
        ].join('\n');

        articles.unshift({
          id,
          type: 'tenders',
          title: tenderTitle,
          summary: enrichedSummary,
          body: enrichedBody,
          region: i === 0 ? 'Tunisia' : 'Africa',
          published_at: new Date().toISOString(),
          image_url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&auto=format&fit=crop',
          sources: [i === 0 ? 'https://steg.com.tn' : 'https://www.sonelgaz.dz']
        });
      }

      saveArticles(articles);

      const logs = getLogs();
      logs.unshift({
        id: Math.ceil(Math.random() * 10000),
        action: "Automation",
        description: "Recherche de tenders multi-langues complétée avec succès.",
        details: { queries_run: 6, extracted_tenders: numGenerated },
        timestamp: new Date().toISOString()
      });
      saveLogs(logs);

      return jsonResponse({ success: true, savedCount: numGenerated, extracted: numGenerated });
    }

    // 18. POST /api/automation/run (Manual global cycle)
    if (path === '/api/automation/run' && method === 'POST') {
      const logs = getLogs();
      logs.unshift({
        id: Math.ceil(Math.random() * 10000),
        action: "Automation",
        description: "Cycle complet d'automatisation démarré manuellement en tâche de fond.",
        details: { triggered_by: "user_dashboard" },
        timestamp: new Date().toISOString()
      });
      saveLogs(logs);
      return jsonResponse({ success: true, message: "Automation cycle started in background" });
    }

    // 19. POST /api/chat ( стратеги chatbot response)
    if (path === '/api/chat' && method === 'POST') {
      const body = JSON.parse(init?.body || '{}');
      const reply = simulateChatResponse(body.message || '', body.history || [], body.articleId || null);
      
      // Keep track of chat conversations inside logs
      const logs = getLogs();
      logs.unshift({
        id: Math.ceil(Math.random() * 10000),
        action: "Synthesis",
        description: `Interaction de chat IA complétée (Modèle: ${body.model || 'GPT-120B'}).`,
        details: { question_length: (body.message || '').length, model: body.model },
        timestamp: new Date().toISOString()
      });
      saveLogs(logs);

      return jsonResponse({ reply });
    }

    // 20. POST /api/test/search (SearXNG dry run test)
    if (path === '/api/test/search' && method === 'POST') {
      const body = JSON.parse(init?.body || '{}');
      return jsonResponse({
        query: body.query || 'electric transformer',
        resultCount: 3,
        results: [
          { title: `Actualité marché: ${body.query || 'Marché'} 2026`, content: `Les experts prévoient une croissance stable de l'approvisionnement lié à ${body.query || 'ce segment'}.`, url: "https://reuters.com/electricity-transformer-supply" },
          { title: `Tutoriel technique sur les spécifications de ${body.query || 'ce matériel'}`, content: "Directives de sécurité et guide de couplage des enroulements basse tension.", url: "https://www.wikipedia.org" }
        ]
      });
    }

    // 21. POST /api/test/synthesize (Gemini dry run synthesis)
    if (path === '/api/test/synthesize' && method === 'POST') {
      const body = JSON.parse(init?.body || '{}');
      return jsonResponse({
        query: body.query,
        region: body.region || 'World',
        category: body.category || 'transformers',
        searchResultCount: 2,
        articles: [
          {
            title: `[Dry-Run] Synthèse de recherche sur ${body.query}`,
            summary: "Document synthétique généré par l'IA pour tester le quota de l'API Gemini.",
            body: `Analyse rapide du flux d'information sur la requête: **${body.query}**.`,
            region: body.region || 'World',
            sources: ["https://steg.com.tn"]
          }
        ]
      });
    }

    // Fallback: Default 404 for unhandled API calls
    return jsonResponse({ error: 'Endpoint mock non implémenté' }, 404);

  } catch (err: any) {
    console.error(`[MockAPI] Crash during handling of ${method} ${path}:`, err);
    return jsonResponse({ error: err.message || 'Crash interne de l\'intercepteur mock' }, 500);
  }
};
