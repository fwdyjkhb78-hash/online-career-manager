import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Gavel, ArrowRight, Trophy, Globe, Link, Sparkles, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchAll } from '@/utils/fetchAll';

const STEPS = { SELECT_TYPE: 0, SELECT_PLAYER: 1, SET_PRICE: 2 };

export default function CreateAuctionForm({ currentUser, onSuccess }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(STEPS.SELECT_TYPE);
  const [transferType, setTransferType] = useState(null); // 'ligue' | 'hors_ligue'
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [startingPrice, setStartingPrice] = useState('');
  // For hors_ligue: free text for external club name
  const [externalClubName, setExternalClubName] = useState('');

  const [externalPlayerName, setExternalPlayerName] = useState('');
  const [externalPlayerPosition, setExternalPlayerPosition] = useState('');
  const [externalPlayerOverall, setExternalPlayerOverall] = useState('');
  const [externalPlayerAge, setExternalPlayerAge] = useState('');
  const [externalPlayerNationality, setExternalPlayerNationality] = useState('');
  const [externalPlayerImageUrl, setExternalPlayerImageUrl] = useState('');
  const [sofifaUrl, setSofifaUrl] = useState('');
  const [fetchingStats, setFetchingStats] = useState(false);
  const [playerSearch, setPlayerSearch] = useState('');

  const fetchStatsFromSofifa = async () => {
    if (!sofifaUrl.trim()) return;
    setFetchingStats(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Va sur cette page SofIFA: ${sofifaUrl} et extrais les informations suivantes du joueur de football: nom complet, poste (utilise les abréviations: GK, CB, LB, RB, CDM, CM, CAM, LW, RW, ST), note overall, âge, nationalité, et URL de la photo du joueur. Retourne uniquement les données JSON demandées.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            position: { type: 'string' },
            overall: { type: 'number' },
            age: { type: 'number' },
            nationality: { type: 'string' },
            image_url: { type: 'string' }
          }
        }
      });
      if (result?.name) setExternalPlayerName(result.name);
      if (result?.position) setExternalPlayerPosition(result.position);
      if (result?.overall) setExternalPlayerOverall(String(result.overall));
      if (result?.age) setExternalPlayerAge(String(result.age));
      if (result?.nationality) setExternalPlayerNationality(result.nationality);
      if (result?.image_url) setExternalPlayerImageUrl(result.image_url);
    } catch (e) {
      console.error('Erreur fetch SofIFA:', e);
    }
    setFetchingStats(false);
  };

  const { data: mercatoWindows = [] } = useQuery({
    queryKey: ['mercato-window'],
    queryFn: () => base44.entities.MercatoWindow.list('-created_date', 1),
  });
  const isMercatoOpen = mercatoWindows[0]?.is_open === true;

  const { data: freePlayers = [], isLoading: playersLoading } = useQuery({
    queryKey: ['free-agents-for-auction'],
    queryFn: async () => {
      const all = await fetchAll('Player');
      return all.filter(p => (!p.club_id || p.club_id === '') && !p.is_academy);
    },
    enabled: transferType === 'ligue'
  });

  const createAuctionMutation = useMutation({
    mutationFn: async () => {
      const sp = parseFloat(startingPrice) || 0;
      const endsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      // Si mercato fermé → enchère en attente
      const auctionStatus = isMercatoOpen ? 'active' : 'pending';

      if (transferType === 'ligue') {
        // Transfert interne: le joueur quitte son club actuel via enchère
        await base44.entities.Auction.create({
          player_id: selectedPlayer.id,
          player_name: selectedPlayer.name,
          player_position: selectedPlayer.position,
          player_overall: selectedPlayer.overall,
          player_age: selectedPlayer.age,
          player_nationality: selectedPlayer.nationality,
          player_image_url: selectedPlayer.image_url,
          seller_club_id: currentUser.club_id,
          seller_club_name: currentUser.club_name,
          starting_price: sp,
          current_price: sp,
          is_external_player: false,
          transfer_type: 'ligue',
          status: auctionStatus,
          ends_at: isMercatoOpen ? endsAt : null,
          reactions: {}
        });
        // Remove player from seller's squad
        await base44.entities.Player.update(selectedPlayer.id, {
          club_id: null,
          club_name: null,
          is_on_transfer_list: false
        });
      } else {
        // Recrutement hors ligue: joueur externe qui rejoint le club recruteur
        await base44.entities.Auction.create({
          player_name: externalPlayerName,
          player_position: externalPlayerPosition,
          player_overall: parseFloat(externalPlayerOverall) || null,
          player_age: parseFloat(externalPlayerAge) || null,
          player_nationality: externalPlayerNationality || '',
          player_image_url: externalPlayerImageUrl || '',
          seller_club_id: currentUser.club_id,
          seller_club_name: currentUser.club_name,
          starting_price: sp,
          current_price: sp,
          is_external_player: true,
          transfer_type: 'hors_ligue',
          status: auctionStatus,
          ends_at: isMercatoOpen ? endsAt : null,
          current_bidder_club: currentUser.club_name,
          current_bidder_name: currentUser.manager_name || currentUser.full_name,
          reactions: {}
        });
      }

      onSuccess?.();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      queryClient.invalidateQueries({ queryKey: ['auctions-ended'] });
      queryClient.invalidateQueries({ queryKey: ['my-squad-for-auction'] });
      setStep(STEPS.SELECT_TYPE);
      setTransferType(null);
      setSelectedPlayer(null);
      setStartingPrice('');
      setExternalClubName('');
      setExternalPlayerName('');
      setExternalPlayerPosition('');
      setExternalPlayerOverall('');
      setExternalPlayerAge('');
      setExternalPlayerNationality('');
      setExternalPlayerImageUrl('');
      setSofifaUrl('');
    }
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/70 border border-emerald-500/30 rounded-2xl p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-white font-bold flex items-center gap-2">
          <Gavel className="w-4 h-4 text-emerald-400" />
          Créer une enchère
        </p>
        {!isMercatoOpen && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full">
            <Lock className="w-3 h-3" /> Mise en attente — mercato fermé
          </span>
        )}
      </div>

      {/* Step 0: Select transfer type */}
      {step === STEPS.SELECT_TYPE && (
        <div className="space-y-3">
          <p className="text-slate-300 text-sm font-medium">Étape 1/3 — Type de transfert</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { setTransferType('ligue'); setStep(STEPS.SELECT_PLAYER); }}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
            >
              <Trophy className="w-7 h-7 text-emerald-400" />
              <p className="text-white font-semibold text-sm">Transfert Ligue</p>
              <p className="text-slate-400 text-xs text-center">Un joueur de la ligue rejoint un autre club de la ligue</p>
            </button>
            <button
              onClick={() => { setTransferType('hors_ligue'); setStep(STEPS.SELECT_PLAYER); }}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 transition-colors"
            >
              <Globe className="w-7 h-7 text-purple-400" />
              <p className="text-white font-semibold text-sm">Recrutement Hors Ligue</p>
              <p className="text-slate-400 text-xs text-center">Un joueur extérieur à la ligue rejoint votre club</p>
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Select Player */}
      {step === STEPS.SELECT_PLAYER && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-slate-300 text-sm font-medium">
              Étape 2/3 — {transferType === 'ligue' ? 'Sélectionnez un joueur' : 'Informations du joueur'}
            </p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              transferType === 'ligue' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-purple-500/20 text-purple-300'
            }`}>
              {transferType === 'ligue' ? '🏆 Ligue' : '🌍 Hors Ligue'}
            </span>
          </div>

          {transferType === 'ligue' ? (
            <div className="space-y-2">
              <p className="text-slate-400 text-xs">Seuls les joueurs sans club peuvent être mis aux enchères directement.</p>
              <Input
                placeholder="Rechercher un joueur..."
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg max-h-64 overflow-y-auto">
              {playersLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                </div>
              ) : freePlayers.filter(p => !playerSearch || p.name?.toLowerCase().includes(playerSearch.toLowerCase())).length === 0 ? (
                <p className="p-4 text-slate-400 text-sm text-center">Aucun joueur trouvé</p>
              ) : (
                freePlayers.filter(p => !playerSearch || p.name?.toLowerCase().includes(playerSearch.toLowerCase())).map(player => (
                  <button
                    key={player.id}
                    onClick={() => setSelectedPlayer(player)}
                    className={`w-full text-left px-4 py-3 border-b border-slate-600 transition-colors last:border-0 ${
                      selectedPlayer?.id === player.id ? 'bg-emerald-500/20' : 'hover:bg-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{player.name}</p>
                        <p className="text-slate-400 text-xs">{player.position} • {player.overall}★</p>
                      </div>
                      <span className="text-emerald-400 text-sm">{(player.value / 1e6).toFixed(1)}M€</span>
                    </div>
                  </button>
                ))
              )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Lien SofIFA du joueur (ex: sofifa.com/player/...)"
                  value={sofifaUrl}
                  onChange={(e) => setSofifaUrl(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white text-sm"
                />
                <Button
                  type="button"
                  onClick={fetchStatsFromSofifa}
                  disabled={!sofifaUrl.trim() || fetchingStats}
                  className="bg-purple-600 hover:bg-purple-700 shrink-0 px-3"
                >
                  {fetchingStats ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                </Button>
              </div>
              {fetchingStats && <p className="text-purple-300 text-xs animate-pulse">Récupération des stats en cours...</p>}
              {externalPlayerName ? (
                <div className="bg-slate-700/50 border border-emerald-500/30 rounded-lg p-3 flex items-center gap-3">
                  {externalPlayerImageUrl && (
                    <img src={externalPlayerImageUrl} alt={externalPlayerName} className="w-12 h-12 rounded-lg object-cover" />
                  )}
                  <div>
                    <p className="text-white font-semibold">{externalPlayerName}</p>
                    <p className="text-slate-400 text-xs">{externalPlayerPosition} · {externalPlayerOverall}★ · {externalPlayerAge} ans · {externalPlayerNationality}</p>
                  </div>
                  <span className="ml-auto text-emerald-400 text-xs">✓ Récupéré</span>
                </div>
              ) : (
                <p className="text-slate-500 text-xs">Collez un lien SofIFA et cliquez sur ✨ pour récupérer automatiquement les stats.</p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={() => setStep(STEPS.SELECT_TYPE)} variant="outline" className="border-slate-600 text-slate-300">
              Retour
            </Button>
            <Button
              onClick={() => setStep(STEPS.SET_PRICE)}
              disabled={transferType === 'ligue' ? !selectedPlayer : !externalPlayerName.trim()}
              className={`flex-1 ${transferType === 'ligue' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-purple-600 hover:bg-purple-700'}`}
            >
              Continuer <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Set Price */}
      {step === STEPS.SET_PRICE && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-slate-300 text-sm font-medium">Étape 3/3 — Prix de départ</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              transferType === 'ligue' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-purple-500/20 text-purple-300'
            }`}>
              {transferType === 'ligue' ? '🏆 Ligue' : '🌍 Hors Ligue'}
            </span>
          </div>

          <div className="bg-slate-700/50 p-3 rounded-lg space-y-1">
            <p className="text-white text-sm font-medium">
              {transferType === 'ligue' ? selectedPlayer?.name : externalPlayerName}
            </p>
            <p className="text-slate-400 text-xs">
              {transferType === 'ligue'
                ? `${selectedPlayer?.position} • ${selectedPlayer?.overall}★`
                : `${externalPlayerPosition || '—'} ${externalPlayerOverall ? `• ${externalPlayerOverall}★` : ''}`}
            </p>
            <p className="text-slate-500 text-xs">
              {transferType === 'ligue' ? `Vendeur: ${currentUser?.club_name}` : `Recruteur: ${currentUser?.club_name}`}
            </p>
          </div>

          <Input
            placeholder="Montant du transfert (€)"
            type="number"
            value={startingPrice}
            onChange={(e) => setStartingPrice(e.target.value)}
            className="bg-slate-700 border-slate-600 text-white"
          />
          {startingPrice && (
            <p className="text-slate-400 text-xs">{(parseInt(startingPrice) / 1e6).toFixed(2)}M€</p>
          )}

          <p className="text-slate-400 text-xs italic">
            {!isMercatoOpen
              ? "⏳ Le mercato est fermé. Cette enchère sera mise en attente et s'activera automatiquement à l'ouverture."
              : transferType === 'ligue'
                ? "⏰ L'enchère durera 1h. Le joueur sera transféré au club gagnant."
                : "⏰ L'enchère durera 1h puis sera officialisée dans l'onglet Hors Ligue."}
          </p>

          <div className="flex gap-2">
            <Button onClick={() => setStep(STEPS.SELECT_PLAYER)} variant="outline" className="border-slate-600 text-slate-300">
              Retour
            </Button>
            <Button
              onClick={() => createAuctionMutation.mutate()}
              disabled={!startingPrice || parseFloat(startingPrice) <= 0 || createAuctionMutation.isPending}
              className={`flex-1 ${transferType === 'ligue' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-purple-600 hover:bg-purple-700'}`}
            >
              {createAuctionMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Gavel className="w-4 h-4 mr-2" />
              )}
              Lancer l'enchère
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}