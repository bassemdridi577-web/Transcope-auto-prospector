import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, MapPin, ExternalLink, Loader2, Rocket } from 'lucide-react';

export default function EventsPage() {
  const [filter, setFilter] = useState('All');
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/events?region=${filter}`)
      .then(res => res.json())
      .then(data => setEvents(data))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="space-y-8 fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-app-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CalendarIcon className="w-6 h-6 text-red-400" />
            <h1 className="text-3xl font-serif font-bold text-app-text">Événements de l'Industrie</h1>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-app-muted">Expositions, conférences et appels d'offres à venir.</p>
            <p className="text-xs text-red-400 flex items-center gap-1.5 font-medium">
              <Rocket className="w-3.5 h-3.5" /> Bénéfice : Ne manquez jamais une échéance critique pour un dépôt de dossier.
            </p>
          </div>
        </div>
        <div className="flex bg-app-card p-1 rounded-lg border border-app-border w-fit">
          {['All', 'Tunisia', 'Africa', 'World'].map(r => (
            <button key={r} onClick={() => setFilter(r)} className={`px-4 py-1.5 rounded-md text-sm transition-colors ${filter === r ? 'bg-app-accent text-white' : 'text-app-muted hover:text-app-text'}`}>
              {r === 'All' ? 'Tous' : r === 'Tunisia' ? 'Tunisie' : r === 'Africa' ? 'Afrique' : 'Monde'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="py-20 text-center text-app-muted flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin" />
            Chargement des événements...
          </div>
        ) : events.length === 0 ? (
          <div className="py-20 text-center text-app-muted bg-app-card rounded-xl border border-app-border">
            <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Aucun événement trouvé pour cette région.</p>
          </div>
        ) : events.map(event => (
          <a key={event.id} href={event.url} target="_blank" rel="noopener noreferrer" className="block group">
            <Card className="bg-app-card border-app-border group-hover:border-app-accent transition-colors overflow-hidden">
              <CardContent className="p-0 flex flex-col md:flex-row">
                <div className="p-6 md:w-48 bg-app-accent/10 border-r border-app-border flex flex-col justify-center items-center text-center">
                  <span className="text-sm text-app-accent font-semibold uppercase">{new Date(event.start_date).toLocaleString('fr-FR', { month: 'short' })}</span>
                  <span className="text-3xl font-light text-app-text my-1">{new Date(event.start_date).getDate()}</span>
                  <span className="text-xs text-app-muted">{new Date(event.start_date).getFullYear()}</span>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-center space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs bg-app-accent/20 text-app-accent border-none tracking-widest uppercase">Espace {event.region}</Badge>
                    </div>
                    <span className="text-xs text-app-accent group-hover:underline flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Consulter <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                  <h3 className="text-xl font-medium text-app-text group-hover:text-app-accent transition-colors">{event.name}</h3>
                  <div className="flex flex-wrap gap-4 text-sm text-app-muted">
                    <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {event.location}</div>
                    <div className="flex items-center gap-1.5"><CalendarIcon className="w-4 h-4" /> Jusqu'au {new Date(event.end_date).toLocaleDateString('fr-FR')}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
}
