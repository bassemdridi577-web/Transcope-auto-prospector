import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Search, Gavel, ExternalLink, Trash2, AlertTriangle, Globe, MapPin } from 'lucide-react';
import { decodeHtmlEntities } from '@/lib/utils';
import SafeImage from '@/components/SafeImage';

interface Tender {
  id: string;
  title: string;
  summary: string;
  body: string;
  region: string;
  published_at: string;
  sources: string[];
  image_url: string;
}

const REGION_FILTERS = ['All', 'Tunisia', 'Africa', 'World'] as const;

export default function TendersPage() {
  const [regionFilter, setRegionFilter] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState('');
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const loadTenders = () => {
    setLoading(true);
    let url = `/api/articles?type=tenders&region=${regionFilter}`;
    if (dateFilter) url += `&date=${dateFilter}`;

    fetch(url)
      .then(res => res.json())
      .then(data => setTenders(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTenders();
    const interval = setInterval(loadTenders, 60000);
    return () => clearInterval(interval);
  }, [regionFilter, dateFilter]);

  const handleManualSearch = async () => {
    setLoading(true);
    await fetch('/api/tenders/search', { method: 'POST' });
    // Wait a moment for synthesis to complete, then reload
    setTimeout(loadTenders, 3000);
  };

  const handleDelete = async (event: React.MouseEvent, id: string) => {
    event.preventDefault();
    event.stopPropagation();
    if (window.confirm('Supprimer cet appel d\'offre ?')) {
      await fetch(`/api/articles/${id}`, { method: 'DELETE' });
      loadTenders();
    }
  };

  const extractPrimarySource = (sources: string[]): string | null => {
    if (!sources || sources.length === 0) return null;
    return sources.find(s => s.startsWith('http')) || null;
  };

  const getTimeSincePublished = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Il y a moins d\'1h';
    if (hours < 24) return `Il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Hier';
    if (days < 7) return `Il y a ${days} jours`;
    return new Date(dateStr).toLocaleDateString('fr-FR');
  };

  const isRecent = (dateStr: string): boolean => {
    return (Date.now() - new Date(dateStr).getTime()) < (48 * 60 * 60 * 1000);
  };

  return (
    <div className="space-y-8 fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-app-border pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-500/10 rounded-xl">
              <Gavel className="w-6 h-6 text-amber-400" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-app-text">Appels d'Offres</h1>
          </div>
          <p className="text-app-muted">
            Appels d'offres et demandes vérifiées pour <span className="text-white font-medium">transformateurs électriques</span> — monde entier.
          </p>
          <p className="text-xs text-amber-400 flex items-center gap-1.5 font-medium mt-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Seuls les appels d'offres confirmés avec lien source valide sont affichés.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Region Filter */}
          <div className="flex bg-app-card p-1 rounded-lg border border-app-border">
            {REGION_FILTERS.map(region => (
              <button
                key={region}
                onClick={() => setRegionFilter(region)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  regionFilter === region
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-app-muted hover:text-app-text'
                }`}
              >
                {region === 'All' ? 'Tous' : region === 'Tunisia' ? 'Tunisie' : region === 'Africa' ? 'Afrique' : 'Monde'}
              </button>
            ))}
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2 bg-app-card p-1 rounded-lg border border-app-border">
            <button
              onClick={() => setDateFilter(dateFilter === 'today' ? '' : 'today')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                dateFilter === 'today'
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'text-app-muted hover:text-app-text'
              }`}
            >
              Aujourd'hui
            </button>
            <input
              type="date"
              value={dateFilter !== 'today' ? dateFilter : ''}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-app-text px-2 py-1 w-[120px] focus:ring-0"
            />
            {dateFilter && (
              <button onClick={() => setDateFilter('')} className="text-xs text-red-400 px-2 hover:text-red-300">Reset</button>
            )}
          </div>

          {/* Refresh */}
          <button
            onClick={handleManualSearch}
            disabled={loading}
            className="p-2 border border-amber-500/30 rounded-lg hover:bg-amber-500/10 text-amber-400 hover:text-amber-300 disabled:opacity-50 transition-all"
            title="Lancer une recherche d'appels d'offres"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-[#1A1508] border border-amber-900/30 p-6 rounded-xl flex items-start gap-4">
        <div className="p-3 bg-amber-950/50 rounded-lg shrink-0">
          <Search className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h4 className="text-app-text font-semibold mb-1">Recherche Multi-Langue Vérifiée</h4>
          <p className="text-sm text-app-muted">
            L'IA recherche les appels d'offres en <strong className="text-amber-300">français, anglais, arabe et espagnol</strong> sur les portails officiels (STEG, SONELGAZ, DGMARKET, UNGM, AfDB, Banque Mondiale). 
            Chaque résultat est <strong className="text-amber-300">vérifié avec un lien source</strong> — aucune donnée inventée n'est affichée.
          </p>
        </div>
      </div>

      {/* Results */}
      {loading && tenders.length === 0 ? (
        <div className="text-center py-20">
          <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-4" />
          <p className="text-app-muted">Recherche des appels d'offres transformateurs en cours...</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tenders.map((tender) => {
            const primarySource = extractPrimarySource(tender.sources);

            return (
              <div 
                key={tender.id} 
                onClick={() => navigate(`/article/${tender.id}`)}
                className="group flex cursor-pointer"
              >
                <Card className="w-full bg-app-card border border-app-border overflow-hidden hover:border-amber-500/50 transition-all duration-300 flex flex-col h-full rounded-xl">
                  {/* Image */}
                  <div className="h-44 bg-[#0A0F1D] relative overflow-hidden">
                    <SafeImage
                      src={tender.image_url}
                      alt={tender.title}
                      referrerPolicy="no-referrer"
                      className="object-cover w-full h-full opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                    />
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F1D] via-transparent to-transparent" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                      <Badge className="bg-amber-600/20 text-amber-300 border-amber-600/30 text-[10px] uppercase font-bold">
                        <Gavel className="w-3 h-3 mr-1" /> Appel d'Offre
                      </Badge>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-[3px] uppercase tag-${tender.region.toLowerCase()}`}>
                        {tender.region === 'Tunisia' && <MapPin className="w-3 h-3" />}
                        {tender.region === 'World' && <Globe className="w-3 h-3" />}
                        {tender.region}
                      </span>
                      {isRecent(tender.published_at) && (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] uppercase animate-pulse">
                          Nouveau
                        </Badge>
                      )}
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDelete(e, tender.id)}
                      className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-red-500/80 text-white/70 hover:text-white rounded-lg backdrop-blur-md transition-all opacity-0 group-hover:opacity-100"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Content */}
                  <CardContent className="p-5 flex flex-col flex-1">
                    <span className="text-xs text-amber-400/70 mb-2 font-mono">
                      {getTimeSincePublished(tender.published_at)}
                    </span>
                    <h3 className="text-lg font-serif leading-tight text-app-text mb-3 line-clamp-2 group-hover:text-amber-200 transition-colors">
                      {decodeHtmlEntities(tender.title)}
                    </h3>

                    {/* Intelligence metadata extracted from summary */}
                    {(() => {
                      const lines = (tender.summary || '').split('\n');
                      const orgLine = lines.find(l => l.includes('🏛️'));
                      const deadlineLine = lines.find(l => l.includes('📅'));
                      const valueLine = lines.find(l => l.includes('💰'));
                      const typeLine = lines.find(l => l.includes('⚡'));
                      const textLines = lines.filter(l => !l.startsWith('🏛️') && !l.startsWith('📅') && !l.startsWith('💰') && !l.startsWith('⚡') && l.trim());

                      return (
                        <>
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {orgLine && (
                              <span className="inline-flex items-center text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded-md">
                                {orgLine.replace('🏛️ ', '')}
                              </span>
                            )}
                            {deadlineLine && !deadlineLine.includes('Non précisée') && (
                              <span className="inline-flex items-center text-[10px] bg-red-500/10 text-red-300 border border-red-500/20 px-2 py-0.5 rounded-md">
                                {deadlineLine.replace('📅 ', '')}
                              </span>
                            )}
                            {typeLine && (
                              <span className="inline-flex items-center text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-md">
                                {typeLine.replace('⚡ ', '')}
                              </span>
                            )}
                            {valueLine && !valueLine.includes('Non communiquée') && (
                              <span className="inline-flex items-center text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                                {valueLine.replace('💰 ', '')}
                              </span>
                            )}
                          </div>
                          <p className="text-app-muted text-[13px] line-clamp-3 mb-4 whitespace-pre-wrap flex-1">
                            {decodeHtmlEntities(textLines.join(' ')).replace(/\\n/g, '\n')}
                          </p>
                        </>
                      );
                    })()}

                    {/* Source Link */}
                    {primarySource && (
                      <a
                        href={primarySource}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-2 text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-2 rounded-lg border border-amber-500/20 transition-all mt-auto"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[200px]">
                          {new URL(primarySource).hostname.replace('www.', '')}
                        </span>
                        <span className="text-amber-400/50">→ Source officielle</span>
                      </a>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}

          {tenders.length === 0 && !loading && (
            <div className="col-span-full text-center py-20">
              <Gavel className="w-12 h-12 text-amber-400/20 mx-auto mb-4" />
              <p className="text-app-muted text-lg mb-2">Aucun appel d'offre détecté pour le moment</p>
              <p className="text-app-muted/60 text-sm mb-6">
                Cliquez sur le bouton de rafraîchissement pour lancer une recherche mondiale.
              </p>
              <button
                onClick={handleManualSearch}
                disabled={loading}
                className="px-6 py-2.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg hover:bg-amber-500/30 transition-all font-medium text-sm"
              >
                <RefreshCw className={`w-4 h-4 inline mr-2 ${loading ? 'animate-spin' : ''}`} />
                Rechercher des appels d'offres
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
