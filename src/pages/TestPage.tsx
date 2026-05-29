import React, { useState } from 'react';
import { Search, Sparkles, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

type SearchResult = {
  title: string;
  url: string;
  content: string;
};

type SynthesizedArticle = {
  title: string;
  summary: string;
  body: string;
  sources: string[];
  image_url?: string;
};

type TestMode = 'search' | 'synthesize';

export default function TestPage() {
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('World');
  const [mode, setMode] = useState<TestMode>('search');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [articles, setArticles] = useState<SynthesizedArticle[]>([]);
  const [meta, setMeta] = useState<any>(null);

  const handleRun = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setSearchResults([]);
    setArticles([]);
    setMeta(null);

    try {
      const endpoint = mode === 'search' ? '/api/test/search' : '/api/test/synthesize';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, region }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Request failed');
      }

      const data = await response.json();
      setMeta(data);

      if (mode === 'search') {
        setSearchResults(data.results || []);
      } else {
        setArticles(data.articles || []);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="border-b border-app-border pb-6">
        <h1 className="text-3xl font-serif font-bold text-app-text mb-2 flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-app-accent" />
          Tests de Recherche IA
        </h1>
        <p className="text-app-muted">Testez le pipeline de recherche SearXNG et le moteur de synthèse IA Gemini.</p>
      </div>

      {/* Controls */}
      <div className="bg-app-card border border-app-border rounded-2xl p-6 space-y-4">
        {/* Mode Toggle */}
        <div className="flex bg-app-bg p-1 rounded-lg border border-app-border w-fit">
          <button
            onClick={() => setMode('search')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${mode === 'search' ? 'bg-app-accent text-white' : 'text-app-muted hover:text-app-text'}`}
          >
            <Search className="w-4 h-4" />
            Recherche SearXNG Seule
          </button>
          <button
            onClick={() => setMode('synthesize')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${mode === 'synthesize' ? 'bg-app-accent text-white' : 'text-app-muted hover:text-app-text'}`}
          >
            <Sparkles className="w-4 h-4" />
            Recherche + Synthèse IA
          </button>
        </div>

        {/* Search Input */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-app-muted" />
            <input
              type="text"
              placeholder="ex: marché transformateurs électriques Tunisie 2026"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRun()}
              className="w-full bg-app-bg border border-app-border rounded-xl px-12 py-3 text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-accent transition-colors"
            />
          </div>

          {mode === 'synthesize' && (
            <select
              value={region}
              onChange={e => setRegion(e.target.value)}
              className="bg-app-bg border border-app-border rounded-xl px-4 py-3 text-app-text focus:outline-none focus:border-app-accent transition-colors"
            >
              <option value="World">Monde</option>
              <option value="Tunisia">Tunisie</option>
              <option value="Africa">Afrique</option>
            </select>
          )}

          <button
            onClick={handleRun}
            disabled={loading || !query.trim()}
            className="bg-app-accent text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {loading ? 'Exécution...' : 'Lancer'}
          </button>
        </div>

        {/* Info Bar */}
        <div className="text-xs text-app-muted flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          {mode === 'search'
            ? 'Recherche sur votre instance SearXNG locale et retourne les résultats bruts.'
            : 'Recherche sur SearXNG, puis transmet les résultats à Gemini IA pour synthétiser des articles professionnels.'}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Meta Info */}
      {meta && (
        <div className="bg-app-card border border-app-border rounded-xl p-4 text-sm text-app-muted font-mono">
          Query: <span className="text-app-text">"{meta.query}"</span>
          {meta.resultCount !== undefined && <> • Search Results: <span className="text-app-text">{meta.resultCount}</span></>}
          {meta.searchResultCount !== undefined && <> • Search Results: <span className="text-app-text">{meta.searchResultCount}</span></>}
          {meta.articles && <> • Articles Generated: <span className="text-app-text">{meta.articles.length}</span></>}
          {meta.region && <> • Region: <span className="text-app-text">{meta.region}</span></>}
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-serif font-semibold text-app-text">Raw Search Results</h2>
          {searchResults.map((result, idx) => (
            <a 
              key={idx} 
              href={result.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="block group"
            >
              <div className="bg-app-card border border-app-border rounded-xl p-5 group-hover:border-app-accent/50 group-hover:shadow-lg group-hover:shadow-app-accent/5 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-app-text font-medium mb-1 group-hover:text-app-accent transition-colors">{result.title}</h3>
                    <p className="text-app-muted text-sm leading-relaxed">{result.content}</p>
                  </div>
                  <div className="shrink-0 p-2 text-app-muted group-hover:text-app-accent transition-colors">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 text-xs text-app-accent/70 truncate group-hover:text-app-accent">{result.url}</div>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Synthesized Articles */}
      {articles.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-serif font-semibold text-app-text">AI Synthesized Articles</h2>
          {articles.map((article, idx) => (
            <div key={idx} className="bg-app-card border border-app-border rounded-2xl overflow-hidden">
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-sm bg-app-accent/10 text-app-accent font-bold">AI Generated</span>
                  <span className="text-xs text-app-muted">Article {idx + 1}</span>
                </div>
                <h3 className="text-2xl font-serif font-bold text-app-text leading-tight">{article.title}</h3>
                <p className="text-app-muted border-l-[3px] border-app-accent pl-4">{article.summary.replace(/\\n/g, '\n')}</p>
                <div className="markdown-body text-app-text leading-relaxed">
                  <ReactMarkdown>{article.body.replace(/\\n/g, '\n')}</ReactMarkdown>
                </div>
              </div>
              {article.sources && article.sources.length > 0 && (
                <div className="border-t border-app-border p-4 bg-app-bg">
                  <div className="text-xs text-app-muted uppercase tracking-wider font-bold mb-2">Sources</div>
                  <div className="flex flex-wrap gap-2">
                    {article.sources.map((src, srcIdx) => (
                      <a
                        key={srcIdx}
                        href={src}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-app-accent hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {src.length > 50 ? src.substring(0, 50) + '...' : src}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && searchResults.length === 0 && articles.length === 0 && !meta && (
        <div className="text-center py-20 bg-app-card rounded-2xl border border-app-border">
          <Search className="w-12 h-12 text-app-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-app-text mb-2">Prêt pour le test</h3>
          <p className="text-app-muted text-sm max-w-md mx-auto">
            Saisissez une requête de recherche ci-dessus et cliquez sur Lancer pour tester le pipeline d'intelligence IA.
          </p>
        </div>
      )}
    </div>
  );
}
