import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  Menu, X, Bookmark, Search, Zap, 
  Map, Globe, TrendingUp, Calendar, Newspaper,
  ChevronDown, Settings, Database, Beaker, FileText, Briefcase, Users, Rocket, Gavel
} from 'lucide-react';

import { cn } from './lib/utils';
import HomePage from './pages/HomePage';
import NewsPage from './pages/NewsPage';
import EventsPage from './pages/EventsPage';
import MaterialsPage from './pages/MaterialsPage';
import ReportsPage from './pages/ReportsPage';
import DirectoryPage from './pages/DirectoryPage';
import ArticleDetailPage from './pages/ArticleDetailPage';
import BookmarksPage from './pages/BookmarksPage';
import AboutPage from './pages/AboutPage';
import TestPage from './pages/TestPage';
import LogsPage from './pages/LogsPage';
import OpportunitiesPage from '@/pages/OpportunitiesPage';
import SearchConfigPage from '@/pages/SearchConfigPage';
import ProspectingPage from '@/pages/ProspectingPage';
import NotFoundPage from '@/pages/NotFoundPage';
import TendersPage from '@/pages/TendersPage';
import ChatWidget from '@/components/ChatWidget';

// Color theme variables configured in tailwind:
// Background: dark navy (#0B1121)
// Accent: electric blue (#0E75F5)
// Text: off-white (#E2E8F0)

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-app-bg text-app-text font-sans selection:bg-app-accent selection:text-white flex flex-col">
        <Navbar />
        <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 py-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/acceuil" element={<HomePage />} />
            <Route path="/accueil" element={<HomePage />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/materials" element={<MaterialsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/directory" element={<DirectoryPage />} />
            <Route path="/article/:id" element={<ArticleDetailPage />} />
            <Route path="/bookmarks" element={<BookmarksPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/opportunities" element={<OpportunitiesPage />} />
            <Route path="/tenders" element={<TendersPage />} />
            <Route path="/prospecting" element={<ProspectingPage />} />
            <Route path="/test" element={<TestPage />} />
            <Route path="/logs" element={<LogsPage />} />
            <Route path="/search-config" element={<SearchConfigPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <Footer />
        <ChatWidget />
      </div>
    </BrowserRouter>
  );
}

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const menuGroups = [
    { name: 'Accueil', path: '/' },
    { name: 'Opportunités', path: '/opportunities' },
    { name: 'Appels d\'Offres', path: '/tenders' },
    { name: 'Actualités', path: '/news' },
    {
      name: 'Intelligence',
      items: [
        { name: 'Rapports', path: '/reports', icon: <FileText className="w-4 h-4" /> },
        { name: 'Prospection IA', path: '/prospecting', icon: <Rocket className="w-4 h-4 text-indigo-400" /> },
        { name: 'Matières', path: '/materials', icon: <TrendingUp className="w-4 h-4" /> },
        { name: 'Événements', path: '/events', icon: <Calendar className="w-4 h-4" /> },
        { name: 'Annuaire', path: '/directory', icon: <Users className="w-4 h-4" /> },
      ]
    },
    {
      name: 'Admin IA',
      items: [
        { name: 'Configuration', path: '/search-config', icon: <Settings className="w-4 h-4" /> },
        { name: 'Historique IA', path: '/logs', icon: <Database className="w-4 h-4" /> },
        { name: 'Tests IA', path: '/test', icon: <Beaker className="w-4 h-4" /> },
      ]
    },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-app-border bg-app-bg/90 backdrop-blur-md">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12">
        <div className="flex justify-between h-[70px]">
          <div className="flex items-center gap-12 flex-1">
            <Link to="/" className="flex items-center gap-[10px] group shrink-0">
              <img src="/logo.png" alt="Transcope Logo" className="h-8 w-8 object-contain" />
              <span className="font-serif font-bold text-[20px] lg:text-[22px] tracking-[1px] text-app-text uppercase hidden sm:block">
                Tran<span className="text-app-accent">scope</span>
              </span>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-6 lg:gap-8 mr-12">
              {menuGroups.map((group, idx) => (
                group.items ? (
                  <NavDropdown key={idx} group={group} currentPath={location.pathname} />
                ) : (
                  <Link
                    key={group.path}
                    to={group.path!}
                    className={cn(
                      "text-[12px] lg:text-[13px] uppercase tracking-[1px] font-semibold transition-colors hover:text-app-accent whitespace-nowrap",
                      location.pathname === group.path ? "text-app-accent" : "text-app-muted"
                    )}
                  >
                    {group.name}
                  </Link>
                )
              ))}
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-12">
            <div className="bg-app-card border border-app-border rounded-full px-4 py-1.5 w-[200px] lg:w-[260px] flex items-center gap-[10px] text-[13px] text-app-muted focus-within:border-app-accent/50 transition-all">
              <Search className="w-4 h-4" />
              <input type="text" placeholder="Recherche globale..." className="bg-transparent border-none outline-none w-full text-app-text placeholder:text-app-muted/50" />
            </div>
            <Link to="/bookmarks" className="w-[36px] h-[36px] rounded-full border border-app-border flex items-center justify-center text-app-muted hover:text-app-accent hover:border-app-accent transition-all">
              <Bookmark className="h-4 w-4" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="text-app-muted hover:text-app-text"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Content */}
      {isOpen && (
        <div className="md:hidden border-t border-app-border bg-app-bg max-h-[80vh] overflow-y-auto">
          <div className="px-4 pt-2 pb-6 space-y-4">
            {menuGroups.map((group, idx) => (
              <div key={idx} className="space-y-2">
                {group.items ? (
                  <>
                    <div className="text-[11px] uppercase tracking-wider text-app-accent font-bold mt-4 mb-2">{group.name}</div>
                    {group.items.map(item => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                          location.pathname === item.path ? "text-app-accent bg-app-accent/10" : "text-app-muted hover:text-app-text hover:bg-app-card"
                        )}
                      >
                        {item.icon} {item.name}
                      </Link>
                    ))}
                  </>
                ) : (
                  <Link
                    to={group.path!}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "block px-3 py-2 rounded-md text-base font-medium transition-colors",
                      location.pathname === group.path ? "text-app-accent bg-app-accent/10" : "text-app-muted hover:text-app-text hover:bg-app-card"
                    )}
                  >
                    {group.name}
                  </Link>
                )}
              </div>
            ))}
            <div className="pt-4 border-t border-app-border">
              <Link 
                to="/bookmarks" 
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium text-app-muted hover:text-app-text hover:bg-app-card"
              >
                <Bookmark className="w-5 h-5" /> Signets
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

