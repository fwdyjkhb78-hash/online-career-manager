import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Crown, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STAFF_ROLES = ['owner', 'admin', 'staff_mercato', 'staff_championnat', 'staff_developpement', 'staff_formation'];
const STAFF_LABELS = {
  owner: 'Propriétaire', admin: 'Admin', staff_mercato: 'Mercato',
  staff_championnat: 'Championnat', staff_developpement: 'Développement',
  staff_formation: 'Formation', manager: 'Manager'
};

export default function ClubChat({ club, user }) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const bottomRef = useRef(null);

  const { data: rawMessages = [] } = useQuery({
    queryKey: ['club-messages', club?.id],
    queryFn: () => base44.entities.ClubMessage.filter({ club_id: club.id }, 'created_date', 100),
    enabled: !!club?.id,
    refetchInterval: 8000
  });

  // Déduplique les messages identiques (même auteur + même contenu) dans une fenêtre de 60s
  const messages = rawMessages.filter((msg, i, arr) => {
    return !arr.slice(0, i).some(prev =>
      prev.author_id === msg.author_id &&
      prev.content === msg.content &&
      Math.abs(new Date(msg.created_date) - new Date(prev.created_date)) < 60000
    );
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: () => base44.entities.ClubMessage.create({
      club_id: club.id,
      author_id: user.id,
      author_name: user.full_name,
      author_role: user.role || 'manager',
      content: content.trim(),
      is_staff: STAFF_ROLES.includes(user.role)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['club-messages', club.id] });
      setContent('');
    }
  });

  const handleSend = (e) => {
    e?.preventDefault();
    if (!content.trim()) return;
    sendMutation.mutate();
  };

  const isStaff = STAFF_ROLES.includes(user?.role);

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl flex flex-col h-[600px]">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-700/50">
        <MessageSquare className="w-5 h-5 text-cyan-400" />
        <div>
          <h3 className="text-white font-bold">Chat du Club</h3>
          <p className="text-slate-400 text-xs">Communication entre le manager et le staff</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Aucun message pour le moment</p>
            <p className="text-sm mt-1">Le staff peut vous écrire ici</p>
          </div>
        )}
        {messages.map(msg => {
          const isMe = msg.author_id === user?.id;
          const msgIsStaff = msg.is_staff;
          return (
            <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${msgIsStaff ? 'bg-amber-500/20' : 'bg-emerald-500/20'}`}>
                {msgIsStaff ? <Crown className="w-4 h-4 text-amber-400" /> : <span className="text-emerald-400 font-bold text-xs">{msg.author_name?.charAt(0)}</span>}
              </div>
              <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">{msg.author_name}</span>
                  {msgIsStaff && (
                    <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-400 border-amber-500/30">
                      {STAFF_LABELS[msg.author_role] || msg.author_role}
                    </Badge>
                  )}
                  <span className="text-[10px] text-slate-600">
                    {msg.created_date ? format(new Date(msg.created_date), 'dd/MM HH:mm') : ''}
                  </span>
                </div>
                <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-emerald-600/80 text-white rounded-tr-sm' : msgIsStaff ? 'bg-amber-500/10 border border-amber-500/20 text-white rounded-tl-sm' : 'bg-slate-700/70 text-white rounded-tl-sm'}`}>
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-slate-700/50">
        <form onSubmit={handleSend} className="flex gap-2">
          <Input
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Écrire un message..."
            className="bg-slate-700 border-slate-600 text-white flex-1"
          />
          <Button type="submit" disabled={!content.trim() || sendMutation.isPending}
            className="bg-emerald-500 hover:bg-emerald-600 shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}