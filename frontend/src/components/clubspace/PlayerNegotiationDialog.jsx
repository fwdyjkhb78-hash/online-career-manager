import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageCircle, Check, X, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';

const ROLES = [
  { value: 'titulaire_indiscutable', label: '⭐ Joueur clé', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  { value: 'titulaire', label: '✅ Titulaire', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  { value: 'rotation', label: '🔄 Rotation', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { value: 'espoir', label: '🌱 Espoir', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
];

export default function PlayerNegotiationDialog({ open, onClose, player, buyerClub, squadPlayers = [], leagueContext = null, onNegotiationComplete }) {
  const [proposedRole, setProposedRole] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [negotiationResult, setNegotiationResult] = useState(null); // 'accepted' | 'rejected'

  const detectDecision = (reply) => {
    const lower = reply.toLowerCase();
    if (lower.includes('**décision :** acceptation') || lower.includes('**décision:** acceptation')) return 'accepted';
    if (lower.includes('**décision :** refus') || lower.includes('**décision:** refus')) return 'rejected';
    return null;
  };

  const startNegotiation = async () => {
    if (!proposedRole) return;
    setLoading(true);
    setStarted(true);
    try {
      const res = await base44.functions.invoke('playerNegotiation', {
        player,
        buyerClub,
        squadPlayers,
        leagueContext,
        proposedRole: ROLES.find(r => r.value === proposedRole)?.label || proposedRole,
        conversationHistory: [],
        userMessage: `Bonjour ${player.name}, notre club ${buyerClub.name} souhaite vous recruter. Nous vous proposons le rôle de : ${ROLES.find(r => r.value === proposedRole)?.label || proposedRole}. Qu'en pensez-vous ?`
      });
      const reply = res.data?.reply || '';
      setConversationHistory([
        { role: 'user', content: `Proposition de rôle : ${ROLES.find(r => r.value === proposedRole)?.label}` },
        { role: 'assistant', content: reply }
      ]);
      const decision = detectDecision(reply);
      if (decision) setNegotiationResult(decision);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const sendMessage = async (userMsg) => {
    if (loading || negotiationResult) return;
    setLoading(true);
    const newHistory = [...conversationHistory, { role: 'user', content: userMsg }];
    setConversationHistory(newHistory);
    try {
      const res = await base44.functions.invoke('playerNegotiation', {
        player,
        buyerClub,
        squadPlayers,
        leagueContext,
        proposedRole: ROLES.find(r => r.value === proposedRole)?.label || proposedRole,
        conversationHistory: newHistory.slice(0, -1),
        userMessage: userMsg
      });
      const reply = res.data?.reply || '';
      setConversationHistory([...newHistory, { role: 'assistant', content: reply }]);
      const decision = detectDecision(reply);
      if (decision) setNegotiationResult(decision);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleClose = () => {
    setProposedRole('');
    setConversationHistory([]);
    setStarted(false);
    setNegotiationResult(null);
    onClose();
  };

  const handleConfirmAccepted = () => {
    onNegotiationComplete?.({ role: proposedRole, accepted: true });
    handleClose();
  };

  const formatMessage = (content) => {
    return content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  };

  const QUICK_REPLIES = [
    { label: 'Nous offrons des garanties de temps de jeu', msg: `Nous vous garantissons du temps de jeu régulier. Vous serez une priorité dans notre projet.` },
    { label: 'Modifier le rôle proposé', msg: null, isRoleChange: true },
    { label: 'Vous convaincre avec notre ambition', msg: `Nous sommes un club ambitieux avec un projet solide. Vous serez au cœur de notre développement.` },
    { label: 'Accepter votre contre-proposition', msg: `Nous acceptons vos conditions et nous sommes prêts à vous offrir ce que vous demandez.` },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-emerald-400" />
            Négociation avec {player?.name}
          </DialogTitle>
        </DialogHeader>

        {/* Player info */}
        <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold">{player?.overall}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold">{player?.name}</p>
            <p className="text-slate-400 text-sm">{player?.position} · {player?.club_name || 'Agent libre'}</p>
          </div>
          <div className="text-right">
            <p className="text-emerald-400 font-semibold text-sm">{((player?.value || 0) / 1e6).toFixed(1)}M€</p>
            <p className="text-slate-500 text-xs">valeur</p>
          </div>
        </div>

        {/* Étape 1 : Choisir le rôle */}
        {!started && (
          <div className="space-y-4">
            <div>
              <p className="text-slate-300 text-sm font-semibold mb-3">Quel rôle proposez-vous à ce joueur ?</p>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map(r => (
                  <button
                    key={r.value}
                    onClick={() => setProposedRole(r.value)}
                    className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      proposedRole === r.value
                        ? r.color + ' border-2'
                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300">
              ⚠️ Le joueur va évaluer votre offre en fonction de son niveau, son âge, son ambition et la réputation de votre club. Il peut refuser ou poser des conditions.
            </div>

            <Button
              onClick={startNegotiation}
              disabled={!proposedRole || loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageCircle className="w-4 h-4 mr-2" />}
              Lancer la négociation
            </Button>
          </div>
        )}

        {/* Conversation */}
        {started && (
          <div className="space-y-4">
            {/* Messages */}
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              <AnimatePresence>
                {conversationHistory.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                      msg.role === 'user'
                        ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-100'
                        : 'bg-slate-800 border border-slate-700 text-slate-200'
                    }`}>
                      {msg.role === 'assistant' ? (
                        <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} className="leading-relaxed" />
                      ) : (
                        <p className="leading-relaxed">{msg.content}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
                {loading && (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Résultat final */}
            {negotiationResult === 'accepted' && (
              <div className="bg-emerald-500/10 border border-emerald-500/40 rounded-xl p-4 space-y-3">
                <p className="text-emerald-300 font-semibold">✅ {player?.name} accepte le transfert !</p>
                <p className="text-slate-400 text-xs">Le joueur a accepté votre offre. Vous pouvez maintenant officialiser le transfert.</p>
                <Button onClick={handleConfirmAccepted} className="w-full bg-emerald-500 hover:bg-emerald-600">
                  <Check className="w-4 h-4 mr-2" />
                  Officialiser le transfert
                </Button>
              </div>
            )}

            {negotiationResult === 'rejected' && (
              <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-4 space-y-3">
                <p className="text-red-300 font-semibold">❌ {player?.name} refuse le transfert</p>
                <p className="text-slate-400 text-xs">Le joueur a définitivement refusé. Vous pouvez tenter de relancer avec d'autres arguments.</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 border-slate-600 text-slate-300"
                    onClick={() => { setNegotiationResult(null); setConversationHistory([]); setStarted(false); }}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Recommencer
                  </Button>
                  <Button variant="outline" onClick={handleClose} className="flex-1 border-red-500/50 text-red-400">
                    <X className="w-4 h-4 mr-2" />
                    Abandonner
                  </Button>
                </div>
              </div>
            )}

            {/* Réponses rapides */}
            {!negotiationResult && !loading && conversationHistory.length > 0 && (
              <div className="space-y-2">
                <p className="text-slate-500 text-xs font-semibold">Vos arguments :</p>
                <div className="flex flex-col gap-1.5">
                  {QUICK_REPLIES.map((qr, i) => (
                    <button
                      key={i}
                      onClick={() => qr.msg ? sendMessage(qr.msg) : (() => { setStarted(false); setConversationHistory([]); setNegotiationResult(null); })()}
                      className="text-left px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300 text-xs hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all"
                    >
                      {qr.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}