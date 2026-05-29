import React, { useEffect, useState } from 'react';
import {
  Settings, Plus, Trash2, Power, PowerOff, Pencil, X, Check,
  Globe, Clock, Shield, Search, Filter, Play, Loader2
} from 'lucide-react';

interface SearchConfig {
  id: string;
  query: string;
  language: string;
  category: string;
  region: string;
  priority: string;
  enabled: boolean;
  interval_minutes: number;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
}

interface SourceScore {
  domain: string;
  score: number;
  total_articles: number;
  last_seen_at: string;
}

const CATEGORIES = ['transformers', 'opportunities', 'rawMaterials', 'photovoltaic', 'events', 'directory', 'report'];
const REGIONS = ['Tunisia', 'Africa', 'World'];
const LANGUAGES = ['en', 'fr', 'ar'];
const PRIORITIES = ['high', 'medium', 'low', 'weekly'];

const CATEGORY_LABELS: Record<string, string> = {
  transformers: 'Transformateurs',
  opportunities: 'Opportunités',
  rawMaterials: 'Matières Premières',
  photovoltaic: 'Photovoltaïque',
  events: 'Événements',
  directory: 'Annuaire',
  report: 'Rapports',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-green-500/20 text-green-400 border-green-500/30',
  weekly: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
};

const LANGUAGE_LABELS: Record<string, string> = {
  en: '🇬🇧 EN',
  fr: '🇫🇷 FR',
  ar: '🇹🇳 AR',
};

interface FormState {
  query: string;
  language: string;
  category: string;
  region: string;
  priority: string;
}

const EMPTY_FORM: FormState = {
  query: '',
  language: 'fr',
  category: 'transformers',
  region: 'Tunisia',
  priority: 'medium',
};

