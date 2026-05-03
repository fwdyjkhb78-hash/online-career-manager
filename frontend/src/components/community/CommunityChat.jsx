import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Loader2, Shield, Reply, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

export default function CommunityChat({ currentUser }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const bottomRef = useRef(null);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['community-users-online'],
    queryFn: () => base44.entities.User.list(),
    refetchInterval: 30000,
  });

  const isOnline = (userId) => {
    const u = allUsers.find(u => u.id === userId);
    if (!u?.last_seen) return false;
    return new Date() - new Date(u.last_seen) < 2 * 60 * 1000;
  };

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['community-messages'],
    queryFn: () => base44.entities.CommunityMessage.list('created_date', 100),
    refetchInterval: 8000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: () => base44.entities.CommunityMessage.create({
      author_id: currentUser.id,
      author_name: currentUser.full_name,
      author_pseudo: currentUser.site_pseudo || currentUser.full_name,
      author_club: currentUser.club_name || null,
      author_club_logo: currentUser.club_logo_url || null,
      content: text.trim(),
      reply_to_id: replyTo?.id || null,
      reply_to_name: replyTo?.author_pseudo || replyTo?.author_name || null,
    }),
    onSuccess: () => {
      setText('');
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ['community-messages'] });
    }
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (text.trim()) sendMutation.mutate();
  };

  const isOwnMessage = (msg) => msg.author_id === currentUser?.id;

  return (
    <div className="flex flex-col h-[600px] bg-slate-900/50 border border-slate-700/50 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/50 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <p className="text-white font-semibold text-sm">Chat Communauté</p>
        <span className="text-slate-500 text-xs ml-auto">{messages.length} messages</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-emerald-500 animate-spin" /></div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">Aucun message. Lancez la conversation !</div>
        ) : messages.map(msg => {
          const own = isOwnMessage(msg);
          return (
            <div key={msg.id} className={`flex gap-2 items-end ${own ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div className="relative w-7 h-7 shrink-0">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white">
                  {(msg.author_pseudo || msg.author_name)?.charAt(0)?.toUpperCase()}
                </div>
                {isOnline(msg.author_id) && (
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-slate-900" />
                )}
              </div>

              <div className={`max-w-[75%] space-y-1 ${own ? 'items-end' : 'items-start'} flex flex-col`}>
                {/* Name & club */}
                <div className={`flex items-center gap-1.5 text-xs ${own ? 'flex-row-reverse' : ''}`}>
                  <span className="text-slate-300 font-semibold">{msg.author_pseudo || msg.author_name}</span>
                  {msg.author_club && (
                    <span className="text-emerald-500 flex items-center gap-0.5">
                      <Shield className="w-2.5 h-2.5" />{msg.author_club}
                    </span>
                  )}
                  <span className="text-slate-600">
                    {msg.created_date ? format(new Date(msg.created_date), 'dd/MM HH:mm') : ''}
                  </span>
                </div>

                {/* Reply quote */}
                {msg.reply_to_id && (
                  <div className={`text-xs text-slate-500 border-l-2 border-slate-600 pl-2 ${own ? 'text-right border-r-2 border-l-0 pr-2 pl-0' : ''}`}>
                    Réponse à <span className="text-slate-400">{msg.reply_to_name}</span>
                  </div>
                )}

                {/* Bubble */}
                <div
                  className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    own
                      ? 'bg-emerald-600 text-white rounded-br-sm'
                      : 'bg-slate-700/80 text-slate-100 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>

                {/* Reply button */}
                {currentUser && (
                  <button
                    onClick={() => setReplyTo(msg)}
                    className="text-slate-600 hover:text-slate-400 text-xs flex items-center gap-1 transition-colors"
                  >
                    <Reply className="w-3 h-3" /> Répondre
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {currentUser ? (
        <form onSubmit={handleSend} className="border-t border-slate-700/50 bg-slate-800/50 p-3 space-y-2">
          {replyTo && (
            <div className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-1.5 text-xs text-slate-400">
              <Reply className="w-3 h-3" />
              <span>Répondre à <span className="text-white font-medium">{replyTo.author_pseudo || replyTo.author_name}</span></span>
              <button type="button" onClick={() => setReplyTo(null)} className="ml-auto hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Écrivez un message..."
              className="flex-1 bg-slate-700/50 border border-slate-600 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (text.trim()) sendMutation.mutate(); }}}
            />
            <Button type="submit" disabled={!text.trim() || sendMutation.isPending} className="bg-emerald-500 hover:bg-emerald-600 shrink-0 px-3">
              {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </form>
      ) : (
        <div className="border-t border-slate-700/50 p-3 text-center text-slate-500 text-sm">
          Connectez-vous pour écrire un message
        </div>
      )}
    </div>
  );
}