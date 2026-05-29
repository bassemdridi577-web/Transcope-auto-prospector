import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, Zap, Bot, User, Search } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('openai/gpt-oss-120b:free');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();

  // Detect if we are on an article page
  const articleId = location.pathname.startsWith('/article/') ? location.pathname.split('/')[2] : null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);
  useEffect(() => { if (isOpen) inputRef.current?.focus(); }, [isOpen]);

  // Handle external triggers (like Deep Intel button)
  useEffect(() => {
    const handleTrigger = (e: any) => {
      const { query, autoSend } = e.detail;
      setIsOpen(true);
      setInput(query);
      if (autoSend) {
        // We use a small timeout to ensure the state update for 'input' is processed
        setTimeout(() => {
          const btn = document.querySelector('#chat-send-button') as HTMLButtonElement;
          btn?.click();
        }, 100);
      }
    };

    window.addEventListener('open-chat-with-query', handleTrigger);
    return () => window.removeEventListener('open-chat-with-query', handleTrigger);
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: messages,
          articleId: articleId,
          model: selectedModel
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err: any) {
      console.error("[Chat] Request failed:", err);
      setMessages(prev => [...prev, { role: 'assistant', content: `Désolé, une erreur est survenue : ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Simple markdown-like formatting for bold and lists
  const formatMessage = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n- /g, '\n• ')
      .replace(/\n/g, '<br/>');
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-[90] w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl",
          isOpen
            ? "bg-app-card border border-app-border rotate-0"
            : "bg-gradient-to-br from-blue-500 to-indigo-600 hover:scale-110 hover:shadow-blue-500/40"
        )}
      >
        {isOpen
          ? <X className="w-5 h-5 text-app-muted" />
          : <MessageSquare className="w-6 h-6 text-white" />
        }
      </button>

      {/* Chat Panel */}
      <div className={cn(
        "fixed bottom-24 right-6 z-[90] w-[420px] max-h-[600px] rounded-2xl border border-app-border bg-app-card shadow-2xl shadow-black/40 flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right",
        isOpen ? "scale-100 opacity-100" : "scale-90 opacity-0 pointer-events-none"
      )}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">Assistant Transcope</h3>
            <p className="text-white/70 text-[11px]">Veille stratégique • Transformateurs</p>
          </div>
          <div className="ml-auto flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white/60 text-[10px]">En ligne</span>
            </div>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-white/10 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-white border border-white/20 font-medium outline-none cursor-pointer hover:bg-white/20 transition-colors"
            >
              <option value="openai/gpt-oss-120b:free" className="text-slate-900">GPT-120B</option>
              <option value="meta-llama/llama-3.3-70b-instruct:free" className="text-slate-900">Meta 3.3 70B</option>
              <option value="baidu/qianfan-ocr-fast:free" className="text-slate-900">Baidu OCR Fast</option>
              <option value="openrouter/free" className="text-slate-900"> free model(Auto)</option>
            </select>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[400px] custom-scrollbar">
          {messages.length === 0 && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto">
                <Zap className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <p className="text-app-text font-semibold text-sm mb-1">Bonjour ! 👋</p>
                <p className="text-app-muted text-xs leading-relaxed">
                  Je suis votre assistant IA. Posez-moi des questions sur vos données de veille stratégique.
                </p>
              </div>
              <div className="space-y-2">
                {[
                  "Quelles sont les dernières opportunités ?",
                  "Résume les actualités d'aujourd'hui",
                  "Quel est le cours du cuivre ?",
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(suggestion); }}
                    className="block w-full text-left text-xs bg-app-bg border border-app-border rounded-lg px-3 py-2 text-app-muted hover:text-app-text hover:border-blue-500/50 transition-all"
                  >
                    💡 {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={cn("flex gap-2.5", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                msg.role === 'user' ? "bg-blue-500" : "bg-indigo-500/20"
              )}>
                {msg.role === 'user'
                  ? <User className="w-3.5 h-3.5 text-white" />
                  : <Bot className="w-3.5 h-3.5 text-indigo-400" />
                }
              </div>
              <div className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed",
                msg.role === 'user'
                  ? "bg-blue-500 text-white rounded-br-md"
                  : "bg-app-bg border border-app-border text-app-text rounded-bl-md"
              )}>
                <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div className="bg-app-bg border border-app-border rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-app-muted animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-app-muted animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-app-muted animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-app-border bg-app-bg/50">
          <div className="flex items-center gap-2 bg-app-card border border-app-border rounded-xl px-3 py-1 focus-within:border-blue-500/50 transition-colors">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Posez votre question..."
              className="flex-1 bg-transparent text-sm text-app-text py-2 outline-none placeholder:text-app-muted/50"
              disabled={loading}
            />
            <button
              id="chat-send-button"
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="p-2 rounded-lg text-blue-400 hover:bg-blue-500/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-app-muted/50 text-center mt-2">
            Alimenté par openrouter/free • Données en temps réel
          </p>
        </div>
      </div>
    </>
  );
}
