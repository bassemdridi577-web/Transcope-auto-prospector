import React from 'react';
import { Link } from 'react-router-dom';
import { Home, AlertTriangle, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-[70vh] overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-4xl max-h-[500px] opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-app-accent to-indigo-500 blur-[120px] rounded-full animate-pulse" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-4 animate-in fade-in zoom-in duration-1000">
        <div className="mb-6 relative">
          <div className="absolute -inset-4 bg-app-accent/20 blur-xl rounded-full animate-ping opacity-20" />
          <AlertTriangle className="w-24 h-24 text-app-accent relative" />
        </div>
        
        <div className="relative mb-4">
          <h1 className="font-serif text-[120px] md:text-[180px] font-bold leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20 select-none">
            404
          </h1>
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
            <span className="font-serif text-3xl md:text-4xl font-bold text-app-accent/80 tracking-widest uppercase mt-20">
              Perdu dans le réseau
            </span>
          </div>
        </div>
        
        <h2 className="text-2xl md:text-3xl font-serif text-app-text mb-6">
          Destination Inexistante
        </h2>
        
        <p className="text-app-muted max-w-xl mb-12 text-lg leading-relaxed">
          Le chemin que vous avez emprunté n'aboutit à aucune donnée. 
          Notre système d'intelligence stratégique n'a pas pu indexer cette URL.
        </p>
        
        <div className="flex flex-wrap gap-6 justify-center">
          <Link 
            to="/" 
            className="group relative bg-app-accent text-white py-4 px-10 rounded-xl font-bold transition-all hover:scale-105 overflow-hidden shadow-[0_0_20px_rgba(14,117,245,0.3)]"
          >
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-12" />
            <div className="flex items-center gap-3 relative z-10">
              <Home className="w-5 h-5" /> 
              <span>Retour à l'accueil</span>
            </div>
          </Link>
          
          <button 
            onClick={() => window.history.back()}
            className="flex items-center gap-3 bg-white/5 text-app-text border border-app-border py-4 px-10 rounded-xl font-bold hover:bg-white/10 hover:border-app-accent/50 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Page précédente</span>
          </button>
        </div>

        <div className="mt-20 flex flex-wrap justify-center gap-4 opacity-40">
          <div className="px-6 py-2 border border-app-border rounded-full text-[10px] uppercase tracking-widest bg-app-card">
            Err_Path_Unresolved
          </div>
          <div className="px-6 py-2 border border-app-border rounded-full text-[10px] uppercase tracking-widest bg-app-card">
            System_Status_Active
          </div>
          <div className="px-6 py-2 border border-app-border rounded-full text-[10px] uppercase tracking-widest bg-app-card">
            AI_Index_Missing
          </div>
        </div>
      </div>
    </div>
  );
}

