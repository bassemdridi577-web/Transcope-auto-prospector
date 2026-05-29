import React, { useEffect, useState } from 'react';
import { Terminal, Clock, Activity, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/logs')
      .then(res => res.json())
      .then(data => setLogs(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="border-b border-app-border pb-6">
        <h1 className="text-3xl font-serif font-bold text-app-text mb-2 flex items-center gap-3">
          <Terminal className="w-8 h-8 text-app-accent" />
          Historique d'Activité IA
        </h1>
        <p className="text-app-muted">Suivez les actions effectuées par les agents intelligents de Transcope en temps réel.</p>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center text-app-muted">Chargement des journaux...</div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center text-app-muted bg-app-card rounded-2xl border border-app-border">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Aucune activité enregistrée pour le moment.</p>
          </div>
        ) : logs.map((log) => (
          <Card key={log.id} className="bg-app-card border-app-border hover:border-app-accent/30 transition-all">
            <CardContent className="p-4 flex items-start gap-4">
              <div className={`p-2 rounded-lg shrink-0 ${
                log.action.includes('Error') ? 'bg-red-500/10 text-red-500' : 
                log.action === 'Search' ? 'bg-blue-500/10 text-blue-500' :
                'bg-green-500/10 text-green-500'
              }`}>
                {log.action.includes('Error') ? <AlertCircle className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-app-text text-sm uppercase tracking-wider">{log.action}</span>
                  <span className="text-xs text-app-muted flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {new Date(log.timestamp).toLocaleString('fr-FR')}
                  </span>
                </div>
                <p className="text-app-text text-sm mb-2">{log.description}</p>
                {log.details && Object.keys(log.details).length > 0 && (
                  <div className="bg-app-bg rounded-lg p-3 text-[12px] font-mono text-app-muted overflow-x-auto">
                    <pre>{JSON.stringify(log.details, null, 2)}</pre>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
