import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquare, Send, Smile, Frown, Meh, Zap, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

const EMOTION_CONFIG = {
  happy:   { icon: Smile, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', label: 'Content' },
  excited: { icon: Zap,   color: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/30',   label: 'Survolté' },
  neutral: { icon: Meh,   color: 'text-slate-400',   bg: 'bg-slate-500/10 border-slate-500/30',     label: 'Neutre' },
  unhappy: { icon: Frown, color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/30',   label: 'Insatisfait' },
  angry:   { icon: Frown, color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30',         label: 'En colère' },
};

const TYPE_LABELS = {
  transfer_request: '🚪 Demande de départ',
  playtime:         '⏱️ Temps de jeu',
  captain:          '🏅 Brassard capitaine',
  contract:         '📄 Contrat',
  morale:           '💬 Moral',
  match_reaction:   '⚽ Réaction match',
  form:             '📈 Forme',
};

const MORALE_BAR_COLOR = (m) =>
  m >= 80 ? 'bg-emerald-500' : m >= 60 ? 'bg-yellow-500' : m >= 40 ? 'bg-orange-500' : 'bg-red-500';

function PlayerMessageCard({ msg, onReply, onMarkRead }) {
  const [open, setOpen] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [aiReplies, setAiReplies] = useState(null);
  const [sending, setSending] = useState(false);
  const emotion = EMOTION_CONFIG[msg.emotion] || EMOTION_CONFIG.neutral;
  const EmotionIcon = emotion.icon;

  const generateReplies = async () => {
    setLoadingReplies(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Tu es le manager d'un club de football FIFA. Un joueur (${msg.player_name}, ${msg.player_position}) t'envoie ce message : "${msg.content}". Génère 3 réponses courtes (2-3 phrases max) en tant que manager, en français, dans 3 tons différents.`,
      response_json_schema: {
        type: 'object',
        properties: {
          positive: { type: 'string', description: 'Réponse positive/encourageante qui satisfait le joueur' },
          neutral:  { type: 'string', description: 'Réponse neutre/diplomatique' },
          negative: { type: 'string', description: 'Réponse ferme/négative qui déçoit le joueur' },
        }
      }
    });
    setAiReplies(result);
    setLoadingReplies(false);
  };

  const handleSendReply = async (text, tone) => {
    setSending(true);
    await onReply(msg.id, text, tone);
    setSending(false);
    setOpen(false);
    setAiReplies(null);
  };

  return (
    <div
      className={`rounded-2xl border p-4 transition-all ${msg.is_read ? 'bg-slate-900/50 border-slate-800' : `${emotion.bg} border`} ${!msg.is_read ? 'shadow-lg' : ''}`}
      onClick={() => !msg.is_read && onMarkRead(msg.id)}
    >
      <div className="flex items-start gap-3">
        {/* Avatar joueur */}
        <div className="shrink-0">
          {msg.player_image_url ? (
            <img src={msg.player_image_url} alt={msg.player_name} className="w-11 h-11 rounded-full object-cover border-2 border-slate-600" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
              <span className="text-white font-bold text-sm">{msg.player_overall || '?'}</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
            <div className="flex items-center gap-2">
              <p className="text-white font-bold text-sm">{msg.player_name}</p>
              <span className="text-slate-500 text-xs">{msg.player_position}</span>
              {!msg.is_read && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{TYPE_LABELS[msg.message_type] || msg.message_type}</span>
              <EmotionIcon className={`w-4 h-4 ${emotion.color}`} />
            </div>
          </div>

          {/* Moral bar */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-slate-500">Moral</span>
            <div className="flex-1 bg-slate-700 rounded-full h-1.5 max-w-24">
              <div className={`h-1.5 rounded-full ${MORALE_BAR_COLOR(msg.morale || 50)} transition-all`}
                style={{ width: `${msg.morale || 50}%` }} />
            </div>
            <span className={`text-xs font-bold ${emotion.color}`}>{emotion.label}</span>
          </div>

          {/* Message */}
          <p className="text-slate-200 text-sm leading-relaxed italic">"{msg.content}"</p>

          {/* Reply section */}
          {msg.manager_reply && (
            <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <p className="text-xs text-emerald-400 font-semibold mb-1">Votre réponse :</p>
              <p className="text-slate-300 text-sm">{msg.manager_reply}</p>
            </div>
          )}

          {!msg.manager_reply && (
            <div className="mt-3">
              <button
                onClick={(e) => { e.stopPropagation(); if (!open) { setOpen(true); generateReplies(); } else { setOpen(false); setAiReplies(null); } }}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
              >
                {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {open ? 'Masquer' : 'Répondre au joueur'}
              </button>
              {open && (
                <div className="mt-2">
                  {loadingReplies ? (
                    <div className="flex items-center gap-2 py-3">
                      <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                      <span className="text-slate-400 text-xs">Génération des réponses...</span>
                    </div>
                  ) : aiReplies ? (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500 mb-2">Choisissez votre réponse :</p>
                      <button
                        disabled={sending}
                        onClick={e => { e.stopPropagation(); handleSendReply(aiReplies.positive, 'positive'); }}
                        className="w-full text-left p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all text-xs text-emerald-300 leading-relaxed"
                      >
                        <span className="font-bold block mb-0.5">😊 Positive</span>
                        {aiReplies.positive}
                      </button>
                      <button
                        disabled={sending}
                        onClick={e => { e.stopPropagation(); handleSendReply(aiReplies.neutral, 'neutral'); }}
                        className="w-full text-left p-2.5 rounded-xl bg-slate-700/50 border border-slate-600 hover:bg-slate-700 transition-all text-xs text-slate-300 leading-relaxed"
                      >
                        <span className="font-bold block mb-0.5">😐 Neutre</span>
                        {aiReplies.neutral}
                      </button>
                      <button
                        disabled={sending}
                        onClick={e => { e.stopPropagation(); handleSendReply(aiReplies.negative, 'negative'); }}
                        className="w-full text-left p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-all text-xs text-red-300 leading-relaxed"
                      >
                        <span className="font-bold block mb-0.5">😤 Négative</span>
                        {aiReplies.negative}
                      </button>
                      {sending && <div className="flex justify-center py-1"><Loader2 className="w-4 h-4 text-slate-400 animate-spin" /></div>}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PlayerMessagesPanel({ club, players }) {
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['player-messages', club?.id],
    queryFn: () => base44.entities.PlayerMessage.filter({ club_id: club?.id }, '-created_date', 30),
    enabled: !!club?.id,
    refetchInterval: 60000,
  });

  const unreadCount = messages.filter(m => !m.is_read).length;

  const markRead = useMutation({
    mutationFn: (id) => base44.entities.PlayerMessage.update(id, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['player-messages', club?.id] }),
  });

  const replyMutation = useMutation({
    mutationFn: async ({ id, text, tone, msg }) => {
      // Calculate new morale based on reply tone
      const currentMorale = msg?.morale || 50;
      let moraleChange = 0;
      let newEmotion = msg?.emotion || 'neutral';
      if (tone === 'positive') {
        moraleChange = Math.floor(Math.random() * 11) + 10; // +10 to +20
        if (currentMorale + moraleChange >= 70) newEmotion = 'happy';
        else if (currentMorale + moraleChange >= 50) newEmotion = 'neutral';
      } else if (tone === 'neutral') {
        moraleChange = Math.floor(Math.random() * 7) - 3; // -3 to +3
      } else if (tone === 'negative') {
        moraleChange = -(Math.floor(Math.random() * 11) + 10); // -10 to -20
        if (currentMorale + moraleChange <= 30) newEmotion = 'angry';
        else if (currentMorale + moraleChange <= 50) newEmotion = 'unhappy';
      }
      const newMorale = Math.max(0, Math.min(100, currentMorale + moraleChange));

      await base44.entities.PlayerMessage.update(id, {
        manager_reply: text,
        replied_at: new Date().toISOString(),
        is_read: true,
        morale: newMorale,
        emotion: newEmotion,
      });

      // Auto transfer list logic based on NEW morale
      if (newMorale <= 15) {
        const playerData = players.find(p => p.id === msg.player_id);
        if (playerData) {
          await base44.entities.Player.update(msg.player_id, {
            is_on_transfer_list: true,
            asking_price: 0,
          });
        }
      } else if (newMorale <= 30) {
        await base44.entities.Player.update(msg.player_id, {
          is_on_transfer_list: true,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['player-messages', club?.id] }),
  });

  // Messages d'alerte moral bas
  const lowMoraleMessages = messages.filter(m => !m.is_read && (m.morale || 75) <= 30);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-white font-bold">Messages des Joueurs</h3>
          <p className="text-slate-400 text-xs">{unreadCount > 0 ? `${unreadCount} non lu${unreadCount > 1 ? 's' : ''}` : 'Tout lu'}</p>
        </div>
      </div>

      {/* Alertes moral bas */}
      {lowMoraleMessages.length > 0 && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-300 text-xs leading-relaxed">
            <span className="font-bold">{lowMoraleMessages.length} joueur{lowMoraleMessages.length > 1 ? 's' : ''} en détresse</span> — Le moral est critique. Si vous répondez négativement, ils seront automatiquement mis sur la liste des transferts (ou en vente libre si moral &le; 15).
          </p>
        </div>
      )}

      {/* Morale overview */}
      {messages.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {(['happy', 'neutral', 'unhappy'] ).map(em => {
            const count = messages.filter(m => m.emotion === em || (em === 'unhappy' && m.emotion === 'angry')).length;
            const cfg = EMOTION_CONFIG[em];
            return (
              <div key={em} className={`rounded-xl border p-3 text-center ${cfg.bg}`}>
                <cfg.icon className={`w-5 h-5 mx-auto mb-1 ${cfg.color}`} />
                <p className={`text-lg font-bold ${cfg.color}`}>{count}</p>
                <p className="text-slate-500 text-xs">{cfg.label}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Messages list */}
      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-purple-400 animate-spin" /></div>
      ) : messages.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-700" />
          <p className="text-slate-500">Aucun message de vos joueurs</p>
          <p className="text-slate-600 text-sm mt-1">Cliquez sur "Générer messages" pour recevoir des nouvelles de votre vestiaire</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map(msg => (
            <PlayerMessageCard
              key={msg.id}
              msg={msg}
              onReply={(id, text, tone) => replyMutation.mutateAsync({ id, text, tone, msg })}
              onMarkRead={(id) => markRead.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}