import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Bookmark, ArrowRight, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<any[]>([]);

  useEffect(() => {
    const list = JSON.parse(localStorage.getItem('bookmarks') || '[]');
    setBookmarks(list);
  }, []);

  const removeBookmark = (id: string) => {
    const next = bookmarks.filter(b => b.id !== id);
    setBookmarks(next);
    localStorage.setItem('bookmarks', JSON.stringify(next));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="border-b border-app-border pb-6">
        <h1 className="text-3xl font-serif font-bold text-app-text mb-2 flex items-center gap-3">
          <Bookmark className="w-8 h-8 text-app-accent" />
          Éléments Enregistrés
        </h1>
        <p className="text-app-muted">Votre liste de lecture personnelle. Enregistrée localement dans votre navigateur.</p>
      </div>

      {bookmarks.length === 0 ? (
        <div className="text-center py-20 bg-app-card rounded-2xl border border-app-border">
          <Bookmark className="w-12 h-12 text-app-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-app-text mb-2">Aucun signet pour le moment</h3>
          <p className="text-app-muted text-sm">Enregistrez des articles, des rapports et des événements pour les lire plus tard.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {bookmarks.map(item => (
            <Card key={item.id} className="bg-app-card border-app-border hover:border-app-accent transition-colors">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-sm bg-app-bg text-app-muted">{item.type || 'Article'}</span>
                    <span className="text-xs text-app-muted font-mono">
                      {new Date(item.date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <Link to={`/article/${item.id}`} className="text-lg font-serif font-medium text-app-text hover:text-app-accent transition-colors line-clamp-1">
                    {item.title}
                  </Link>
                </div>
                <div className="flex items-center gap-3">
                  <Link to={`/article/${item.id}`} className="p-2 text-app-muted hover:text-app-text transition-colors">
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <button onClick={() => removeBookmark(item.id)} className="p-2 text-app-muted hover:text-red-400 transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
