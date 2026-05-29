import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Bookmark, ArrowLeft, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { decodeHtmlEntities } from '@/lib/utils';
import SafeImage from '@/components/SafeImage';

export default function ArticleDetailPage() {
  const { id } = useParams();
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    fetch(`/api/articles/${id}`)
      .then(res => res.json())
      .then(data => {
        setArticle(data);
        const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
        setBookmarked(bookmarks.some((b: any) => b.id === data.id));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const toggleBookmark = () => {
    if (!article) return;
    const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
    if (bookmarked) {
      localStorage.setItem('bookmarks', JSON.stringify(bookmarks.filter((b: any) => b.id !== article.id)));
    } else {
      localStorage.setItem('bookmarks', JSON.stringify([...bookmarks, { id: article.id, title: article.title, type: article.type, date: article.published_at }]));
    }
    setBookmarked(!bookmarked);
  };

  if (loading) return <div className="py-20 text-center text-slate-400">Chargement...</div>;
  if (!article || article.error) return <div className="py-20 text-center text-red-400">Article non trouvé.</div>;

  return (
    <article className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <Link 
        to={article.type === 'opportunities' ? '/opportunities' : article.type === 'tenders' ? '/tenders' : article.type === 'materials' ? '/materials' : '/news'} 
        className="inline-flex items-center text-sm text-app-accent hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Retour aux {article.type === 'opportunities' ? 'opportunités' : article.type === 'tenders' ? 'appels d\'offres' : article.type === 'materials' ? 'matières' : 'actualités'}
      </Link>
      
      <header className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-[3px] uppercase tag-${article.region.toLowerCase()}`}>
              {article.region}
            </span>
            <span className="font-mono text-[12px] text-app-muted">
              {new Date(article.published_at).toLocaleString('fr-FR', { 
                day: '2-digit', month: '2-digit', year: 'numeric', 
                hour: '2-digit', minute: '2-digit' 
              })}
            </span>
          </div>
          <div className="w-[32px] h-[32px] rounded-full border border-app-border flex items-center justify-center text-app-muted hover:text-app-text cursor-pointer transition-colors" onClick={toggleBookmark}>
            <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-current text-app-accent' : ''}`} />
          </div>
        </div>
        <h1 className="font-serif text-4xl md:text-5xl font-bold leading-tight text-app-text">{decodeHtmlEntities(article.title)}</h1>
        <p className="text-xl text-app-muted border-l-[3px] border-app-accent pl-4">{decodeHtmlEntities(article.summary)}</p>
      </header>

      {article.image_url && (
        <figure className="w-full h-[400px] rounded-xl overflow-hidden border border-app-border">
          <SafeImage src={article.image_url} alt={article.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
        </figure>
      )}

      <div className="markdown-body max-w-none text-app-text font-sans leading-relaxed">
        <ReactMarkdown>
          {(article.body || "")
            .replace(/\\n/g, '\n')
            .replace(/## /g, '\n\n## ')
            .replace(/### /g, '\n\n### ')
            .trim()}
        </ReactMarkdown>
      </div>

      {article.type === 'opportunities' && article.sources?.length > 0 && (
        <div className="bg-blue-600/10 border border-blue-600/30 p-6 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 mt-12">
          <div>
            <h3 className="text-app-text font-bold text-lg">Prêt à agir sur cette opportunité ?</h3>
            <p className="text-sm text-app-muted">Consultez les détails officiels ou soumettez votre dossier via le lien source.</p>
          </div>
          <a 
            href={article.sources[0]} 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-6 py-3 bg-app-accent text-white rounded-lg font-bold hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            Consulter l'offre <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}

      {article.type === 'tenders' && article.sources?.length > 0 && (
        <div className="bg-amber-600/10 border border-amber-600/30 p-6 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 mt-12">
          <div>
            <h3 className="text-amber-200 font-bold text-lg">Détails de l'Appel d'Offre</h3>
            <p className="text-sm text-app-muted">Cet appel d'offre a été détecté et vérifié par l'IA. Accédez au portail officiel pour consulter le cahier des charges.</p>
          </div>
          <a 
            href={article.sources[0]} 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-6 py-3 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-500 transition-colors flex items-center gap-2 shadow-lg shadow-amber-900/20"
          >
            Voir l'appel d'offre <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}

      <div className="border-t border-app-border pt-8 mt-12 space-y-4">
        <h3 className="font-serif text-xl text-app-text">Sources & Citations</h3>
        <ul className="space-y-2">
          {article.sources?.map((source: string, idx: number) => (
            <li key={idx}>
              <a href={source} target="_blank" rel="noopener noreferrer" className="flex items-center text-[12px] text-app-accent hover:underline">
                <ExternalLink className="w-3 h-3 mr-2" />
                {source}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
