import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Activity, Calendar as CalendarIcon, Newspaper, BookOpen, Trash2, Rocket, Briefcase } from 'lucide-react';
import { fetchNewsWithGemini } from '../lib/gemini-fetch';
import { decodeHtmlEntities } from '@/lib/utils';

export default function HomePage() {
  const [news, setNews] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/articles?type=news').then(res => res.json()),
      fetch('/api/articles?type=opportunities').then(res => res.json()),
      fetch('/api/materials').then(res => res.json())
    ]).then(([newsData, oppData, materialsData]) => {
      setNews(newsData);
      setOpportunities(oppData);
      setMaterials(materialsData);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
    
    // Auto-synchronize every 60 seconds to catch background automation results
    const interval = setInterval(() => {
      loadData();
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Supprimer cet article ?')) {
      await fetch(`/api/articles/${id}`, { method: 'DELETE' });
      loadData();
    }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-6 animate-in fade-in duration-700">
      <section 
        className="relative flex flex-col justify-end p-10 rounded-xl border border-app-border min-h-[400px] overflow-hidden" 
        style={{ background: "linear-gradient(rgba(10,15,29,0.4), rgba(10,15,29,0.9)), url('https://images.unsplash.com/photo-1620336655055-128821c60b7d?auto=format&fit=crop&q=80&w=800') center/cover" }}
      >
        <span className="absolute top-5 left-5 bg-app-accent text-white px-3 py-1 text-[11px] font-bold uppercase rounded-sm">Intelligence Stratégique</span>
        <h1 className="font-serif text-[42px] leading-[1.1] mb-4 max-w-[80%] text-white">
          Priorité aux <span className="text-app-accent italic">Opportunités</span> & Actualités
        </h1>
        <p className="text-base text-app-muted mb-6 max-w-[60%] leading-relaxed">
          Accédez en temps réel aux appels d'offres critiques et aux dernières nouvelles du marché des transformateurs. Maximisez vos chances de succès en Tunisie et en Afrique.
        </p>
        <div className="flex flex-wrap gap-4 items-center">
          <Link to="/opportunities" className="bg-app-accent text-white border-none py-3 px-6 rounded-md font-bold cursor-pointer hover:bg-blue-600 transition-all hover:scale-105 flex items-center gap-2 shadow-lg shadow-app-accent/20">
            <Rocket className="w-4 h-4" /> Voir les Opportunités
          </Link>
          <Link to="/news" className="bg-white/10 text-white border border-white/20 py-3 px-6 rounded-md font-bold cursor-pointer hover:bg-white/20 transition-colors">
            Actualités Récentes
          </Link>
        </div>
      </section>

      <aside className="bg-app-card border border-app-border rounded-xl flex flex-col p-5 overflow-hidden">
        <div className="text-[11px] uppercase tracking-[2px] text-app-muted mb-5 flex justify-between items-center">
          Indice des Matières Premières <span className="text-[10px] opacity-70">Mis à jour il y a 4h</span>
        </div>
        
        <div className="space-y-0">
          {materials.slice(0, 4).map((mat) => {
            const isDown = parseFloat(mat.trend_percentage) < 0;
            return (
              <div key={mat.id} className="flex flex-col py-3 border-b border-app-border last:border-0 relative">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-[14px] font-semibold mb-1 text-app-text">{mat.name}</div>
                    <div className="font-mono text-[18px] text-app-text">
                      {mat.currency === 'USD' ? '$' : mat.currency}{parseFloat(mat.current_price).toLocaleString()} 
                      <span className={`text-[12px] ml-2 ${isDown ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
                        {isDown ? '▼' : '▲'} {Math.abs(mat.trend_percentage)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {materials[0]?.ai_commentary && (
          <div className="mt-auto p-[15px] bg-[rgba(0,122,255,0.1)] rounded-lg border border-dashed border-app-accent">
            <div className="text-[11px] font-bold mb-1 text-app-accent uppercase">Aperçus de l'IA</div>
            <div className="text-[12px] leading-[1.4] text-app-muted line-clamp-4">
              {materials[0].ai_commentary}
            </div>
          </div>
        )}
      </aside>

      <div className="lg:col-span-2 space-y-8">
        {/* Section Opportunités Récentes */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-serif font-bold text-app-text flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-app-accent" /> Opportunités Récentes
            </h2>
            <Link to="/opportunities" className="text-sm text-app-accent hover:underline flex items-center gap-1">
              Tout voir <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <div className="col-span-2 h-20 bg-app-card border border-app-border rounded-xl animate-pulse" />
            ) : (
              opportunities.slice(0, 2).map((item) => (
                <Link key={item.id} to={`/article/${item.id}`} className="block group">
                  <div className="bg-[#0D1525] p-5 rounded-xl border border-blue-900/30 hover:border-app-accent transition-all duration-300">
                    <div className="flex justify-between items-start mb-2">
                      <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30 text-[10px] uppercase">
                        {item.region}
                      </Badge>
                      <span className="text-[10px] text-app-muted">{new Date(item.published_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <h3 className="text-app-text font-semibold line-clamp-1 group-hover:text-app-accent transition-colors">{decodeHtmlEntities(item.title)}</h3>
                    <p className="text-xs text-app-muted line-clamp-2 mt-2">{decodeHtmlEntities(item.summary)}</p>
                  </div>
                </Link>
              ))
            )}
            {opportunities.length === 0 && !loading && (
              <div className="col-span-2 py-8 text-center text-app-muted border border-dashed border-app-border rounded-xl">
                Aucune opportunité récente trouvée.
              </div>
            )}
          </div>
        </div>

        {/* Section Actualités */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-serif font-bold text-app-text flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-emerald-400" /> Actualités du Marché
            </h2>
            <Link to="/news" className="text-sm text-app-accent hover:underline flex items-center gap-1">
              Tout voir <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-3 h-40 flex items-center justify-center text-app-muted">Chargement...</div>
            ) : (
              news.slice(0, 3).map((item) => (
                <Link key={item.id} to={`/article/${item.id}`} className="block group">
                  <div className="bg-app-card p-5 rounded-xl border border-app-border h-full hover:border-[#3498DB] transition-colors relative">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-2">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-[3px] uppercase tag-${item.region.toLowerCase()}`}>
                          {item.region}
                        </span>
                        {(new Date().getTime() - new Date(item.published_at).getTime()) < (48 * 60 * 60 * 1000) && (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] uppercase animate-pulse">
                            Nouveau
                          </Badge>
                        )}
                      </div>
                    </div>
                    <h3 className="font-serif text-[18px] leading-[1.3] mb-2 text-app-text line-clamp-2">{decodeHtmlEntities(item.title)}</h3>
                    <div className="text-[11px] text-app-muted mt-auto">
                      {new Date(item.published_at).toLocaleDateString('fr-FR')} • {(() => {
                        try { return item.sources?.[0] ? new URL(item.sources[0]).hostname.replace('www.', '') : 'IA'; }
                        catch { return 'IA'; }
                      })()}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
