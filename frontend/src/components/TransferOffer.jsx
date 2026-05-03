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

const COMPETITION_TYPES = {
  homme_du_match: 'Homme du match',
  totw: 'TOTW',
  tots: 'TOTS',
  ballon_dor: "Ballon d'Or",
};

export default function TransferOffer({ transfer, isReceived, onAccept, onReject, onCounterOffer, onCancel, loading }) {
  const [showCounter, setShowCounter] = useState(false);
  const [counterAmount, setCounterAmount] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  // Counter-offer extra fields
  const [counterBuybackClause, setCounterBuybackClause] = useState('');
  const [counterBonuses, setCounterBonuses] = useState([]);
  const [counterCompBonuses, setCounterCompBonuses] = useState([]);
  // Loan-specific counter fields
  const [counterLoanSeasons, setCounterLoanSeasons] = useState(transfer.loan_seasons || 1);
  const [counterLoanBuyOption, setCounterLoanBuyOption] = useState('');
  const [counterLoanMandatoryBuyOption, setCounterLoanMandatoryBuyOption] = useState('');
  const [counterLoanRecallFee, setCounterLoanRecallFee] = useState('');
  const [counterLoanClauses, setCounterLoanClauses] = useState({ evolutions: '', journees: '', buts: '', pd: '', penalite: '' });

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
    if (counterAmount === '' || counterAmount === null || counterAmount === undefined) return;
    if (!isLoan && parseFloat(counterAmount) <= 0) return;
    const extraData = {
      buyback_clause: counterBuybackClause ? parseInt(counterBuybackClause) : 0,
      performance_bonuses: [
        ...counterBonuses.filter(b => b.condition && b.amount),
        ...(isLoan && counterLoanClauses.evolutions !== '' ? [{ condition: `${counterLoanClauses.evolutions} évolution(s) obligatoire(s)`, amount: 0, clause_type: 'evolutions', clause_value: parseInt(counterLoanClauses.evolutions) }] : []),
        ...(isLoan && counterLoanClauses.journees !== '' ? [{ condition: `${counterLoanClauses.journees} journée(s) jouée(s) minimum`, amount: 0, clause_type: 'journees', clause_value: parseInt(counterLoanClauses.journees) }] : []),
        ...(isLoan && counterLoanClauses.buts !== '' ? [{ condition: `${counterLoanClauses.buts} but(s) minimum`, amount: 0, clause_type: 'buts', clause_value: parseInt(counterLoanClauses.buts) }] : []),
        ...(isLoan && counterLoanClauses.pd !== '' ? [{ condition: `${counterLoanClauses.pd} passe(s) décisive(s) minimum`, amount: 0, clause_type: 'pd', clause_value: parseInt(counterLoanClauses.pd) }] : []),
        ...(isLoan && counterLoanClauses.penalite !== '' ? [{ condition: `Pénalité si clauses non respectées`, amount: parseInt(counterLoanClauses.penalite), clause_type: 'penalite', clause_value: parseInt(counterLoanClauses.penalite) }] : []),
      ],
      competition_bonuses: counterCompBonuses.filter(b => b.type && b.amount),
      ...(isLoan ? {
        loan_seasons: parseInt(counterLoanSeasons) || 1,
        loan_buy_option: counterLoanBuyOption ? parseInt(counterLoanBuyOption) : 0,
        loan_mandatory_buy_option: counterLoanMandatoryBuyOption ? parseInt(counterLoanMandatoryBuyOption) : 0,
        loan_recall_fee: counterLoanRecallFee ? parseInt(counterLoanRecallFee) : 0,
      } : {}),
    };
    onCounterOffer(parseFloat(counterAmount), extraData);
    setCounterAmount('');
    setShowCounter(false);
    setCounterBuybackClause('');
    setCounterBonuses([]);
    setCounterCompBonuses([]);
    setCounterLoanClauses({ evolutions: '', journees: '', buts: '', pd: '', penalite: '' });
    setCounterLoanBuyOption('');
    setCounterLoanMandatoryBuyOption('');
    setCounterLoanRecallFee('');
  };

  const isLoan = transfer.offer_type === 'loan';
  const isSwap = transfer.offer_type === 'swap';
  const isReleaseClause = transfer.is_release_clause === true;

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
            {isReleaseClause && <Badge className="bg-purple-500/20 text-purple-300">🔓 Clause de libération</Badge>}
          </div>
          <p className="text-slate-400 text-sm mt-1">
            {isReceived
              ? isLoan
                ? <><span className="text-blue-300 font-medium">{transfer.to_club_name}</span> veut prendre en prêt</>
                : isSwap
                  ? <><span className="text-purple-300 font-medium">{transfer.to_club_name}</span> propose un échange</>
                  : <><span className="text-emerald-300 font-medium">{transfer.to_club_name}</span> veut acheter</>
              : isLoan
                ? <>Prêt proposé à <span className="text-blue-300 font-medium">{transfer.from_club_name}</span></>
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

      {/* Clause de libération info */}
      {isReleaseClause && (
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg px-3 py-2 text-sm space-y-1">
          <p className="text-purple-300 font-semibold">🔓 Demande d'exercice de clause de libération</p>
          <p className="text-slate-400 text-xs">
            {isReceived
            ? `En acceptant, ${transfer.player_name} rejoint directement ${transfer.to_club_name} pour ${formatPrice(transfer.amount)}. Le transfert est officialisé immédiatement — aucune enchère.`
            : `Clause activée (${formatPrice(transfer.amount)}). Rendez-vous dans Mon Club → Transferts pour négocier avec le joueur.`
            }
          </p>
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

      {/* Clause de rachat + primes (transfert classique) */}
      {!isLoan && !isSwap && !isReleaseClause && (() => {
        const bonuses = transfer.performance_bonuses || [];
        const competitionBonuses = transfer.competition_bonuses || [];
        const regularBonuses = bonuses.filter(b => !b.clause_type && b.condition && b.amount);
        const hasExtras = transfer.buyback_clause > 0 || regularBonuses.length > 0 || competitionBonuses.length > 0;
        if (!hasExtras) return null;
        return (
          <div className="bg-slate-700/30 border border-slate-600/40 rounded-xl px-3 py-3 text-sm space-y-2">
            {transfer.buyback_clause > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">🔁 Clause de rachat</span>
                <span className="text-purple-300 font-semibold">{formatPrice(transfer.buyback_clause)}</span>
              </div>
            )}
            {regularBonuses.length > 0 && (
              <div className="space-y-1">
                <p className="text-emerald-300 text-xs font-semibold">🏆 Primes de performance</p>
                {regularBonuses.map((b, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">{b.condition}</span>
                    <span className="text-emerald-300 font-semibold">{formatPrice(b.amount)}</span>
                  </div>
                ))}
              </div>
            )}
            {competitionBonuses.length > 0 && (
              <div className="space-y-1">
                <p className="text-amber-300 text-xs font-semibold">🥇 Primes de compétition</p>
                {competitionBonuses.map((b, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">{b.type}{b.threshold ? ` (×${b.threshold})` : ''}</span>
                    <span className="text-amber-300 font-semibold">{formatPrice(b.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Accord conclu */}
      {transfer.status === 'accepted' && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2 text-emerald-300 text-sm">
          {isLoan
            ? <>✅ Prêt accepté à <strong>{formatPrice(transfer.amount)}</strong> de frais. Le joueur rejoindra directement le club prêteur.</>
            : <>✅ Accord trouvé à <strong>{formatPrice(transfer.amount)}</strong>. L'acheteur doit maintenant lancer une enchère d'officialisation sur la <strong>Communauté</strong>.</>
          }
        </div>
      )}
      {/* Loan conditions */}
      {isLoan && (() => {
        const bonuses = transfer.performance_bonuses || [];
        // Détection par clause_type (nouveau format) OU par condition (ancien format)
        const clauseEvolutions = bonuses.find(b => b.clause_type === 'evolutions') || bonuses.find(b => !b.clause_type && b.condition?.includes('évolution'));
        const clauseJournees = bonuses.find(b => b.clause_type === 'journees') || bonuses.find(b => !b.clause_type && b.condition?.includes('journée'));
        const clauseButs = bonuses.find(b => b.clause_type === 'buts') || bonuses.find(b => !b.clause_type && b.condition?.includes('but'));
        const clausePd = bonuses.find(b => b.clause_type === 'pd') || bonuses.find(b => !b.clause_type && b.condition?.includes('passe'));
        const clausePenalite = bonuses.find(b => b.clause_type === 'penalite') || bonuses.find(b => !b.clause_type && b.condition?.includes('Pénalité'));
        const clauseConditions = new Set([clauseEvolutions, clauseJournees, clauseButs, clausePd, clausePenalite].filter(Boolean).map(b => b.condition));
        const regularBonuses = bonuses.filter(b => b.condition && b.amount && !clauseConditions.has(b.condition));
        return (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-3 text-sm space-y-2">
            <p className="text-blue-300 font-semibold">📋 Conditions du prêt</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Frais de prêt</span>
                <span className="text-white font-bold">{formatPrice(transfer.amount)}</span>
              </div>
              {transfer.loan_seasons > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Durée</span>
                  <span className="text-white">{transfer.loan_seasons} saison{transfer.loan_seasons > 1 ? 's' : ''}</span>
                </div>
              )}
              {transfer.loan_buy_option > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Option d'achat (facultative)</span>
                  <span className="text-blue-300 font-semibold">{formatPrice(transfer.loan_buy_option)}</span>
                </div>
              )}
              {transfer.loan_mandatory_buy_option > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Option obligatoire (J.19)</span>
                  <span className="text-amber-300 font-semibold">{formatPrice(transfer.loan_mandatory_buy_option)}</span>
                </div>
              )}
              {transfer.loan_recall_fee > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Indemnité de rappel</span>
                  <span className="text-orange-300 font-semibold">{formatPrice(transfer.loan_recall_fee)}</span>
                </div>
              )}
              {transfer.buyback_clause > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Clause de rachat</span>
                  <span className="text-purple-300 font-semibold">{formatPrice(transfer.buyback_clause)}</span>
                </div>
              )}
            </div>

            {/* Clauses obligatoires */}
            {(clauseEvolutions != null || clauseJournees != null || clauseButs != null || clausePd != null || clausePenalite != null) && (
              <div className="border-t border-blue-500/20 pt-2 mt-2 space-y-1.5">
                <p className="text-blue-200 text-xs font-semibold">📌 Clauses obligatoires imposées au club emprunteur</p>
                {clauseEvolutions != null && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Évolutions min.</span>
                    <span className="text-white font-semibold">{clauseEvolutions.clause_value ?? clauseEvolutions.condition}</span>
                  </div>
                )}
                {clauseJournees != null && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Journées jouées min.</span>
                    <span className="text-white font-semibold">{clauseJournees.clause_value ?? clauseJournees.condition}</span>
                  </div>
                )}
                {clauseButs != null && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Buts min.</span>
                    <span className="text-white font-semibold">{clauseButs.clause_value ?? clauseButs.condition}</span>
                  </div>
                )}
                {clausePd != null && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Passes décisives min.</span>
                    <span className="text-white font-semibold">{clausePd.clause_value ?? clausePd.condition}</span>
                  </div>
                )}
                {clausePenalite != null && (
                  <div className="flex items-center justify-between text-xs border-t border-red-500/20 pt-1.5 mt-1">
                    <span className="text-red-300">💸 Pénalité si non respectées</span>
                    <span className="text-red-300 font-bold">{formatPrice(clausePenalite.clause_value ?? clausePenalite.amount)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Primes de performance */}
            {regularBonuses.length > 0 && (
              <div className="border-t border-blue-500/20 pt-2 mt-2 space-y-1.5">
                <p className="text-emerald-300 text-xs font-semibold">🏆 Primes de performance</p>
                {regularBonuses.map((b, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">{b.condition}</span>
                    <span className="text-emerald-300 font-semibold">{formatPrice(b.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Primes de compétition */}
            {(transfer.competition_bonuses || []).length > 0 && (
              <div className="border-t border-blue-500/20 pt-2 mt-2 space-y-1.5">
                <p className="text-amber-300 text-xs font-semibold">🥇 Primes de compétition</p>
                {(transfer.competition_bonuses || []).map((b, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">{b.type}{b.threshold ? ` (×${b.threshold})` : ''}</span>
                    <span className="text-amber-300 font-semibold">{formatPrice(b.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

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
          {!isReleaseClause && (
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
          )}
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

      {/* Bouton annuler — pour l'expéditeur qui attend une réponse */}
      {!canAct && !isReceived && isPending && onCancel && (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
          >
            <X className="w-3 h-3" />
            Annuler l'offre
          </Button>
        </div>
      )}

      {/* Counter offer input */}
      {showCounter && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-3 bg-slate-700/30 border border-slate-600/50 rounded-xl p-3"
        >
          <p className="text-blue-300 text-xs font-semibold">✏️ Votre contre-offre</p>

          {/* Montant */}
          <div className="flex gap-2 items-center">
            <Input
              type="number"
              placeholder={isLoan ? "Frais de prêt (€)" : "Votre prix (€)"}
              value={counterAmount}
              onChange={(e) => setCounterAmount(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white h-8 text-sm"
            />
            {counterAmount && (
              <span className="text-slate-400 text-xs shrink-0">{(parseFloat(counterAmount) / 1e6).toFixed(2)}M€</span>
            )}
          </div>

          {/* Loan-specific fields */}
          {isLoan && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-xs w-20 shrink-0">Durée</span>
                <div className="flex gap-1">
                  {[1,2,3].map(n => (
                    <button key={n} type="button" onClick={() => setCounterLoanSeasons(n)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${counterLoanSeasons === n ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>
                      {n}S
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-slate-500 text-xs mb-1">Option achat (€)</p>
                  <Input type="number" value={counterLoanBuyOption} onChange={e => setCounterLoanBuyOption(e.target.value)} placeholder="Optionnel" className="bg-slate-800 border-slate-600 text-white h-7 text-xs" />
                </div>
                <div>
                  <p className="text-slate-500 text-xs mb-1">Option obligatoire (€)</p>
                  <Input type="number" value={counterLoanMandatoryBuyOption} onChange={e => setCounterLoanMandatoryBuyOption(e.target.value)} placeholder="Optionnel" className="bg-slate-800 border-slate-600 text-white h-7 text-xs" />
                </div>
                <div>
                  <p className="text-slate-500 text-xs mb-1">Indemnité rappel (€)</p>
                  <Input type="number" value={counterLoanRecallFee} onChange={e => setCounterLoanRecallFee(e.target.value)} placeholder="Optionnel" className="bg-slate-800 border-slate-600 text-white h-7 text-xs" />
                </div>
              </div>
              {/* Clauses obligatoires prêt */}
              <div className="space-y-2 border-t border-slate-600/40 pt-2">
                <p className="text-blue-200 text-xs font-semibold">📌 Clauses obligatoires</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'evolutions', label: 'Évolutions min.' },
                    { key: 'journees', label: 'Journées min.' },
                    { key: 'buts', label: 'Buts min.' },
                    { key: 'pd', label: 'Passes déc. min.' },
                  ].map(f => (
                    <div key={f.key}>
                      <p className="text-slate-500 text-xs mb-1">{f.label}</p>
                      <Input type="number" value={counterLoanClauses[f.key]} onChange={e => setCounterLoanClauses(c => ({ ...c, [f.key]: e.target.value }))} placeholder="—" className="bg-slate-800 border-slate-600 text-white h-7 text-xs" />
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-red-300 text-xs mb-1">💸 Pénalité si non respectées (€)</p>
                  <Input type="number" value={counterLoanClauses.penalite} onChange={e => setCounterLoanClauses(c => ({ ...c, penalite: e.target.value }))} placeholder="Optionnel" className="bg-slate-800 border-red-500/30 text-white h-7 text-xs" />
                </div>
              </div>
            </>
          )}

          {/* Clause de rachat (transfert & prêt) */}
          {!isSwap && (
            <div>
              <p className="text-slate-500 text-xs mb-1">🔁 Clause de rachat (€)</p>
              <Input type="number" value={counterBuybackClause} onChange={e => setCounterBuybackClause(e.target.value)} placeholder="Optionnel" className="bg-slate-800 border-slate-600 text-white h-7 text-xs" />
            </div>
          )}

          {/* Primes de performance */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-slate-500 text-xs">🏆 Primes de performance</p>
              <button type="button" onClick={() => setCounterBonuses([...counterBonuses, { condition: '', amount: '' }])} className="text-emerald-400 text-xs hover:text-emerald-300">+ Ajouter</button>
            </div>
            {counterBonuses.map((b, i) => (
              <div key={i} className="flex gap-1 items-center">
                <Input value={b.condition} onChange={e => { const n=[...counterBonuses]; n[i].condition=e.target.value; setCounterBonuses(n); }} placeholder="Condition" className="bg-slate-800 border-slate-600 text-white h-7 text-xs flex-1" />
                <Input type="number" value={b.amount} onChange={e => { const n=[...counterBonuses]; n[i].amount=e.target.value; setCounterBonuses(n); }} placeholder="€" className="bg-slate-800 border-slate-600 text-white h-7 text-xs w-24" />
                <button type="button" onClick={() => setCounterBonuses(counterBonuses.filter((_,j) => j!==i))} className="text-red-400 hover:text-red-300 text-lg leading-none">×</button>
              </div>
            ))}
          </div>

          {/* Primes de compétition */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-slate-500 text-xs">🥇 Primes de compétition</p>
              <button type="button" onClick={() => setCounterCompBonuses([...counterCompBonuses, { type: 'homme_du_match', threshold: '', amount: '' }])} className="text-amber-400 text-xs hover:text-amber-300">+ Ajouter</button>
            </div>
            {counterCompBonuses.map((b, i) => (
              <div key={i} className="flex gap-1 items-center">
                <select value={b.type} onChange={e => { const n=[...counterCompBonuses]; n[i].type=e.target.value; setCounterCompBonuses(n); }} className="bg-slate-800 border border-slate-600 rounded-md px-2 py-1 text-white text-xs flex-1">
                  {Object.entries(COMPETITION_TYPES).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <Input type="number" value={b.threshold} onChange={e => { const n=[...counterCompBonuses]; n[i].threshold=e.target.value; setCounterCompBonuses(n); }} placeholder="×" className="bg-slate-800 border-slate-600 text-white h-7 text-xs w-12" />
                <Input type="number" value={b.amount} onChange={e => { const n=[...counterCompBonuses]; n[i].amount=e.target.value; setCounterCompBonuses(n); }} placeholder="€" className="bg-slate-800 border-slate-600 text-white h-7 text-xs w-24" />
                <button type="button" onClick={() => setCounterCompBonuses(counterCompBonuses.filter((_,j) => j!==i))} className="text-red-400 hover:text-red-300 text-lg leading-none">×</button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleCounter} disabled={counterAmount === '' || counterAmount === null || counterAmount === undefined || (!isLoan && parseFloat(counterAmount) <= 0)} className="bg-blue-600 hover:bg-blue-700 flex-1">
              Envoyer la contre-offre
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowCounter(false)} className="text-slate-400 shrink-0">
              <X className="w-3 h-3" />
            </Button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}