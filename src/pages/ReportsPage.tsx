import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Download, Rocket } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/articles?type=report')
      .then(res => res.json())
      .then(data => setReports(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8 fade-in duration-500">
      <div className="border-b border-app-border pb-6">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-6 h-6 text-purple-400" />
          <h1 className="text-3xl font-serif font-bold text-app-text">Rapports de Marché</h1>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-app-muted">Analyses approfondies synthétisées par IA, mises à jour chaque semaine.</p>
          <p className="text-xs text-purple-400 flex items-center gap-1.5 font-medium">
            <Rocket className="w-3.5 h-3.5" /> Bénéfice : Prenez des décisions de haut niveau sans lire des centaines d'articles.
          </p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full py-20 text-center text-app-muted">Chargement des rapports...</div>
        ) : reports.length === 0 ? (
          <div className="col-span-full py-20 text-center text-app-muted bg-app-card rounded-2xl border border-app-border">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Aucun rapport disponible pour le moment.</p>
          </div>
        ) : reports.map((report, idx) => (
          <Link key={idx} to={`/article/${report.id}`} className="block group h-full">
            <Card className="bg-app-card border-app-border group-hover:border-app-accent/50 transition-all flex flex-col h-full rounded-2xl">
              <CardContent className="p-6 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 bg-app-accent/10 rounded-xl flex items-center justify-center text-app-accent">
                    <FileText className="w-6 h-6" />
                  </div>
                  {(new Date().getTime() - new Date(report.published_at).getTime()) < (48 * 60 * 60 * 1000) && (
                    <div className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] uppercase font-bold animate-pulse">
                      Nouveau
                    </div>
                  )}
                </div>
                <div className="text-xs text-app-accent font-semibold mb-2 uppercase tracking-wider">
                  RAPPORT • {new Date(report.published_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </div>
                <h3 className="text-xl font-serif leading-tight text-app-text mb-4 flex-1 group-hover:text-app-accent transition-colors line-clamp-3">
                  {report.title}
                </h3>
                <div className="flex items-center justify-between text-sm mt-4 pt-4 border-t border-app-border">
                  <span className="text-app-muted bg-app-bg px-2 py-0.5 rounded border border-app-border text-[10px] uppercase font-bold tracking-tight">
                    {report.region || 'Monde'}
                  </span>
                  <span className="flex items-center text-app-accent group-hover:underline font-bold">
                    <Download className="w-4 h-4 mr-1" /> Consulter
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