export default function SearchConfigPage() {
  const [configs, setConfigs] = useState<SearchConfig[]>([]);
  const [sourceScores, setSourceScores] = useState<SourceScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
   const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [searxngHealth, setSearxngHealth] = useState<'loading' | 'ok' | 'down'>('loading');


  const loadData = async () => {
    try {
      const [configsResponse, scoresResponse] = await Promise.all([
        fetch('/api/search-configs').then(r => r.json()),
        fetch('/api/source-scores').then(r => r.json()),
      ]);
      setConfigs(configsResponse);
      setSourceScores(scoresResponse);
      
      // Separate health check
      const healthRes = await fetch('/api/test/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'test' }),
      });
      setSearxngHealth(healthRes.ok ? 'ok' : 'down');
    } catch (err) {
      console.error('Failed to load data:', err);
      setSearxngHealth('down');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleToggle = async (id: string) => {
    await fetch(`/api/search-configs/${id}/toggle`, { method: 'PATCH' });
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette requête de recherche ?')) return;
    await fetch(`/api/search-configs/${id}`, { method: 'DELETE' });
    loadData();
  };

  const handleAdd = async () => {
    if (!form.query.trim()) return;
    await fetch('/api/search-configs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm(EMPTY_FORM);
    setShowAddForm(false);
    loadData();
  };

  const handleEditStart = (config: SearchConfig) => {
    setEditingId(config.id);
    setForm({
      query: config.query,
      language: config.language,
      category: config.category,
      region: config.region,
      priority: config.priority,
    });
  };

  const handleEditSave = async () => {
    if (!editingId || !form.query.trim()) return;
    await fetch(`/api/search-configs/${editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setEditingId(null);
    setForm(EMPTY_FORM);
    loadData();
  };

   const handleEditCancel = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleRunNow = async (id: string) => {
    setRunningId(id);
    try {
      const res = await fetch(`/api/search-configs/${id}/run`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(`Succès ! ${data.savedCount || data.count || 0} nouveaux éléments détectés.`);
        loadData();
      } else {
        alert(`Erreur : ${data.error || 'Inconnue'}`);
      }
    } catch (err) {
      alert('Erreur lors de l\'exécution manuelle.');
    } finally {
      setRunningId(null);
    }
  };

  const filteredConfigs = configs.filter(c => {
    if (filterCategory !== 'All' && c.category !== filterCategory) return false;
    if (filterPriority !== 'All' && c.priority !== filterPriority) return false;
    return true;
  });

  const stats = {
    total: configs.length,
    enabled: configs.filter(c => c.enabled).length,
    high: configs.filter(c => c.priority === 'high').length,
    medium: configs.filter(c => c.priority === 'medium').length,
    low: configs.filter(c => c.priority === 'low').length,
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-app-muted">
        Chargement de la configuration...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-app-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Settings className="w-6 h-6 text-app-accent" />
            <h1 className="text-3xl font-serif font-bold text-app-text">Configuration des Recherches</h1>
          </div>
          <p className="text-app-muted">Gérez les requêtes de recherche automatisées, leur priorité et leur fréquence.</p>
        </div>
        <button
          onClick={() => { setShowAddForm(true); setForm(EMPTY_FORM); }}
          className="bg-app-accent text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-600 transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> Ajouter une requête
        </button>
      </div>

      {/* SearXNG Health Banner */}
      <div className={`flex items-center justify-between p-4 rounded-xl border ${
        searxngHealth === 'ok' 
          ? 'bg-green-500/5 border-green-500/20 text-green-400' 
          : searxngHealth === 'down' 
          ? 'bg-red-500/5 border-red-500/20 text-red-400' 
          : 'bg-app-card border-app-border text-app-muted'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${
            searxngHealth === 'ok' ? 'bg-green-500 animate-pulse' : searxngHealth === 'down' ? 'bg-red-500' : 'bg-app-muted'
          }`} />
          <span className="text-sm font-medium">
            Status SearXNG : {
              searxngHealth === 'ok' ? 'Opérationnel' : searxngHealth === 'down' ? 'Hors-ligne (Vérifiez votre instance SearXNG)' : 'Vérification...'
            }
          </span>
        </div>
        {searxngHealth === 'down' && (
          <p className="text-xs opacity-70 italic">
            L'automatisation et les synthèses IA seront suspendues pour économiser vos tentatives.
          </p>
        )}
      </div>


      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total" value={stats.total} icon={<Search className="w-4 h-4" />} />
        <StatCard label="Actives" value={stats.enabled} icon={<Power className="w-4 h-4" />} accent />
        <StatCard label="Haute" value={stats.high} icon={<Shield className="w-4 h-4 text-red-400" />} />
        <StatCard label="Moyenne" value={stats.medium} icon={<Shield className="w-4 h-4 text-yellow-400" />} />
        <StatCard label="Basse" value={stats.low} icon={<Shield className="w-4 h-4 text-green-400" />} />
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-app-card border border-app-accent/30 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-app-text">Nouvelle Requête de Recherche</h3>
            <button onClick={() => setShowAddForm(false)} className="text-app-muted hover:text-app-text">
              <X className="w-5 h-5" />
            </button>
          </div>
          <QueryForm form={form} setForm={setForm} />
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-app-muted hover:text-app-text transition-colors">
              Annuler
            </button>
            <button onClick={handleAdd} className="bg-app-accent text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-600 transition-colors">
              Ajouter
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-app-muted text-sm">
          <Filter className="w-4 h-4" /> Filtrer :
        </div>
        <div className="flex bg-app-card p-1 rounded-lg border border-app-border">
          {['All', ...CATEGORIES].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1 rounded-md text-xs transition-colors ${filterCategory === cat ? 'bg-app-accent text-white' : 'text-app-muted hover:text-app-text'}`}
            >
              {cat === 'All' ? 'Tous' : CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
        </div>
        <div className="flex bg-app-card p-1 rounded-lg border border-app-border">
          {['All', ...PRIORITIES].map(p => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              className={`px-3 py-1 rounded-md text-xs transition-colors ${filterPriority === p ? 'bg-app-accent text-white' : 'text-app-muted hover:text-app-text'}`}
            >
              {p === 'All' ? 'Tous' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        <span className="text-xs text-app-muted ml-auto">
          {filteredConfigs.length} / {configs.length} requêtes
        </span>
      </div>

      {/* Table */}
      <div className="bg-app-card border border-app-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-app-border text-app-muted text-[11px] uppercase tracking-wider">
                <th className="text-left px-4 py-3">Requête</th>
                <th className="text-center px-3 py-3">Langue</th>
                <th className="text-center px-3 py-3">Catégorie</th>
                <th className="text-center px-3 py-3">Région</th>
                <th className="text-center px-3 py-3">Priorité</th>
                <th className="text-center px-3 py-3">Intervalle</th>
                <th className="text-center px-3 py-3">Dernière Exéc.</th>
                <th className="text-center px-3 py-3">Prochaine</th>
                <th className="text-center px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredConfigs.map(config => (
                <tr
                  key={config.id}
                  className={`border-b border-app-border/50 hover:bg-app-bg/50 transition-colors ${!config.enabled ? 'opacity-40' : ''}`}
                >
                  {editingId === config.id ? (
                    <EditRow
                      form={form}
                      setForm={setForm}
                      onSave={handleEditSave}
                      onCancel={handleEditCancel}
                    />
                  ) : (
                    <>
                      <td className="px-4 py-3 text-app-text max-w-[300px] truncate font-mono text-xs" title={config.query}>
                        {config.query}
                      </td>
                      <td className="text-center px-3 py-3">
                        <span className="text-xs">{LANGUAGE_LABELS[config.language] || config.language}</span>
                      </td>
                      <td className="text-center px-3 py-3">
                        <span className="text-[10px] bg-app-bg px-2 py-0.5 rounded-md border border-app-border">
                          {CATEGORY_LABELS[config.category] || config.category}
                        </span>
                      </td>
                      <td className="text-center px-3 py-3">
                        <span className="text-xs text-app-muted">{config.region}</span>
                      </td>
                      <td className="text-center px-3 py-3">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${PRIORITY_COLORS[config.priority]}`}>
                          {config.priority}
                        </span>
                      </td>
                      <td className="text-center px-3 py-3">
                        <span className="text-xs text-app-muted flex items-center justify-center gap-1">
                          <Clock className="w-3 h-3" /> {config.interval_minutes}m
                        </span>
                      </td>
                      <td className="text-center px-3 py-3 text-xs text-app-muted">{formatTimestamp(config.last_run_at)}</td>
                      <td className="text-center px-3 py-3 text-xs text-app-muted">{formatTimestamp(config.next_run_at)}</td>
                      <td className="text-center px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                           <button
                            onClick={() => handleRunNow(config.id)}
                            disabled={runningId === config.id || !config.enabled}
                            className={`p-1.5 rounded-md transition-colors ${runningId === config.id ? 'text-indigo-400' : 'text-indigo-400 hover:bg-indigo-500/10'} disabled:opacity-30`}
                            title="Lancer maintenant"
                          >
                            {runningId === config.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => handleToggle(config.id)}
                            className={`p-1.5 rounded-md transition-colors ${config.enabled ? 'text-green-400 hover:bg-green-500/10' : 'text-red-400 hover:bg-red-500/10'}`}
                            title={config.enabled ? 'Désactiver' : 'Activer'}
                          >
                            {config.enabled ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => handleEditStart(config)}
                            className="p-1.5 rounded-md text-app-muted hover:text-app-accent hover:bg-app-accent/10 transition-colors"
                            title="Modifier"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(config.id)}
                            className="p-1.5 rounded-md text-app-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Source Scores */}
      {sourceScores.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-serif font-semibold text-app-text flex items-center gap-2">
            <Globe className="w-5 h-5 text-app-accent" />
            Qualité des Sources
          </h2>
          <p className="text-sm text-app-muted">
            Score de fiabilité basé sur le nombre d'articles générés par domaine. Les sources les plus citées apparaissent en premier.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sourceScores.slice(0, 15).map(source => (
              <div key={source.domain} className="bg-app-card border border-app-border rounded-lg p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-app-text">{source.domain}</div>
                  <div className="text-xs text-app-muted">{source.total_articles} articles</div>
                </div>
                <div className={`text-lg font-bold font-mono ${source.score >= 5 ? 'text-green-400' : source.score >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {source.score > 0 ? '+' : ''}{source.score}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Sub-components ---

function StatCard({ label, value, icon, accent }: { label: string; value: number; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`bg-app-card border rounded-lg p-4 flex items-center gap-3 ${accent ? 'border-app-accent/30' : 'border-app-border'}`}>
      <div className="text-app-muted">{icon}</div>
      <div>
        <div className={`text-2xl font-bold font-mono ${accent ? 'text-app-accent' : 'text-app-text'}`}>{value}</div>
        <div className="text-[11px] text-app-muted uppercase tracking-wider">{label}</div>
      </div>
    </div>
  );
}

function QueryForm({ form, setForm }: { form: FormState; setForm: (f: FormState) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2">
        <label className="block text-xs text-app-muted mb-1 uppercase tracking-wider">Requête de recherche</label>
        <input
          type="text"
          value={form.query}
          onChange={e => setForm({ ...form, query: e.target.value })}
          placeholder="ex: appel d'offre transformateur Tunisie STEG"
          className="w-full bg-app-bg border border-app-border rounded-lg px-4 py-2.5 text-app-text placeholder:text-app-muted/50 focus:outline-none focus:border-app-accent transition-colors"
        />
      </div>
      <div>
        <label className="block text-xs text-app-muted mb-1 uppercase tracking-wider">Catégorie</label>
        <select
          value={form.category}
          onChange={e => setForm({ ...form, category: e.target.value })}
          className="w-full bg-app-bg border border-app-border rounded-lg px-4 py-2.5 text-app-text focus:outline-none focus:border-app-accent transition-colors"
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-app-muted mb-1 uppercase tracking-wider">Région</label>
        <select
          value={form.region}
          onChange={e => setForm({ ...form, region: e.target.value })}
          className="w-full bg-app-bg border border-app-border rounded-lg px-4 py-2.5 text-app-text focus:outline-none focus:border-app-accent transition-colors"
        >
          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-app-muted mb-1 uppercase tracking-wider">Langue</label>
        <select
          value={form.language}
          onChange={e => setForm({ ...form, language: e.target.value })}
          className="w-full bg-app-bg border border-app-border rounded-lg px-4 py-2.5 text-app-text focus:outline-none focus:border-app-accent transition-colors"
        >
          {LANGUAGES.map(l => <option key={l} value={l}>{LANGUAGE_LABELS[l]}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-app-muted mb-1 uppercase tracking-wider">Priorité</label>
        <select
          value={form.priority}
          onChange={e => setForm({ ...form, priority: e.target.value })}
          className="w-full bg-app-bg border border-app-border rounded-lg px-4 py-2.5 text-app-text focus:outline-none focus:border-app-accent transition-colors"
        >
          {PRIORITIES.map(p => (
            <option key={p} value={p}>
              {p === 'high' ? '🔴 Haute (30 min)' : p === 'medium' ? '🟡 Moyenne (1h)' : p === 'low' ? '🟢 Basse (4h)' : '📅 Hebdomadaire (1 semaine)'}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function EditRow({ form, setForm, onSave, onCancel }: {
  form: FormState;
  setForm: (f: FormState) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <td className="px-4 py-2" colSpan={5}>
        <QueryForm form={form} setForm={setForm} />
      </td>
      <td colSpan={4} className="text-center px-3 py-2">
        <div className="flex items-center justify-center gap-2">
          <button onClick={onSave} className="p-2 rounded-md bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={onCancel} className="p-2 rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </td>
    </>
  );
}