function NavDropdown({ group, currentPath }: { group: any, currentPath: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const isActive = group.items.some((item: any) => item.path === currentPath);

  return (
    <div 
      className="relative h-full flex items-center"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        className={cn(
          "flex items-center gap-1 text-[12px] lg:text-[13px] uppercase tracking-[1px] font-semibold transition-colors hover:text-app-accent whitespace-nowrap py-6",
          isActive ? "text-app-accent" : "text-app-muted"
        )}
      >
        {group.name}
        <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", isOpen ? "rotate-180" : "")} />
      </button>

      {/* Dropdown Card */}
      {isOpen && (
        <div className="absolute top-[70px] left-0 bg-app-card border border-app-border rounded-xl p-2 w-[220px] shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid gap-1">
            {group.items.map((item: any) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group/item",
                  currentPath === item.path 
                    ? "bg-app-accent/10 text-app-accent" 
                    : "text-app-muted hover:text-app-text hover:bg-white/5"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-md transition-colors",
                  currentPath === item.path ? "bg-app-accent/20 text-app-accent" : "bg-app-bg text-app-muted group-hover/item:text-app-accent"
                )}>
                  {item.icon}
                </div>
                <span className="font-medium">{item.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


function Footer() {
  return (
    <footer className="h-[40px] border-t border-app-border flex items-center justify-between px-[40px] text-[11px] text-app-muted mt-auto">
      <div>&copy; {new Date().getFullYear()} Transcope • Intelligence Artificielle</div>
      <div className="flex gap-[20px]">
        <span>Dernière mise à jour : {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
        <Link to="/about" className="hover:text-app-text transition-colors">Citations de sources (Actives)</Link>
      </div>
    </footer>
  );
}
