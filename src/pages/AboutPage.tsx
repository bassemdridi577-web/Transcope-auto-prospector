import React from 'react';
import { 
  ShieldAlert, Sparkles, Briefcase, Newspaper, 
  Calendar, TrendingUp, BookOpen, Users, 
  Target, Rocket, CheckCircle2 
} from 'lucide-react';

export default function AboutPage() {
  const modules = [
    {
      title: "Opportunités",
      icon: <Briefcase className="w-5 h-5 text-blue-400" />,
      data: "Appels d'offres de la STEG, SONELGAZ, et agences africaines.",
      benefit: "Générez du revenu en détectant les marchés avant la concurrence.",
      color: "border-blue-500/20 bg-blue-500/5"
    },
    {
      title: "Actualités",
      icon: <Newspaper className="w-5 h-5 text-emerald-400" />,
      data: "Actualités sectorielles, mouvements de SACEM et autres concurrents.",
      benefit: "Anticipez les tendances du marché et surveillez vos rivaux.",
      color: "border-emerald-500/20 bg-emerald-500/5"
    },
    {
      title: "Matières Premières",
      icon: <TrendingUp className="w-5 h-5 text-amber-400" />,
      data: "Prix du Cuivre, Aluminium, Acier Silicium et Huile.",
      benefit: "Optimisez vos coûts d'achat et ajustez vos devis en temps réel.",
      color: "border-amber-500/20 bg-amber-500/5"
    },
    {
      title: "Rapports IA",
      icon: <BookOpen className="w-5 h-5 text-purple-400" />,
      data: "Synthèses stratégiques générées par Gemini sur des thèmes précis.",
      benefit: "Prenez des décisions de haut niveau sans lire des centaines d'articles.",
      color: "border-purple-500/20 bg-purple-500/5"
    },
    {
      title: "Événements",
      icon: <Calendar className="w-5 h-5 text-red-400" />,
      data: "Dates limites d'appels d'offres, salons et conférences.",
      benefit: "Ne manquez jamais une échéance critique pour un dépôt de dossier.",
      color: "border-red-500/20 bg-red-500/5"
    },
    {
      title: "Annuaire",
      icon: <Users className="w-5 h-5 text-cyan-400" />,
      data: "Base de données des fabricants, EPC et décideurs.",
      benefit: "Identifiez de nouveaux partenaires ou cibles commerciales.",
      color: "border-cyan-500/20 bg-cyan-500/5"
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-700">
      <header className="text-center space-y-4 py-8">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-white leading-tight">
          Guide Stratégique <span className="text-app-accent">Transcope</span>
        </h1>
        <p className="text-xl text-app-muted max-w-2xl mx-auto">
          Comment transformer l'intelligence artificielle en avantages compétitifs pour Tunisie Transformateurs.
        </p>
      </header>

      <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((m, idx) => (
          <div key={idx} className={`p-6 rounded-2xl border ${m.color} space-y-4 hover:scale-[1.02] transition-transform`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-black/20 rounded-lg">{m.icon}</div>
              <h3 className="text-lg font-bold text-white">{m.title}</h3>
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Target className="w-4 h-4 text-app-muted shrink-0 mt-1" />
                <p className="text-sm text-app-muted"><span className="text-white font-medium">Données :</span> {m.data}</p>
              </div>
              <div className="flex gap-2">
                <Rocket className="w-4 h-4 text-app-accent shrink-0 mt-1" />
                <p className="text-sm text-app-muted"><span className="text-app-accent font-medium">Bénéfice :</span> {m.benefit}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="bg-app-card border border-app-border rounded-3xl p-8 md:p-12 space-y-8">
        <div className="flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1 space-y-4">
            <h2 className="text-3xl font-serif font-bold text-white">Pourquoi utiliser Transcope au quotidien ?</h2>
            <p className="text-app-muted leading-relaxed">
              Dans un marché de plus en plus concurrentiel (SACEM, importations, etc.), l'accès à l'information en temps réel n'est plus un luxe, c'est une nécessité de survie.
            </p>
            <div className="space-y-3 pt-4">
              {[
                "Gain de temps massif sur la veille technologique",
                "Réduction des risques liés à la volatilité des matières premières",
                "Détection proactive des opportunités de vente à l'export",
                "Suivi précis des mouvements de la concurrence"
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-app-muted">
                  <CheckCircle2 className="w-5 h-5 text-app-accent" />
                  {text}
                </div>
              ))}
            </div>
          </div>
          <div className="w-full md:w-[300px] h-[300px] bg-gradient-to-br from-app-accent/20 to-purple-500/20 rounded-2xl flex items-center justify-center border border-white/5">
            <Sparkles className="w-24 h-24 text-app-accent animate-pulse" />
          </div>
        </div>
      </section>

      <footer className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl flex gap-4 items-start">
        <ShieldAlert className="w-6 h-6 text-amber-500 shrink-0 mt-1" />
        <div>
          <h4 className="text-amber-500 font-bold mb-1 uppercase text-xs tracking-wider">Note sur la Fiabilité</h4>
          <p className="text-sm text-app-muted leading-relaxed">
            Toutes les analyses sont générées par l'IA Google Gemini à partir de données web réelles. Bien que l'IA soit extrêmement performante, vérifiez toujours les liens sources fournis au bas de chaque article avant de prendre une décision contractuelle majeure.
          </p>
        </div>
      </footer>
    </div>
  );
}

