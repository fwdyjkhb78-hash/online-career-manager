import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { fetchAll } from '@/utils/fetchAll';
import { Search, Loader2, ArrowLeft, ArrowLeftRight } from 'lucide-react';

const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];

const STAFF_ROLES = ['owner', 'admin', 'staff_mercato'];

export default function MakeOfferModal({ open, onClose, myClub, user }) {
  const queryClient = useQueryClient();
  const isStaff = user && STAFF_ROLES.includes(user.role);
  const [search, setSearch] = useState('');
  const [buyingClubId, setBuyingClubId] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [amount, setAmount] = useState('');
  const [offerMode, setOfferMode] = useState('transfer'); // 'transfer' | 'loan' | 'swap'
  const [isLoan, setIsLoan] = useState(false);
  const [swapPlayer, setSwapPlayer] = useState(null); // joueur offert en échange
  const [swapSearch, setSwapSearch] = useState('');
  const [loanSeasons, setLoanSeasons] = useState(1);
  const [loanBuyOption, setLoanBuyOption] = useState('');
  const [loanMandatoryBuyOption, setLoanMandatoryBuyOption] = useState('');
  const [loanRecallFee, setLoanRecallFee] = useState('');
  const [buybackClause, setBuybackClause] = useState('');
  const [bonuses, setBonuses] = useState([]);
  const [competitionBonuses, setCompetitionBonuses] = useState([]);
  const [message, setMessage] = useState('');
  const [useReleaseClause, setUseReleaseClause] = useState(false);

  const COMPETITION_TYPES = [
    { value: 'homme_du_match', label: 'Homme du match' },
    { value: 'totw', label: 'TOTW' },
    { value: 'tots', label: 'TOTS' },
    { value: 'ballon_dor', label: "Ballon d'Or" },
  ];

  const { data: allPlayers = [], isLoading } = useQuery({
    queryKey: ['all-players-for-offer'],
    queryFn: () => fetchAll('Player'),
    enabled: open,
    staleTime: 30000,
  });

  const { data: allClubs = [] } = useQuery({
    queryKey: ['all-clubs-transfer'],
    queryFn: () => base44.entities.Club.list(),
    staleTime: 30000,
    enabled: open,
  });

  const effectiveBuyingClub = isStaff && buyingClubId
    ? allClubs.find(c => c.id === buyingClubId)
    : myClub;

  const myPlayers = allPlayers.filter(p => p.club_id === (effectiveBuyingClub?.id || myClub?.id));
  const swapFilteredPlayers = myPlayers.filter(p =>
    p.name?.toLowerCase().includes(swapSearch.toLowerCase()) ||
    p.position?.includes(swapSearch.toUpperCase())
  );


  // Clubs sans entraîneur (pas de manager_id)
  const clubsWithoutManager = new Set(allClubs.filter(c => !c.manager_id).map(c => c.id));

  const otherPlayers = allPlayers.filter(p => {
    if (!p.club_id || p.club_id === myClub?.id) return false;
    // Club sans entraîneur : seulement les joueurs avec clause de libération
    if (clubsWithoutManager.has(p.club_id) && !p.release_clause) return false;
    return (
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.club_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.position?.includes(search.toUpperCase())
    );
  });

  const isClauseOnlyPurchase = selectedPlayer &&
    clubsWithoutManager.has(selectedPlayer.club_id) &&
    selectedPlayer.release_clause > 0;

  // Joueur avec clause dans un club AVEC entraîneur
  const hasClauseOption = selectedPlayer &&
    !clubsWithoutManager.has(selectedPlayer.club_id) &&
    selectedPlayer.release_clause > 0;
  const isReleaseClauseMode = isClauseOnlyPurchase || (hasClauseOption && useReleaseClause);

  const sendOffer = useMutation({
    mutationFn: async () => {
      const sellerClub = allClubs.find(c => c.id === selectedPlayer.club_id) ||
        { id: selectedPlayer.club_id, name: selectedPlayer.club_name };
      const buyerClub = effectiveBuyingClub || myClub;
      const isSwap = offerMode === 'swap';
      const isLoanMode = offerMode === 'loan';
      const isDirectClauseBuy = !sellerClub.manager_id && selectedPlayer.release_clause > 0;
      const isReleaseModeLocal = isDirectClauseBuy || (hasClauseOption && useReleaseClause);

      if (isDirectClauseBuy) {
        // Achat direct par clause — pas de négociation
        const clauseAmount = selectedPlayer.release_clause;
        if ((buyerClub.budget || 0) < clauseAmount) throw new Error('Budget insuffisant pour exercer la clause');
        const now = new Date().toISOString();
        // Déduire le budget de l'acheteur
        await base44.entities.Club.update(buyerClub.id, { budget: (buyerClub.budget || 0) - clauseAmount });
        // Ajouter au budget du club vendeur
        if (sellerClub.id) await base44.entities.Club.update(sellerClub.id, { budget: (sellerClub.budget || 0) + clauseAmount });
        // Transférer le joueur
        await base44.entities.Player.update(selectedPlayer.id, {
          club_id: buyerClub.id, club_name: buyerClub.name,
          is_on_transfer_list: false, asking_price: null, release_clause: null
        });
        // Créer une officialisation directe
        await base44.entities.Auction.create({
          player_id: selectedPlayer.id,
          player_name: selectedPlayer.name,
          player_position: selectedPlayer.position || '',
          player_overall: selectedPlayer.overall || 0,
          player_age: selectedPlayer.age || null,
          player_nationality: selectedPlayer.nationality || '',
          player_image_url: selectedPlayer.image_url || '',
          seller_club_id: sellerClub.id,
          seller_club_name: sellerClub.name,
          starting_price: clauseAmount,
          current_price: clauseAmount,
          current_bidder_club: buyerClub.name,
          last_bid_at: now, ends_at: now,
          is_external_player: false, transfer_type: 'ligue', status: 'completed',
          is_loan: false, reactions: {}
        });
        return;
      }

      await base44.entities.Transfer.create({
        player_id: selectedPlayer.id,
        player_name: selectedPlayer.name,
        from_club_id: sellerClub.id,
        from_club_name: sellerClub.name,
        to_club_id: buyerClub.id,
        to_club_name: buyerClub.name,
        amount: parseInt(amount) || 0,
        offer_type: isSwap ? 'swap' : (isLoanMode ? 'loan' : 'transfer'),
        is_release_clause: isReleaseClauseMode || false,
        swap_player_id: isSwap && swapPlayer ? swapPlayer.id : undefined,
        swap_player_name: isSwap && swapPlayer ? swapPlayer.name : undefined,
        swap_player_position: isSwap && swapPlayer ? swapPlayer.position : undefined,
        swap_player_overall: isSwap && swapPlayer ? swapPlayer.overall : undefined,
        swap_player_value: isSwap && swapPlayer ? swapPlayer.value : undefined,
        loan_seasons: isLoanMode ? (parseInt(loanSeasons) || 1) : undefined,
        loan_buy_option: isLoanMode && loanBuyOption ? parseInt(loanBuyOption) : 0,
        loan_mandatory_buy_option: isLoanMode && loanMandatoryBuyOption ? parseInt(loanMandatoryBuyOption) : 0,
        loan_recall_fee: isLoanMode && loanRecallFee ? parseInt(loanRecallFee) : 0,
        buyback_clause: buybackClause ? parseInt(buybackClause) : 0,
        performance_bonuses: bonuses.filter(b => b.condition && b.amount),
        competition_bonuses: competitionBonuses.filter(b => b.type && b.amount),
        offer_message: message || '',
        negotiation_history: [],
      });

      // Notifier le vendeur
      try {
        const allUsers = await base44.entities.User.list();
        const seller = allUsers.find(u => u.club_id === sellerClub.id && u.has_selected_club);
        if (seller) {
          await base44.entities.Notification.create({
            user_id: seller.id,
            club_id: sellerClub.id,
            type: 'transfer_offer',
            title: `Offre reçue pour ${selectedPlayer.name}`,
            message: offerMode === 'swap'
              ? `${(effectiveBuyingClub || myClub).name} propose un échange : ${swapPlayer?.name || '?'} contre ${selectedPlayer.name}${parseInt(amount) > 0 ? ` + ${(parseInt(amount) / 1e6).toFixed(2)}M€ de soulte` : ''}.`
              : `${(effectiveBuyingClub || myClub).name} propose ${(parseInt(amount) / 1e6).toFixed(2)}M€${offerMode === 'loan' ? ' (prêt)' : ''} pour ${selectedPlayer.name}.`,
            is_read: false,
            link_page: 'ClubSpace',
          });
        }
      } catch (e) { /* ignore */ }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outgoing-offers'] });
      queryClient.invalidateQueries({ queryKey: ['my-players'] });
      queryClient.invalidateQueries({ queryKey: ['all-clubs'] });
      handleClose();
    }
  });

  const handleClose = () => {
    setSearch('');
    setSelectedPlayer(null);
    setAmount('');
    setBuyingClubId('');
    setOfferMode('transfer');
    setIsLoan(false);
    setSwapPlayer(null);
    setSwapSearch('');
    setLoanSeasons(1);
    setLoanBuyOption('');
    setLoanMandatoryBuyOption('');
    setLoanRecallFee('');
    setBuybackClause('');
    setBonuses([]);
    setCompetitionBonuses([]);
    setMessage('');
    setUseReleaseClause(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedPlayer && (
              <button onClick={() => setSelectedPlayer(null)} className="text-slate-400 hover:text-white">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            {selectedPlayer ? `Offre pour ${selectedPlayer.name}` : 'Faire une offre / Échange'}
          </DialogTitle>
        </DialogHeader>

        {/* Staff club selector */}
        {isStaff && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <p className="text-amber-300 text-xs font-semibold mb-2">🛡️ Staff — Club acheteur</p>
            <select
              value={buyingClubId}
              onChange={e => setBuyingClubId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
            >
              <option value="">{myClub?.name || 'Mon club'} (par défaut)</option>
              {allClubs.filter(c => c.id !== selectedPlayer?.club_id).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {!selectedPlayer ? (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un joueur ou club..."
                className="bg-slate-800 border-slate-700 pl-9"
              />
            </div>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-emerald-500 animate-spin" /></div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {otherPlayers.slice(0, 40).map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedPlayer(p);
                      // Club sans entraîneur : forcer le montant à la clause
                      if (clubsWithoutManager.has(p.club_id) && p.release_clause) {
                        setAmount(p.release_clause);
                        setOfferMode('transfer');
                      } else {
                        setAmount(p.asking_price || p.value || '');
                      }
                    }}
                    className="w-full flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">{p.overall}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{p.name}</p>
                      <p className="text-slate-400 text-xs">{p.position} · {p.club_name}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-emerald-400 text-sm font-semibold">{((p.value || 0) / 1e6).toFixed(1)}M€</p>
                      {p.is_on_transfer_list && <span className="text-amber-400 text-xs">En vente</span>}
                      {clubsWithoutManager.has(p.club_id) && p.release_clause && (
                        <span className="text-purple-400 text-xs block">🔓 Clause {((p.release_clause) / 1e6).toFixed(1)}M€</span>
                      )}
                    </div>
                  </button>
                ))}
                {otherPlayers.length === 0 && (
                  <p className="text-slate-500 text-center py-8">Aucun joueur trouvé</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Player card */}
            <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-xl">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                <span className="text-white font-bold">{selectedPlayer.overall}</span>
              </div>
              <div>
                <p className="text-white font-bold">{selectedPlayer.name}</p>
                <p className="text-slate-400 text-sm">{selectedPlayer.position} · {selectedPlayer.club_name}</p>
                <p className="text-slate-500 text-xs">Valeur : {((selectedPlayer.value || 0) / 1e6).toFixed(1)}M€</p>
              </div>
            </div>

            {/* Clause de libération optionnelle (club avec entraîneur) */}
            {hasClauseOption && (
              <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-300 text-sm font-semibold">🔓 Clause de libération</p>
                    <p className="text-slate-400 text-xs mt-0.5">Montant fixé : <span className="text-purple-300 font-bold">{((selectedPlayer.release_clause) / 1e6).toFixed(2)}M€</span> — transfert direct si acceptée</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUseReleaseClause(!useReleaseClause);
                      if (!useReleaseClause) setAmount(selectedPlayer.release_clause);
                      else setAmount(selectedPlayer.asking_price || selectedPlayer.value || '');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      useReleaseClause ? 'bg-purple-500 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    {useReleaseClause ? 'Activée' : 'Activer'}
                  </button>
                </div>
              </div>
            )}

            {/* Achat par clause obligatoire */}
            {isClauseOnlyPurchase && (
              <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                <p className="text-purple-300 text-sm font-semibold">🔓 Achat par clause de libération</p>
                <p className="text-slate-400 text-xs mt-1">
                  Ce joueur appartient à un club sans entraîneur. L'achat se fait uniquement au montant de la clause : <span className="text-purple-300 font-bold">{((selectedPlayer.release_clause) / 1e6).toFixed(2)}M€</span>.
                </p>
              </div>
            )}

            {/* Mode selector — masqué si achat par clause */}
            {!isReleaseClauseMode && <div className="flex rounded-xl overflow-hidden border border-slate-700">
              {[{id:'transfer',label:'Transfert'},{id:'loan',label:'Prêt'},{id:'swap',label:'⇄ Échange'}].map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { setOfferMode(m.id); setIsLoan(m.id === 'loan'); setSwapPlayer(null); }}
                  className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                    offerMode === m.id ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>}


            {/* Échange — sélection joueur offert */}
            {offerMode === 'swap' && (
              <div className="space-y-2">
                <Label>Joueur offert en échange (de votre effectif)</Label>
                {swapPlayer ? (
                  <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">{swapPlayer.overall}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate">{swapPlayer.name}</p>
                      <p className="text-slate-400 text-xs">{swapPlayer.position} · {((swapPlayer.value||0)/1e6).toFixed(1)}M€</p>
                    </div>
                    <button onClick={() => setSwapPlayer(null)} className="text-red-400 hover:text-red-300 text-lg">×</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        value={swapSearch}
                        onChange={e => setSwapSearch(e.target.value)}
                        placeholder="Chercher dans mon effectif..."
                        className="bg-slate-800 border-slate-700 pl-9"
                      />
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                      {swapFilteredPlayers.slice(0, 20).map(p => (
                        <button
                          key={p.id}
                          onClick={() => { setSwapPlayer(p); setSwapSearch(''); }}
                          className="w-full flex items-center gap-3 p-2 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-left"
                        >
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-xs">{p.overall}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">{p.name}</p>
                            <p className="text-slate-400 text-xs">{p.position} · {((p.value||0)/1e6).toFixed(1)}M€</p>
                          </div>
                        </button>
                      ))}
                      {swapFilteredPlayers.length === 0 && <p className="text-slate-500 text-sm text-center py-2">Aucun joueur</p>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Amount */}
            <div className="space-y-1">
              <Label>{offerMode === 'loan' ? 'Frais de prêt (€)' : offerMode === 'swap' ? 'Soulte (€) — optionnel' : 'Montant de l\'offre (€)'}</Label>
              <Input
                type="number"
                value={amount}
                onChange={e => !isReleaseClauseMode && setAmount(e.target.value)}
                readOnly={isReleaseClauseMode}
                placeholder="Ex: 50000000"
                className={`bg-slate-800 border-slate-700 ${isReleaseClauseMode ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
              {amount && <p className="text-slate-400 text-xs">{(parseFloat(amount) / 1e6).toFixed(2)}M€</p>}
            </div>

            {/* Loan options */}
            {isLoan && (
              <>
                <div className="space-y-1">
                  <Label>Durée du prêt (saisons)</Label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setLoanSeasons(n)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          loanSeasons === n
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {n} saison{n > 1 ? 's' : ''}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Option d'achat facultative (€)</Label>
                  <Input
                    type="number"
                    value={loanBuyOption}
                    onChange={e => setLoanBuyOption(e.target.value)}
                    placeholder="Optionnel"
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Option d'achat obligatoire à la fin du championnat (€)</Label>
                  <Input
                    type="number"
                    value={loanMandatoryBuyOption}
                    onChange={e => setLoanMandatoryBuyOption(e.target.value)}
                    placeholder="Optionnel"
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Indemnité de rappel (€) — optionnel</Label>
                  <Input
                    type="number"
                    value={loanRecallFee}
                    onChange={e => setLoanRecallFee(e.target.value)}
                    placeholder="Montant pour rappeler le joueur en cours de saison"
                    className="bg-slate-800 border-slate-700"
                  />
                  {loanRecallFee && <p className="text-slate-400 text-xs">{(parseFloat(loanRecallFee) / 1e6).toFixed(2)}M€ — payé par le club prêteur pour récupérer le joueur</p>}
                </div>
              </>
            )}

            {/* Clause de rachat */}
            <div className="space-y-1">
              <Label>Clause de rachat (€) — optionnel</Label>
              <Input
                type="number"
                value={buybackClause}
                onChange={e => setBuybackClause(e.target.value)}
                placeholder="Montant pour récupérer le joueur"
                className="bg-slate-800 border-slate-700"
              />
              {buybackClause && <p className="text-slate-400 text-xs">{(parseFloat(buybackClause) / 1e6).toFixed(2)}M€</p>}
            </div>

            {/* Primes de performance */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Primes de performance — optionnel</Label>
                <button
                  type="button"
                  onClick={() => setBonuses([...bonuses, { condition: '', amount: '' }])}
                  className="text-emerald-400 text-xs hover:text-emerald-300"
                >
                  + Ajouter
                </button>
              </div>
              {bonuses.map((b, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    value={b.condition}
                    onChange={e => { const n = [...bonuses]; n[i].condition = e.target.value; setBonuses(n); }}
                    placeholder="Ex: 20 buts"
                    className="bg-slate-800 border-slate-700 flex-1"
                  />
                  <Input
                    type="number"
                    value={b.amount}
                    onChange={e => { const n = [...bonuses]; n[i].amount = e.target.value; setBonuses(n); }}
                    placeholder="€"
                    className="bg-slate-800 border-slate-700 w-32"
                  />
                  <button
                    type="button"
                    onClick={() => setBonuses(bonuses.filter((_, j) => j !== i))}
                    className="text-red-400 hover:text-red-300 text-lg leading-none"
                  >×</button>
                </div>
              ))}
            </div>

            {/* Primes de compétition */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Primes de compétition — optionnel</Label>
                <button
                  type="button"
                  onClick={() => setCompetitionBonuses([...competitionBonuses, { type: 'homme_du_match', threshold: '', amount: '' }])}
                  className="text-emerald-400 text-xs hover:text-emerald-300"
                >
                  + Ajouter
                </button>
              </div>
              {competitionBonuses.map((b, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select
                    value={b.type}
                    onChange={e => { const n = [...competitionBonuses]; n[i].type = e.target.value; setCompetitionBonuses(n); }}
                    className="bg-slate-800 border border-slate-700 rounded-md px-2 py-2 text-white text-sm flex-1"
                  >
                    {COMPETITION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <Input
                    type="number"
                    value={b.threshold}
                    onChange={e => { const n = [...competitionBonuses]; n[i].threshold = e.target.value; setCompetitionBonuses(n); }}
                    placeholder="Fois"
                    className="bg-slate-800 border-slate-700 w-16"
                  />
                  <Input
                    type="number"
                    value={b.amount}
                    onChange={e => { const n = [...competitionBonuses]; n[i].amount = e.target.value; setCompetitionBonuses(n); }}
                    placeholder="€"
                    className="bg-slate-800 border-slate-700 w-28"
                  />
                  <button
                    type="button"
                    onClick={() => setCompetitionBonuses(competitionBonuses.filter((_, j) => j !== i))}
                    className="text-red-400 hover:text-red-300 text-lg leading-none"
                  >×</button>
                </div>
              ))}
              {competitionBonuses.length > 0 && (
                <p className="text-slate-500 text-xs">Ex: Homme du match → 3 fois → 500 000€</p>
              )}
            </div>

            {/* Message */}
            <div className="space-y-1">
              <Label>Message (optionnel)</Label>
              <Input
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Message avec l'offre..."
                className="bg-slate-800 border-slate-700"
              />
            </div>

            <Button
              onClick={() => sendOffer.mutate()}
              disabled={sendOffer.isPending || (offerMode !== 'swap' && !amount) || (offerMode === 'swap' && !swapPlayer)}
              className="w-full bg-emerald-500 hover:bg-emerald-600"
            >
              {sendOffer.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isReleaseClauseMode ? 'Exercer la clause de libération' : offerMode === 'swap' ? 'Proposer l\'échange' : 'Envoyer l\'offre'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}