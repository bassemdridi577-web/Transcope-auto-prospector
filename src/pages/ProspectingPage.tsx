import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, Send, CheckCircle2, Clock, 
  MessageSquare, Briefcase, Zap, Rocket,
  ExternalLink, ChevronRight, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Prospect {
  id: number;
  company_name: string;
  opportunity_title: string;
  opportunity_summary: string;
  opportunity_region: string;
  pitch: string;
  contact_info?: string;
  status: string;
  created_at: string;
}

export default function ProspectingPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);

  const [prospectingEnabled, setProspectingEnabled] = useState(true);

  const loadSettings = () => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.prospecting_enabled !== undefined) {
          setProspectingEnabled(data.prospecting_enabled);
        }
      });
  };

  const loadData = async () => {
    try {
      const res = await fetch('/api/prospects');
      const data = await res.json();
      setProspects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    loadData(); 
    loadSettings();
  }, []);

  const toggleProspecting = async () => {
    const newValue = !prospectingEnabled;
    setProspectingEnabled(newValue);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'prospecting_enabled', value: newValue })
    });
  };

  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/prospects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    loadData();
  };

  const handleContact = (p: Prospect) => {
    const subject = encodeURIComponent(`Opportunité : ${p.opportunity_title}`);
    const body = encodeURIComponent(`Bonjour,\n\n${p.pitch}\n\nCordialement,\nL'équipe Tunisia Transformateurs`);
    
    // Open mailto
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    
    // Update status to Contacted if it was New
    if (p.status === 'New') {
      updateStatus(p.id, 'Contacted');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-app-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Rocket className="w-6 h-6 text-indigo-400" />
            <h1 className="text-3xl font-serif font-bold text-app-text">Prospection Automatisée</h1>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-app-muted">L'IA identifie les clients potentiels et génère des arguments de vente personnalisés.</p>
            <p className="text-xs text-indigo-400 flex items-center gap-1.5 font-medium">
              <Zap className="w-3.5 h-3.5" /> Bénéfice : Transformez les opportunités en ventes sans effort de rédaction.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleProspecting}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all font-bold text-xs uppercase tracking-wider ${
              prospectingEnabled 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20" 
                : "bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20"
            }`}
            title={prospectingEnabled ? "Désactiver la prospection IA automatique" : "Activer la prospection IA automatique"}
          >
            <Rocket className={`w-3.5 h-3.5 ${prospectingEnabled ? "animate-pulse" : ""}`} />
            {prospectingEnabled ? "Prospection IA: ACTIVE" : "Prospection IA: PAUSE"}
          </button>

          <div className="bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-xl text-indigo-400 text-sm font-bold flex items-center gap-2">
            <Activity className="w-4 h-4 animate-pulse" /> {prospects.length} Prospect{prospects.length > 1 ? 's' : ''} Détecté{prospects.length > 1 ? 's' : ''}
          </div>
        </div>
      </div>
      
      {!prospectingEnabled && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-400 animate-in slide-in-from-top-2 duration-300">
          <Zap className="w-5 h-5" />
          <div className="text-sm">
            <span className="font-bold">Prospection IA en pause.</span> Le système ne générera plus de nouveaux prospects pour économiser vos clés API. <strong>La détection des opportunités reste active.</strong>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-app-muted">
          <Loader2 className="w-8 h-8 animate-spin mr-3" /> Analyse des opportunités...
        </div>
      ) : prospects.length === 0 ? (
        <div className="py-20 text-center bg-app-card border border-app-border rounded-2xl">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-20 text-indigo-400" />
          <h3 className="text-xl font-serif text-app-text mb-2">Aucun prospect pour le moment</h3>
          <p className="text-app-muted">Le système générera des pistes dès que de nouvelles opportunités seront détectées.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {prospects.map((p) => (
            <Card key={p.id} className="bg-app-card border-app-border hover:border-indigo-500/30 transition-all overflow-hidden">
              <div className="flex flex-col lg:flex-row">
                {/* Left Side: Target Info */}
                <div className="lg:w-1/3 p-6 bg-app-bg/50 border-r border-app-border space-y-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold mb-1">Cible de Prospection</div>
                    <h3 className="text-xl font-bold text-app-text">{p.company_name}</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Briefcase className="w-4 h-4 text-app-muted mt-1 shrink-0" />
                      <div>
                        <div className="text-[11px] text-app-muted font-bold uppercase">Opportunité Liée</div>
                        <div className="text-sm text-app-text line-clamp-2">{p.opportunity_title}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-app-muted shrink-0" />
                      <div className="text-xs text-app-muted">Détecté le {new Date(p.created_at).toLocaleDateString('fr-FR')}</div>
                    </div>
                    {p.contact_info && (
                      <div className="flex items-start gap-3 text-indigo-400">
                        <ExternalLink className="w-4 h-4 mt-1 shrink-0" />
                        <div>
                          <div className="text-[11px] font-bold uppercase">Contact Suggéré</div>
                          <div className="text-xs break-all">{p.contact_info}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-4">
                    <div className="text-[11px] text-app-muted font-bold uppercase mb-2">Statut</div>
                    <div className="flex gap-2">
                      {['New', 'Contacted', 'Interested'].map(s => (
                        <button
                          key={s}
                          onClick={() => updateStatus(p.id, s)}
                          className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase border transition-all",
                            p.status === s 
                              ? "bg-indigo-500 text-white border-indigo-500" 
                              : "bg-app-bg text-app-muted border-app-border hover:border-indigo-500/50"
                          )}
                        >
                          {s === 'New' ? 'Nouveau' : s === 'Contacted' ? 'Contacté' : 'Intéressé'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Side: Pitch & Action */}
                <div className="lg:w-2/3 p-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-indigo-400">
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Argumentaire IA Personnalisé</span>
                    </div>
                    <div className="bg-app-bg/30 p-5 rounded-xl border border-app-border italic text-app-text/90 leading-relaxed relative">
                      <span className="absolute -top-3 -left-2 text-4xl text-indigo-500/20 font-serif">"</span>
                      {p.pitch}
                      <span className="absolute -bottom-6 -right-2 text-4xl text-indigo-500/20 font-serif rotate-180">"</span>
                    </div>

                    {p.contact_info && (
                      <div className="mt-4 flex items-center gap-3 bg-indigo-500/10 p-4 rounded-xl border border-indigo-500/20 text-indigo-400 shadow-lg shadow-indigo-500/5">
                        <ExternalLink className="w-5 h-5 shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Contact Direct Suggéré</span>
                          <span className="text-sm font-mono font-bold">{p.contact_info}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-8 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px] text-app-muted">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Basé sur l'expertise de <strong>Tunisia Transformateurs</strong>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedProspect(p);
                        if (p.status === 'New') updateStatus(p.id, 'Contacted');
                      }}
                      className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
                    >
                      <Send className="w-4 h-4" /> Préparer le message
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Message Composer Modal */}
      {selectedProspect && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-app-card border border-app-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-app-border flex justify-between items-center bg-indigo-500/5">
              <h2 className="text-xl font-bold text-app-text flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-400" /> Préparation de l'email
              </h2>
              <button onClick={() => setSelectedProspect(null)} className="text-app-muted hover:text-app-text transition-colors">
                <Zap className="w-5 h-5 rotate-45" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-app-muted block mb-1">Destinataire Suggéré</label>
                <div className="bg-app-bg p-3 rounded-lg border border-app-border text-app-text font-mono text-sm flex justify-between items-center">
                  {selectedProspect.contact_info || "Contact non spécifié"}
                  {selectedProspect.contact_info && (
                    <button 
                      onClick={() => navigator.clipboard.writeText(selectedProspect.contact_info!)}
                      className="text-indigo-400 hover:text-indigo-300 text-xs font-bold"
                    >
                      Copier
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-app-muted block mb-1">Objet de l'email</label>
                <div className="bg-app-bg p-3 rounded-lg border border-app-border text-app-text text-sm">
                  Opportunité : {selectedProspect.opportunity_title}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-app-muted block mb-1">Corps du message</label>
                <textarea 
                  className="w-full h-64 bg-app-bg p-4 rounded-xl border border-app-border text-app-text text-sm leading-relaxed focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                  defaultValue={`Bonjour,\n\n${selectedProspect.pitch}\n\nCordialement,\nL'équipe Tunisia Transformateurs`}
                />
              </div>
            </div>

            <div className="p-6 bg-app-bg/50 border-t border-app-border flex justify-between items-center">
              <p className="text-[11px] text-app-muted italic">Copiez ce texte et collez-le dans votre client de messagerie.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setSelectedProspect(null)}
                  className="px-6 py-2 rounded-lg text-app-muted font-bold text-sm hover:bg-app-bg transition-colors"
                >
                  Fermer
                </button>
                <button 
                  onClick={() => {
                    const text = `Objet : Opportunité : ${selectedProspect.opportunity_title}\n\nBonjour,\n\n${selectedProspect.pitch}\n\nCordialement,\nL'équipe Tunisia Transformateurs`;
                    navigator.clipboard.writeText(text);
                    alert("Message copié dans le presse-papier !");
                  }}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold text-sm transition-all"
                >
                  Tout Copier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Activity(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  )
}
