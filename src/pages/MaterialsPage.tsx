import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from 'recharts';
import { 
  ArrowUpRight, ArrowDownRight, Minus, Rocket, TrendingUp, 
  Pin, PinOff, ExternalLink, Globe, Info, Loader2, Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { predictPriceTrend } from '@/lib/forecasting';

interface Material {
  id: string;
  name: string;
  unit: string;
  current_price: number;
  currency: string;
  trend_percentage: number;
  ai_commentary: string;
  source_url: string | null;
  history: { price: number; timestamp: string }[];
}

interface CatalogItem {
  id: string;
  name: string;
  unit: string;
  category: string;
  source_url: string;
  reason: string;
  is_tracked: boolean;
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [pinning, setPinning] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('Tous');

  const loadMaterials = async () => {
    try {
      const res = await fetch('/api/materials');
      const data = await res.json();
      if (Array.isArray(data)) {
        setMaterials(data);
      } else {
        console.error('Materials data is not an array:', data);
        setMaterials([]);
      }
    } catch (err) {
      console.error(err);
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCatalog = async () => {
    try {
      const res = await fetch('/api/materials/catalog');
      const data = await res.json();
      if (Array.isArray(data)) {
        setCatalog(data);
      } else {
        console.error('Catalog data is not an array:', data);
        setCatalog([]);
      }
    } catch (err) {
      console.error(err);
      setCatalog([]);
    } finally {
      setLoadingCatalog(false);
    }
  };

  useEffect(() => { 
    loadMaterials();
    loadCatalog();
  }, []);

  const handlePin = async (item: CatalogItem) => {
    setPinning(item.id);
    await fetch('/api/materials/pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    await Promise.all([loadMaterials(), loadCatalog()]);
    setPinning(null);
  };

  const handleUnpin = async (id: string) => {
    setPinning(id);
    await fetch(`/api/materials/${id}`, { method: 'DELETE' });
    await Promise.all([loadMaterials(), loadCatalog()]);
    setPinning(null);
  };

  const handleDeepAnalysis = async (mat: Material) => {
    setAnalyzing(mat.id);
    try {
      await fetch(`/api/materials/${mat.id}/analyze`, { method: 'POST' });
      await loadMaterials();
      
      // Automatically open chat and ask for details
      window.dispatchEvent(new CustomEvent('open-chat-with-query', {
        detail: {
          query: `Peux-tu m'expliquer l'analyse profonde que tu viens de faire sur le ${mat.name} ?`,
          autoSend: true
        }
      }));
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setAnalyzing(null);
    }
  };

  const safeCatalog = Array.isArray(catalog) ? catalog : [];
  const safeMaterials = Array.isArray(materials) ? materials : [];

  const categories = ['Tous', ...Array.from(new Set(safeCatalog.map(c => c.category).filter(Boolean)))];
  const filteredCatalog = categoryFilter === 'Tous' 
    ? safeCatalog 
    : safeCatalog.filter(c => c.category === categoryFilter);

  return (
    <div className="space-y-8 fade-in duration-500">
      {/* Header */}
      <div className="border-b border-app-border pb-6">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-6 h-6 text-amber-400" />
          <h1 className="text-3xl font-serif font-bold text-app-text">Matières Premières</h1>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-app-muted">Sélectionnez les matières premières à surveiller depuis notre catalogue de sources vérifiées.</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <p className="text-xs text-amber-400 flex items-center gap-1.5 font-medium">
              <Rocket className="w-3.5 h-3.5" /> Bénéfice : Optimisez vos coûts d'achat et ajustez vos devis en temps réel.
            </p>
            <p className="text-xs text-app-accent flex items-center gap-1.5 font-medium">
              <TrendingUp className="w-3.5 h-3.5" /> Intelligence : Prévision algorithmique basée sur les tendances historiques.
            </p>
          </div>
        </div>
      </div>

      {/* Pinned / Tracked Materials */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-app-muted">
          <Loader2 className="w-8 h-8 animate-spin mr-3" /> Chargement des cours...
        </div>
      ) : safeMaterials.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {safeMaterials.map(mat => (
            <Card key={mat.id} className="bg-app-card border-app-border overflow-hidden relative group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-sans font-medium text-app-muted text-lg mb-1">{mat.name}</h3>
                    <div className="flex items-end gap-3">
                      <span className="text-3xl font-mono text-app-text tracking-tight">
                        {mat.current_price > 0 
                          ? new Intl.NumberFormat('fr-FR', { 
                              style: 'currency', 
                              currency: mat.currency || 'USD' 
                            }).format(mat.current_price).replace(',00', '')
                          : '—'
                        }
                      </span>
                      <span className="text-sm text-app-muted mb-1">{mat.unit}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded bg-app-bg border border-app-border",
                      mat.trend_percentage > 0 ? 'text-green-400' : mat.trend_percentage < 0 ? 'text-red-400' : 'text-slate-400'
                    )}>
                      {mat.trend_percentage > 0 ? <ArrowUpRight className="w-3 h-3" /> : mat.trend_percentage < 0 ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                      <span className="text-xs font-mono font-medium">{Math.abs(mat.trend_percentage)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleDeepAnalysis(mat)}
                        disabled={analyzing === mat.id}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                          "bg-app-accent/10 border border-app-accent/20 text-app-accent hover:bg-app-accent/20"
                        )}
                        title="Lancer une analyse profonde via OpenRouter"
                      >
                        {analyzing === mat.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Rocket className="w-3 h-3" />}
                        {analyzing === mat.id ? 'Analyse...' : 'Deep Intel'}
                      </button>
                      <button 
                        onClick={() => handleUnpin(mat.id)}
                        disabled={pinning === mat.id}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400/60 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                        title="Retirer de la surveillance"
                      >
                        {pinning === mat.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <PinOff className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Prediction Section */}
                {mat.history && mat.history.length >= 5 && (
                  <div className="mb-4 flex items-center justify-between bg-amber-500/5 border border-amber-500/10 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-amber-500/10 rounded-md">
                        <TrendingUp className="w-4 h-4 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-amber-500/70 font-bold">Prévision Algorithmique</p>
                        <div className="flex items-center gap-1.5">
                          {(() => {
                            const pred = predictPriceTrend(mat.history);
                            if (!pred) return <span className="text-xs text-app-muted">Données insuffisantes</span>;
                            
                            return (
                              <>
                                <span className={cn(
                                  "text-sm font-bold flex items-center gap-1",
                                  pred.direction === 'up' ? 'text-green-400' : pred.direction === 'down' ? 'text-red-400' : 'text-slate-400'
                                )}>
                                  {pred.direction === 'up' ? 'Hausse probable' : pred.direction === 'down' ? 'Baisse probable' : 'Stabilité'}
                                  {pred.direction === 'up' ? <ArrowUpRight className="w-3.5 h-3.5" /> : pred.direction === 'down' ? <ArrowDownRight className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                                </span>
                                <span className="text-[10px] text-app-muted border-l border-app-border pl-2 ml-1">
                                  Confiance: {pred.confidence}%
                                </span>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-app-muted uppercase font-bold">Projection</p>
                      <p className="text-xs font-mono text-app-text">
                        {(() => {
                          const pred = predictPriceTrend(mat.history);
                          if (!pred) return '—';
                          const sign = pred.expectedChange > 0 ? '+' : '';
                          return `${sign}${pred.expectedChange.toFixed(2)}%`;
                        })()}
                      </p>
                    </div>
                  </div>
                )}

                {mat.history && mat.history.length > 1 && (
                  <div className="h-32 w-full mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={mat.history}>
                        <YAxis domain={['dataMin - 100', 'dataMax + 100']} hide />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'var(--color-app-bg)', border: '1px solid var(--color-app-border)', borderRadius: '8px' }}
                          itemStyle={{ color: 'var(--color-app-accent)' }}
                          labelStyle={{ display: 'none' }}
                          formatter={(val: any) => [val ? `$${Number(val).toFixed(2)}` : 'N/A', 'Prix']}
                        />
                        <Line 
                          type="monotone" dataKey="price" 
                          stroke={mat.trend_percentage > 0 ? '#4ade80' : mat.trend_percentage < 0 ? '#f87171' : 'var(--color-app-accent)'} 
                          strokeWidth={3} dot={false} isAnimationActive={true}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="bg-slate-900/40 -mx-6 -mb-6 p-6 px-6 border-t border-app-border space-y-4">
                  {mat.ai_commentary && (
                    <div className="relative">
                      <div className="flex items-start gap-3 bg-app-card/50 p-4 rounded-xl border border-app-accent/10 shadow-inner">
                        <Info className="w-4 h-4 text-app-accent shrink-0 mt-0.5" />
                        <p className="text-[13px] text-app-text/90 leading-relaxed font-sans italic">
                          "{mat.ai_commentary}"
                        </p>
                      </div>
                    </div>
                  )}
                  {mat.source_url && (
                    <div className="flex justify-between items-center pt-2">
                      <a 
                        href={mat.source_url} target="_blank" rel="noopener noreferrer"
                        className="text-[11px] text-app-muted hover:text-app-accent transition-colors flex items-center gap-1.5 font-bold uppercase tracking-wider"
                      >
                        <Globe className="w-3.5 h-3.5" /> Source officielle <ExternalLink className="w-3 h-3" />
                      </a>
                      <span className="text-[10px] text-app-muted/50 font-mono">ID: {mat.id}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center bg-app-card border border-dashed border-app-border rounded-2xl">
          <TrendingUp className="w-10 h-10 mx-auto mb-3 text-amber-500/30" />
          <p className="text-app-muted text-sm">Aucune matière première surveillée. Épinglez-en depuis le catalogue ci-dessous.</p>
        </div>
      )}

      {/* Catalog Section */}
      <div className="bg-[#0D1525] border border-amber-500/20 rounded-2xl p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Layers className="w-5 h-5 text-amber-500" />
              <h2 className="text-xl font-bold text-app-text">Catalogue de Matières Premières</h2>
            </div>
            <p className="text-sm text-app-muted">Sources vérifiées par l'industrie. Cliquez pour épingler sur votre tableau de bord.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-bold border transition-all",
                  categoryFilter === cat
                    ? "bg-amber-500 text-black border-amber-500"
                    : "bg-app-bg text-app-muted border-app-border hover:border-amber-500/50"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loadingCatalog ? (
          <div className="flex items-center justify-center py-10 text-app-muted">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Chargement du catalogue...
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCatalog.map(item => (
              <div 
                key={item.id}
                className={cn(
                  "p-5 rounded-xl border transition-all flex flex-col justify-between",
                  item.is_tracked 
                    ? "bg-amber-500/5 border-amber-500/30" 
                    : "bg-app-bg border-app-border hover:border-amber-500/30"
                )}
              >
                <div>
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-[9px] uppercase tracking-widest text-amber-500/70 font-bold">{item.category}</span>
                    <span className="text-[10px] bg-app-card px-2 py-0.5 rounded border border-app-border font-mono">{item.unit}</span>
                  </div>
                  <h4 className="font-bold text-app-text mb-2">{item.name}</h4>
                  <p className="text-xs text-app-muted leading-relaxed mb-3">{item.reason}</p>
                  <a 
                    href={item.source_url} target="_blank" rel="noopener noreferrer"
                    className="text-[10px] text-app-accent hover:underline flex items-center gap-1 mb-4"
                  >
                    <Globe className="w-3 h-3" /> 
                    {(() => {
                      try {
                        return new URL(item.source_url).hostname.replace('www.', '');
                      } catch (e) {
                        return 'Source';
                      }
                    })()} 
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                {item.is_tracked ? (
                  <div className="flex items-center gap-2 text-amber-500 text-xs font-bold">
                    <Pin className="w-3.5 h-3.5" /> Épinglé sur votre tableau de bord
                  </div>
                ) : (
                  <button 
                    onClick={() => handlePin(item)}
                    disabled={pinning === item.id}
                    className="bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-bold px-4 py-2 rounded-lg hover:bg-amber-500/20 transition-all flex items-center gap-2 justify-center"
                  >
                    {pinning === item.id 
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Ajout...</>
                      : <><Pin className="w-3.5 h-3.5" /> Épingler et surveiller</>
                    }
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
