import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Search, Briefcase, Rocket, Trash2 } from 'lucide-react';
import { decodeHtmlEntities } from '@/lib/utils';
import SafeImage from '@/components/SafeImage';

export default function OpportunitiesPage() {
  const [filter, setFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);


  const loadData = () => {
    setLoading(true);
    let url = `/api/articles?type=opportunities&region=${filter}`;
    if (dateFilter) url += `&date=${dateFilter}`;

    fetch(url)
      .then(res => res.json())
      .then(data => setOpportunities(data))
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



  const handleManualTrigger = async () => {
    setLoading(true);
    // Trigger the actual backend automation cycle
    await fetch('/api/test/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        query: 'appels d\'offres transformateurs Tunisie Afrique 2026',
        category: 'opportunities'
      })
    });
    loadData();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Voulez-vous vraiment supprimer cette opportunité ?')) {
      await fetch(`/api/articles/${id}`, { method: 'DELETE' });
      loadData();
    }
  };

  return (
    <div className="space-y-8 fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-app-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="w-6 h-6 text-app-accent" />
            <h1 className="text-3xl font-serif font-bold text-app-text">Opportunités d'Affaires</h1>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-app-muted">Veille stratégique et appels d'offres pour <span className="text-white font-medium">Tunisie Transformateurs</span>.</p>
            <p className="text-xs text-app-accent flex items-center gap-1.5 font-medium">
              <Rocket className="w-3.5 h-3.5" /> Bénéfice : Générez du revenu en détectant les marchés avant la concurrence.
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
                {r === 'All' ? 'Tous' : r}
              </button>
            ))}
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2 bg-app-card p-1 rounded-lg border border-app-border">
            <button
              onClick={() => setDateFilter(dateFilter === 'today' ? '' : 'today')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${dateFilter === 'today' ? 'bg-app-accent text-white' : 'text-app-muted hover:text-app-text'}`}
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
            onClick={handleManualTrigger}
            disabled={loading}
            className="p-2 border border-app-border rounded-lg hover:bg-app-card text-app-muted hover:text-app-text disabled:opacity-50"
            title="Lancer une recherche d'opportunités IA"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>



      <div className="bg-[#0D1525] border border-blue-900/30 p-6 rounded-xl flex items-start gap-4 mb-8">
        <div className="p-3 bg-blue-950/50 rounded-lg">
          <Search className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h4 className="text-app-text font-semibold mb-1">Veille Proactive</h4>
          <p className="text-sm text-app-muted">L'IA analyse quotidiennement les publications de la STEG, SONELGAZ et des agences d'infrastructure africaines pour détecter des opportunités de vente pour vos transformateurs.</p>
        </div>
      </div>

      {loading && opportunities.length === 0 ? (
        <div className="text-center py-20 text-app-muted">Analyse des marchés en cours...</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {opportunities.map((item) => (
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
                    <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30 text-[10px] uppercase">
                      Opportunité
                    </Badge>
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
                    title="Supprimer l'opportunité"
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
          {opportunities.length === 0 && !loading && (
            <div className="col-span-full text-center py-20 text-app-muted">
              Aucune opportunité détectée pour le moment. Cliquez sur le bouton de rafraîchissement pour lancer une recherche.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
