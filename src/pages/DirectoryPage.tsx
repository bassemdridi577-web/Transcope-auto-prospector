import React, { useState, useEffect } from 'react';
import { Loader2, Search, Rocket, Users } from 'lucide-react';

export default function DirectoryPage() {
  const [filterRegion, setFilterRegion] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/directory?region=${filterRegion}&type=${filterType}`)
      .then(res => res.json())
      .then(data => setEntries(data))
      .finally(() => setLoading(false));
  }, [filterRegion, filterType]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="border-b border-app-border pb-6">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-6 h-6 text-cyan-400" />
          <h1 className="text-3xl font-serif font-bold text-app-text">Annuaire Mondial</h1>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-app-muted">Fabricants, grands projets de réseau et parties prenantes clés de l'industrie.</p>
          <p className="text-xs text-cyan-400 flex items-center gap-1.5 font-medium">
            <Rocket className="w-3.5 h-3.5" /> Bénéfice : Identifiez de nouveaux partenaires ou cibles commerciales.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="flex bg-app-card p-1 rounded-lg border border-app-border w-fit">
          {['All', 'Tunisia', 'Africa', 'World'].map(r => (
            <button key={r} onClick={() => setFilterRegion(r)} className={`px-4 py-1.5 rounded-md text-sm transition-colors ${filterRegion === r ? 'bg-app-accent text-white' : 'text-app-muted hover:text-app-text'}`}>
              {r === 'All' ? 'Tous' : r === 'Tunisia' ? 'Tunisie' : r === 'Africa' ? 'Afrique' : 'Monde'}
            </button>
          ))}
        </div>
        <div className="flex bg-app-card p-1 rounded-lg border border-app-border w-fit">
          {['All', 'Manufacturer', 'Project', 'Stakeholder'].map(t => (
            <button key={t} onClick={() => setFilterType(t)} className={`px-4 py-1.5 rounded-md text-sm transition-colors ${filterType === t ? 'bg-app-accent text-white' : 'text-app-muted hover:text-app-text'}`}>
              {t === 'All' ? 'Tous' : t === 'Manufacturer' ? 'Fabricant' : t === 'Project' ? 'Projet' : 'Partie prenante'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="py-20 text-center text-app-muted flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin" />
            Chargement de l'annuaire...
          </div>
        ) : entries.length === 0 ? (
          <div className="py-20 text-center text-app-muted bg-app-card rounded-2xl border border-app-border">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Aucune entrée trouvée pour ces filtres.</p>
          </div>
        ) : entries.map(entry => (
          <div key={entry.id} className="p-6 bg-app-card border border-app-border hover:border-app-accent transition-all rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[10px] px-2 py-0.5 rounded-sm bg-app-bg text-app-accent border border-app-accent/20 uppercase tracking-widest font-bold">{entry.type}</span>
                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-[3px] uppercase tag-${entry.region.toLowerCase()}`}>{entry.region}</span>
                {entry.country && <span className="text-[10px] text-app-muted uppercase tracking-wider">• {entry.country}</span>}
              </div>
              <h3 className="text-xl font-serif text-app-text mb-2 group-hover:text-app-accent transition-colors">{entry.name}</h3>
              <p className="text-app-muted text-sm leading-relaxed max-w-2xl">{entry.description}</p>
            </div>
            {entry.website && (
              <a href={entry.website} target="_blank" rel="noopener noreferrer" className="shrink-0 px-5 py-2.5 bg-app-bg border border-app-border rounded-xl text-sm font-bold text-app-text hover:bg-app-card hover:text-app-accent hover:border-app-accent transition-all flex items-center gap-2">
                Visiter le site <Loader2 className="w-3 h-3 group-hover:animate-pulse hidden" />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
