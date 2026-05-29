import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fetchNewsWithGemini } from '../lib/gemini-fetch';
import { RefreshCw, Rocket, Newspaper, Trash2 } from 'lucide-react';
import { decodeHtmlEntities } from '@/lib/utils';
import SafeImage from '@/components/SafeImage';

export default function NewsPage() {
  const [filter, setFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = () => {
    setLoading(true);
    let url = `/api/articles?type=news,report&region=${filter}`;
    if (dateFilter) url += `&date=${dateFilter}`;
    
    fetch(url)
      .then(res => res.json())
      .then(data => setNews(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    
    // Auto-synchronize every 60 seconds to catch background automation results
    const interval = setInterval(() => {
      loadData();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [filter, dateFilter]);

  const handleAIManualFetch = async () => {
    setLoading(true);
    await fetchNewsWithGemini(filter === 'All' ? 'Global' : filter);
    loadData();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Voulez-vous vraiment supprimer cet article ?')) {
      await fetch(`/api/articles/${id}`, { method: 'DELETE' });
      loadData();
    }
  };

  return (
    <div className="space-y-8 fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-app-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Newspaper className="w-6 h-6 text-emerald-400" />
            <h1 className="text-3xl font-serif font-bold text-app-text">Actualités de l'Industrie</h1>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-app-muted">Dernières analyses et rapports sur les marchés des transformateurs.</p>
            <p className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
              <Rocket className="w-3.5 h-3.5" /> Bénéfice : Anticipez les tendances du marché et surveillez vos rivaux.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Region Filter */}
          <div className="flex bg-app-card p-1 rounded-lg border border-app-border">
            {['All', 'Tunisia', 'Africa', 'World'].map(r => (
              <button 
                key={r}
                onClick={() => setFilter(r)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === r ? 'bg-app-accent text-white' : 'text-app-muted hover:text-app-text'}`}
              >
                {r === 'All' ? 'Tous' : r === 'Tunisia' ? 'Tunisie' : r === 'Africa' ? 'Afrique' : 'Monde'}
              </button>
            ))}
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2 bg-app-card p-1 rounded-lg border border-app-border">
            <button
              onClick={() => setDateFilter(dateFilter === 'today' ? '' : 'today')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${dateFilter === 'today' ? 'bg-emerald-500 text-white' : 'text-app-muted hover:text-app-text'}`}
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

          <button 
            onClick={handleAIManualFetch}
            disabled={loading}
            className="p-2 border border-app-border rounded-lg hover:bg-app-card text-app-muted hover:text-app-text disabled:opacity-50 ml-auto"
            title="Déclencher la récupération par l'IA"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && news.length === 0 ? (
        <div className="text-center py-20 text-app-muted">Récupération de l'intelligence curatée par l'IA...</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {news.map((item) => (
            <Link key={item.id} to={`/article/${item.id}`} className="group flex">
              <Card className="full-w bg-app-card border border-app-border overflow-hidden hover:border-app-accent transition-all duration-300 flex flex-col h-full rounded-xl">
                <div className="h-48 bg-[#0A0F1D] relative overflow-hidden">
                  <SafeImage 
                    src={item.image_url} 
                    alt={item.title} 
                    referrerPolicy="no-referrer" 
                    className="object-cover w-full h-full opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" 
                  />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-[3px] uppercase tag-${item.region.toLowerCase()}`}>
                      {item.region}
                    </span>
                    {(new Date().getTime() - new Date(item.published_at).getTime()) < (48 * 60 * 60 * 1000) && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] uppercase animate-pulse">
                        Nouveau
                      </Badge>
                    )}
                  </div>
                  <button 
                    onClick={(e) => handleDelete(e, item.id)}
                    className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-red-500/80 text-white/70 hover:text-white rounded-lg backdrop-blur-md transition-all opacity-0 group-hover:opacity-100"
                    title="Supprimer l'article"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <CardContent className="p-5 flex flex-col flex-1">
                  <span className="text-xs text-app-muted mb-3 font-mono">
                    {new Date(item.published_at).toLocaleString('fr-FR', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                  <h3 className="text-lg font-serif leading-tight text-app-text mb-3 line-clamp-2">{decodeHtmlEntities(item.title)}</h3>
                  <p className="text-app-muted text-[14px] line-clamp-3 mb-4 whitespace-pre-wrap">{decodeHtmlEntities(item.summary).replace(/\\n/g, '\n')}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
          {news.length === 0 && !loading && (
            <div className="col-span-full text-center py-20 text-app-muted">
              Aucun article trouvé pour cette région. Cliquez sur l'icône de rafraîchissement pour récupérer via l'IA.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
