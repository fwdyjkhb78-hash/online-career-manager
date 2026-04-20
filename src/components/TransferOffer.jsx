import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, X, ArrowLeftRight, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

const STATUS_CONFIG = {
  pending: { color: 'bg-amber-500/20 text-amber-300', label: 'En attente' },
  negotiating: { color: 'bg-blue-500/20 text-blue-300', label: 'Négociation' },
  accepted: { color: 'bg-emerald-500/20 text-emerald-300', label: 'Acceptée' },
  rejected: { color: 'bg-red-500/20 text-red-300', label: 'Refusée' },
  completed: { color: 'bg-slate-500/20 text-slate-300', label: 'Complétée' },
};

export default function TransferOffer({ transfer, isReceived, onAccept, onReject, onCounterOffer, loading }) {
  const [showCounter, setShowCounter] = useState(false);
  const [counterAmount, setCounterAmount] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const config = STATUS_CONFIG[transfer.status] || STATUS_CONFIG.pending;
  const isPending = transfer.status === 'pending' || transfer.status === 'negotiating';
  const canAct = isReceived && isPending;
  const history = transfer.negotiation_history || [];

  const formatPrice = (p) => {
    if (!p) return '—';
    if (p >= 1e6) return `${(p / 1e6).toFixed(2)}M€`;
    return `${(p / 1000).toFixed(0)}K€`;
  };

  const handleCounter = () => {
    if (!counterAmount || parseFloat(counterAmount) <= 0) return;
    onCounterOffer(parseFloat(counterAmount));
    setCounterAmount('');
    setShowCounter(false);
  };

  const isLoan = transfer.offer_type === 'loan';
  const isSwap = transfer.offer_type === 'swap';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white font-bold">{transfer.player_name}</p>
            <Badge className={config.color}>{config.label}</Badge>
            {isLoan && <Badge className="bg-blue-500/20 text-blue-300">🔄 Prêt</Badge>}
            {isSwap && <Badge className="bg-purple-500/20 text-purple-300">⇄ Échange</Badge>}
          </div>
          <p className="text-slate-400 text-sm mt-1">
            {isReceived
              ? <><span className="text-emerald-300 font-medium">{transfer.to_club_name}</span> veut acheter</>
              : <>Offre à <span className="text-blue-300 font-medium">{transfer.from_club_name}</span></>
            }
          </p>
          {transfer.offer_message && (
            <p className="text-slate-500 text-xs italic mt-1">"{transfer.offer_message}"</p>
          )}
        </div>
        <div className="text-right shrink-0">
          {isSwap ? (
            <div className="text-right">
              <p className="text-purple-300 font-bold text-sm">{transfer.swap_player_name}</p>
              <p className="text-slate-500 text-xs">{transfer.swap_player_position} · OVR {transfer.swap_player_overall}</p>
              {transfer.amount > 0 && <p className="text-emerald-400 text-xs">+ {formatPrice(transfer.amount)} soulte</p>}
            </div>
          ) : (
            <>
              <p className="text-emerald-400 font-bold text-xl">{formatPrice(transfer.amount)}</p>
              <p className="text-slate-500 text-xs">offre actuelle</p>
            </>
          )}
        </div>
      </div>

      {/* History toggle */}
      {history.length > 0 && (
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {history.length} offre{history.length > 1 ? 's' : ''} précédente{history.length > 1 ? 's' : ''}
        </button>
      )}

      {/* History */}
      {showHistory && history.length > 0 && (
        <div className="space-y-1 border-l-2 border-slate-700 pl-3">
          {history.map((h, i) => (
            <div key={i} className="flex justify-between text-xs text-slate-500">
              <span>{h.from_club}</span>
              <span className="text-slate-400">{formatPrice(h.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Échange info */}
      {isSwap && transfer.swap_player_name && (
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2 text-sm space-y-1">
          <p className="text-purple-300 font-semibold">⇄ Proposition d'échange</p>
          <p className="text-slate-300">
            <span className="text-purple-200 font-medium">{transfer.swap_player_name}</span>
            {transfer.swap_player_position && ` (${transfer.swap_player_position}`}
            {transfer.swap_player_overall && ` · ${transfer.swap_player_overall} OVR)`}
            {transfer.swap_player_value && <span className="text-slate-400"> · val. {formatPrice(transfer.swap_player_value)}</span>}
          </p>
          {transfer.amount > 0 && <p className="text-emerald-300">+ {formatPrice(transfer.amount)} de soulte</p>}
        </div>
      )}

      {/* Accord conclu */}
      {transfer.status === 'accepted' && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2 text-emerald-300 text-sm">
          {isLoan
            ? <>✅ Prêt accepté à <strong>{formatPrice(transfer.amount)}</strong> de frais. Le joueur rejoindra directement le club prêteur.</>
            : <>✅ Accord trouvé à <strong>{formatPrice(transfer.amount)}</strong>. L'acheteur doit maintenant lancer une enchère d'officialisation sur la <strong>Communauté</strong>.</>
          }
        </div>
      )}
      {/* Loan options info */}
      {isLoan && (transfer.loan_buy_option > 0 || transfer.loan_mandatory_buy_option > 0) && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 text-sm space-y-1">
          {transfer.loan_buy_option > 0 && (
            <p className="text-blue-300">🔵 Option d'achat facultative : <strong>{formatPrice(transfer.loan_buy_option)}</strong></p>
          )}
          {transfer.loan_mandatory_buy_option > 0 && (
            <p className="text-amber-300">⚠️ Option obligatoire : <strong>{formatPrice(transfer.loan_mandatory_buy_option)}</strong> — prélevée automatiquement à la J.19</p>
          )}
        </div>
      )}

      {/* Action buttons */}
      {canAct && (
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={onAccept}
            disabled={loading}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            Accepter
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowCounter(!showCounter)}
            disabled={loading}
            className="border-blue-500/50 text-blue-300 hover:bg-blue-500/10"
          >
            <ArrowLeftRight className="w-3 h-3" />
            Contre-offre
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onReject}
            disabled={loading}
            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
          >
            <X className="w-3 h-3" />
            Refuser
          </Button>
        </div>
      )}

      {/* Counter offer input */}
      {showCounter && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex gap-2 items-center"
        >
          <Input
            type="number"
            placeholder="Votre prix (€)"
            value={counterAmount}
            onChange={(e) => setCounterAmount(e.target.value)}
            className="bg-slate-700 border-slate-600 text-white h-8 text-sm"
          />
          {counterAmount && (
            <span className="text-slate-400 text-xs shrink-0">{(parseFloat(counterAmount) / 1e6).toFixed(2)}M€</span>
          )}
          <Button size="sm" onClick={handleCounter} disabled={!counterAmount} className="bg-blue-600 hover:bg-blue-700 shrink-0">
            Envoyer
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowCounter(false)} className="text-slate-400 shrink-0">
            <X className="w-3 h-3" />
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}