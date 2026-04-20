import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRightLeft, Loader2, Send, Shield, Euro, ChevronRight,
  AlertCircle, Zap, Search, X, Filter, Gavel, Plus, SlidersHorizontal, Users,
  CheckCircle2, Trophy, Globe, RefreshCw, Star
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from '@/components/ui/switch';
import AuctionCard from '@/components/community/AuctionCard';
import CreateAuctionForm from '@/components/community/CreateAuctionForm';
import OfficializationTab from '@/components/community/OfficializationTab';
import MercatoStatusBanner from '@/components/MercatoStatusBanner';
import { fetchAll } from '@/utils/fetchAll';

const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];
const STAFF_ROLES = ['owner', 'admin', 'staff_mercato', 'staff_championnat', 'staff_developpement', 'staff_formation'];

export default function TransferMarket() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('transfers'); // 'transfers' | 'officialisations' | 'auctions' | 'search'
  const [officialTab, setOfficialTab] = useState('ligue'); // 'ligue' | 'hors_ligue' | 'academy' | 'dev'

  // Transfer state
  const [selectedClub, setSelectedClub] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [isLoanOffer, setIsLoanOffer] = useState(false);
  const [loanBuyOption, setLoanBuyOption] = useState('');
  const [loanMandatoryBuyOption, setLoanMandatoryBuyOption] = useState('');

  // Club filter (transfers tab sidebar)
  const [clubSearchQuery, setClubSearchQuery] = useState('');

  // Player search tab filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPos, setFilterPos] = useState('');
  const [filterMinOvr, setFilterMinOvr] = useState('');
  const [filterMaxOvr, setFilterMaxOvr] = useState('');
  const [filterMinPot, setFilterMinPot] = useState('');
  const [filterMaxPot, setFilterMaxPot] = useState('');
  const [filterOnSale, setFilterOnSale] = useState(false);
  const [filterHasClause, setFilterHasClause] = useState(false);
  const [filterNoClub, setFilterNoClub] = useState(false);

  // Auction state
  const [showAuctionForm, setShowAuctionForm] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: allClubs = [], isLoading: clubsLoading } = useQuery({
    queryKey: ['all-clubs-transfer'],
    queryFn: () => base44.entities.Club.list(),
    staleTime: 120000,
  });

  const { data: allPlayers = [], isLoading: playersLoading } = useQuery({
    queryKey: ['all-players-transfer'],
    queryFn: () => fetchAll('Player'),
    staleTime: 60000,
  });

  const { data: auctions = [], isLoading: auctionsLoading } = useQuery({
    queryKey: ['auctions'],
    queryFn: () => base44.entities.Auction.list('-created_date', 100),
    refetchInterval: 30000,
    enabled: tab === 'auctions',
  });

  const { data: pendingAuctions = [] } = useQuery({
    queryKey: ['auctions-pending'],
    queryFn: () => base44.entities.Auction.filter({ status: 'pending' }, '-created_date', 100),
    enabled: tab === 'auctions',
  });

  const [staffBuyingClubId, setStaffBuyingClubId] = useState('');
  const myClub = allClubs.find(c => c.id === user?.club_id) || null;
  const isStaff = user && STAFF_ROLES.includes(user.role);
  const effectiveBuyingClub = isStaff && staffBuyingClubId
    ? allClubs.find(c => c.id === staffBuyingClubId)
    : myClub;

  const clubPlayers = useMemo(() => {
    if (!selectedClub) return [];
    return allPlayers.filter(p => p.club_id === selectedClub.id);
  }, [allPlayers, selectedClub]);

  // Combined search results
  const searchResults = useMemo(() => {
    if (!searchQuery && !filterPos && !filterMinOvr && !filterMaxOvr && !filterMinPot && !filterMaxPot && !filterOnSale && !filterHasClause && !filterNoClub) return [];
    return allPlayers.filter(p => {
      if (filterPos && p.position !== filterPos) return false;
      if (filterMinOvr && p.overall < parseInt(filterMinOvr)) return false;
      if (filterMaxOvr && p.overall > parseInt(filterMaxOvr)) return false;
      if (filterMinPot && (p.potential || p.overall) < parseInt(filterMinPot)) return false;
      if (filterMaxPot && (p.potential || p.overall) > parseInt(filterMaxPot)) return false;
      if (filterOnSale && !p.is_on_transfer_list) return false;
      if (filterHasClause && !(p.release_clause > 0)) return false;
      if (filterNoClub && p.club_id) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          p.name?.toLowerCase().includes(q) ||
          p.club_name?.toLowerCase().includes(q) ||
          p.nationality?.toLowerCase().includes(q) ||
          p.position?.toLowerCase().includes(q)
        );
      }
      return true;
    }).slice(0, 50);
  }, [allPlayers, searchQuery, filterPos, filterMinOvr, filterMaxOvr, filterMinPot, filterMaxPot, filterOnSale, filterHasClause, filterNoClub]);

  const filteredClubs = allClubs.filter(c => {
    if (user?.club_id && c.id === user.club_id) return false;
    return true;
  });

  const activeAuctions = auctions.filter(a => a.status === 'active' && (!a.ends_at || new Date(a.ends_at) > new Date()));
  const closedAuctions = auctions.filter(a => a.status !== 'active' || (a.ends_at && new Date(a.ends_at) <= new Date()));

  const activateClause = useMutation({
    mutationFn: async (player) => {
      const clause = player.release_clause;
      await base44.entities.Club.update(myClub.id, { budget: myClub.budget - clause });
      const sellerClub = allClubs.find(c => c.id === player.club_id);
      if (sellerClub) await base44.entities.Club.update(sellerClub.id, { budget: (sellerClub.budget || 0) + clause });
      await base44.entities.Player.update(player.id, { club_id: myClub.id, club_name: myClub.name, is_on_transfer_list: false, asking_price: null, release_clause: null });
      await base44.entities.Transfer.create({ player_id: player.id, player_name: player.name, from_club_id: player.club_id, from_club_name: player.club_name, to_club_id: myClub.id, to_club_name: myClub.name, amount: clause, status: 'completed', offer_message: 'Clause de libération activée' });
      try {
        const users = await base44.entities.User.list();
        const seller = users.find(u => u.club_id === player.club_id);
        if (seller) await base44.entities.Notification.create({ user_id: seller.id, club_id: player.club_id, type: 'transfer_offer', title: 'Clause de libération activée', message: `${user.club_name} a activé la clause de libération de ${player.name} pour ${(clause / 1e6).toFixed(2)}M€.`, is_read: false, link_page: 'MyClub' });
      } catch (e) {}
    },
    onSuccess: () => { setSelectedPlayer(null); queryClient.invalidateQueries({ queryKey: ['all-players-transfer'] }); queryClient.invalidateQueries({ queryKey: ['all-clubs-transfer'] }); }
  });

  const makeOffer = useMutation({
    mutationFn: async () => {
      const sellingClub = selectedClub || allClubs.find(c => c.id === selectedPlayer.club_id) || { id: selectedPlayer.club_id, name: selectedPlayer.club_name };
      const buyerClub = effectiveBuyingClub || myClub;
      await base44.entities.Transfer.create({
        player_id: selectedPlayer.id,
        player_name: selectedPlayer.name,
        from_club_id: sellingClub.id,
        from_club_name: sellingClub.name,
        to_club_id: buyerClub.id,
        to_club_name: buyerClub.name,
        amount: parseInt(offerAmount),
        status: 'pending',
        offer_message: offerMessage,
        offer_type: isLoanOffer ? 'loan' : 'transfer',
        loan_buy_option: isLoanOffer && loanBuyOption ? parseInt(loanBuyOption) : null,
        loan_mandatory_buy_option: isLoanOffer && loanMandatoryBuyOption ? parseInt(loanMandatoryBuyOption) : null,
      });
      try {
        const sellerUsers = await base44.entities.User.list();
        const seller = sellerUsers.find(u => u.club_id === sellingClub.id && u.has_selected_club);
        if (seller) await base44.entities.Notification.create({ user_id: seller.id, club_id: sellingClub.id, type: 'transfer_offer', title: `${isLoanOffer ? 'Offre de prêt' : 'Offre'} reçue pour ${selectedPlayer.name}`, message: `${buyerClub.name} propose ${isLoanOffer ? 'un prêt' : ''} ${(parseInt(offerAmount) / 1e6).toFixed(2)}M€ pour ${selectedPlayer.name}.`, is_read: false, link_page: 'MyClub' });
      } catch (e) {}
    },
    onSuccess: () => { setSelectedPlayer(null); setOfferAmount(''); setOfferMessage(''); setIsLoanOffer(false); setLoanBuyOption(''); setLoanMandatoryBuyOption(''); }
  });

  const hasActiveSearch = searchQuery || filterPos || filterMinOvr || filterMaxOvr || filterMinPot || filterMaxPot || filterOnSale || filterHasClause || filterNoClub;
  const activeBuyingClub = effectiveBuyingClub || myClub;
  const canMakeOffer = (isStaff || user?.has_selected_club) && activeBuyingClub && parseInt(offerAmount) <= (activeBuyingClub.budget || 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">

      {/* ──── HEADER ──── */}
      <div className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-lg sticky top-16 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">

          {/* Title row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                <ArrowRightLeft className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white">Mercato</h1>
              {myClub && (
                <div className="hidden sm:flex items-center gap-1.5 bg-slate-800 rounded-lg px-3 py-1.5">
                  <Euro className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold text-sm">{((myClub.budget || 0) / 1e6).toFixed(0)}M€</span>
                </div>
              )}
            </div>

            <MercatoStatusBanner />

            {/* Tabs */}
            <div className="flex bg-slate-800 rounded-xl p-1 gap-1">
              <button onClick={() => setTab('transfers')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'transfers' ? 'bg-emerald-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                <ArrowRightLeft className="w-4 h-4" /><span className="hidden sm:inline">Transferts</span>
              </button>
              <button onClick={() => setTab('search')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'search' ? 'bg-violet-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                <Search className="w-4 h-4" /><span className="hidden sm:inline">Recherche</span>
              </button>
              <button onClick={() => setTab('officialisations')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'officialisations' ? 'bg-blue-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                <CheckCircle2 className="w-4 h-4" /><span className="hidden sm:inline">Officialisations</span>
              </button>
              <button onClick={() => setTab('auctions')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'auctions' ? 'bg-amber-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                <Gavel className="w-4 h-4" /><span className="hidden sm:inline">Enchères</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* ── SEARCH TAB ── */}
        {tab === 'search' && (
          <div className="space-y-6">
            {/* FIFA FUT Filter Grid */}
            <div className="bg-slate-900 border border-violet-500/30 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-violet-500 flex items-center justify-center">
                  <Search className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-white font-bold text-sm uppercase tracking-wider">Rechercher un joueur</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Nom */}
                <div className="col-span-2 sm:col-span-1 bg-slate-800 border-2 border-yellow-500/60 rounded-xl p-3 flex flex-col gap-2">
                  <p className="text-yellow-400 text-xs font-bold uppercase tracking-wider">Nom du joueur</p>
                  <div className="flex items-center gap-2 bg-slate-700 rounded-lg px-2 py-1.5">
                    <Search className="w-3 h-3 text-slate-400 shrink-0" />
                    <input type="text" placeholder="Tous" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      className="bg-transparent text-white text-xs focus:outline-none w-full" />
                    {searchQuery && <button onClick={() => setSearchQuery('')}><X className="w-3 h-3 text-slate-500 hover:text-white" /></button>}
                  </div>
                  <p className="text-slate-500 text-xs">{searchQuery || 'Tous'}</p>
                </div>

                {/* OVR */}
                <div className="bg-slate-800 border border-slate-600 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                      <Trophy className="w-3 h-3 text-white" />
                    </div>
                    <p className="text-slate-300 text-xs font-bold uppercase tracking-wider">OVR</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <input type="number" placeholder="Min" value={filterMinOvr} onChange={e => setFilterMinOvr(e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 text-white text-xs text-center rounded-lg px-1 py-1.5 focus:outline-none focus:border-yellow-500" />
                    <span className="text-slate-500 text-xs">-</span>
                    <input type="number" placeholder="Max" value={filterMaxOvr} onChange={e => setFilterMaxOvr(e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 text-white text-xs text-center rounded-lg px-1 py-1.5 focus:outline-none focus:border-yellow-500" />
                  </div>
                  <p className="text-slate-500 text-xs text-center">{filterMinOvr || filterMaxOvr ? `${filterMinOvr||'?'} - ${filterMaxOvr||'?'}` : 'Tous'}</p>
                </div>

                {/* Position */}
                <div className="bg-slate-800 border border-slate-600 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                      <Users className="w-3 h-3 text-white" />
                    </div>
                    <p className="text-slate-300 text-xs font-bold uppercase tracking-wider">Position</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {POSITIONS.map(pos => (
                      <button key={pos} onClick={() => setFilterPos(filterPos === pos ? '' : pos)}
                        className={`px-1.5 py-0.5 rounded text-xs font-bold transition-all ${filterPos === pos ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'}`}>
                        {pos}
                      </button>
                    ))}
                  </div>
                  <p className="text-slate-500 text-xs">{filterPos || 'Toutes'}</p>
                </div>

                {/* Potentiel */}
                <div className="bg-slate-800 border border-slate-600 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                      <Star className="w-3 h-3 text-white" />
                    </div>
                    <p className="text-slate-300 text-xs font-bold uppercase tracking-wider">Potentiel</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <input type="number" placeholder="Min" value={filterMinPot} onChange={e => setFilterMinPot(e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 text-white text-xs text-center rounded-lg px-1 py-1.5 focus:outline-none focus:border-violet-500" />
                    <span className="text-slate-500 text-xs">-</span>
                    <input type="number" placeholder="Max" value={filterMaxPot} onChange={e => setFilterMaxPot(e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 text-white text-xs text-center rounded-lg px-1 py-1.5 focus:outline-none focus:border-violet-500" />
                  </div>
                  <p className="text-slate-500 text-xs text-center">{filterMinPot || filterMaxPot ? `${filterMinPot||'?'} - ${filterMaxPot||'?'}` : 'Tous'}</p>
                </div>

                {/* Statut + Clause */}
                <div className="flex flex-col gap-2">
                  <div onClick={() => setFilterOnSale(!filterOnSale)}
                    className={`bg-slate-800 border rounded-xl p-2.5 flex items-center gap-2 cursor-pointer transition-all ${filterOnSale ? 'border-red-500/60 bg-red-500/10' : 'border-slate-600 hover:border-slate-500'}`}>
                    <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${filterOnSale ? 'bg-red-500' : 'bg-slate-600'}`}>
                      <span className="text-xs">🏷️</span>
                    </div>
                    <p className={`text-xs font-bold ${filterOnSale ? 'text-red-300' : 'text-slate-400'}`}>{filterOnSale ? '🔴 À vendre' : 'À vendre'}</p>
                  </div>
                  <div onClick={() => setFilterHasClause(!filterHasClause)}
                    className={`bg-slate-800 border rounded-xl p-2.5 flex items-center gap-2 cursor-pointer transition-all ${filterHasClause ? 'border-amber-500/60 bg-amber-500/10' : 'border-slate-600 hover:border-slate-500'}`}>
                    <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${filterHasClause ? 'bg-amber-500' : 'bg-slate-600'}`}>
                      <span className="text-xs">⚡</span>
                    </div>
                    <p className={`text-xs font-bold ${filterHasClause ? 'text-amber-300' : 'text-slate-400'}`}>Avec clause</p>
                  </div>
                  <div onClick={() => setFilterNoClub(!filterNoClub)}
                    className={`bg-slate-800 border rounded-xl p-2.5 flex items-center gap-2 cursor-pointer transition-all ${filterNoClub ? 'border-blue-500/60 bg-blue-500/10' : 'border-slate-600 hover:border-slate-500'}`}>
                    <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${filterNoClub ? 'bg-blue-500' : 'bg-slate-600'}`}>
                      <span className="text-xs">👤</span>
                    </div>
                    <p className={`text-xs font-bold ${filterNoClub ? 'text-blue-300' : 'text-slate-400'}`}>Sans club</p>
                  </div>
                </div>
              </div>

              {hasActiveSearch && (
                <div className="mt-3 flex justify-end">
                  <button onClick={() => { setFilterPos(''); setFilterMinOvr(''); setFilterMaxOvr(''); setFilterMinPot(''); setFilterMaxPot(''); setFilterOnSale(false); setFilterHasClause(false); setFilterNoClub(false); setSearchQuery(''); }}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                    <X className="w-3 h-3" /> Réinitialiser
                  </button>
                </div>
              )}
            </div>

            {/* Results */}
            {hasActiveSearch && (
              <div>
                <p className="text-slate-400 text-sm mb-3">
                  <span className="text-white font-semibold">{searchResults.length}</span> résultat{searchResults.length !== 1 ? 's' : ''}
                  {searchQuery && <span> pour "<span className="text-violet-400">{searchQuery}</span>"</span>}
                </p>
                {playersLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-violet-500 animate-spin" /></div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center py-10 text-slate-500">
                    <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>Aucun joueur trouvé</p>
                  </div>
                ) : (
                  <div className="bg-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden">
                    <div className="divide-y divide-slate-800">
                      {searchResults.map(player => {
                        const club = allClubs.find(c => c.id === player.club_id);
                        return (
                          <button key={player.id}
                            onClick={() => { if (club) { setSelectedClub(club); } setSelectedPlayer(player); setOfferAmount(player.asking_price || player.value || ''); setTab('transfers'); }}
                            className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-slate-800/60 transition-all text-left group"
                          >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-black text-sm text-white ${player.overall >= 85 ? 'bg-amber-500' : player.overall >= 75 ? 'bg-emerald-600' : player.overall >= 65 ? 'bg-blue-600' : 'bg-slate-600'}`}>
                              {player.overall}
                            </div>
                            {player.image_url ? (
                              <img src={player.image_url} alt={player.name} className="w-9 h-9 rounded-full object-cover border-2 border-slate-700 shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center shrink-0"><Users className="w-4 h-4 text-slate-500" /></div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-white font-semibold text-sm truncate">{player.name}</p>
                                {player.is_on_transfer_list && <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs px-1.5 py-0">À vendre</Badge>}
                                {player.release_clause > 0 && <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs px-1.5 py-0">⚡ Clause</Badge>}
                              </div>
                              <p className="text-slate-400 text-xs">{player.position} · {player.age} ans · {player.nationality}</p>
                            </div>
                            <div className="hidden sm:flex items-center gap-2 shrink-0">
                              {club?.logo_url ? <img src={club.logo_url} alt={club.name} className="w-5 h-5 rounded object-cover" /> : <Shield className="w-4 h-4 text-slate-600" />}
                              <span className="text-slate-400 text-xs">{player.club_name || 'Sans club'}</span>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-emerald-400 font-bold text-sm">{((player.value || 0) / 1e6).toFixed(1)}M€</p>
                              {player.asking_price > 0 && <p className="text-slate-500 text-xs">Demande: {(player.asking_price / 1e6).toFixed(1)}M€</p>}
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!hasActiveSearch && (
              <div className="text-center py-16 text-slate-600">
                <Search className="w-14 h-14 mx-auto mb-4 opacity-20" />
                <p className="text-slate-500">Utilisez les filtres ci-dessus pour rechercher un joueur</p>
              </div>
            )}
          </div>
        )}

        {/* ── TAB CONTENT ── */}
        {tab === 'transfers' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Club sidebar */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden h-fit lg:sticky lg:top-36">
              <div className="px-4 py-3 border-b border-slate-700/50">
                <h2 className="text-white font-bold text-sm uppercase tracking-wider">Clubs</h2>
              </div>
              <div className="p-3 border-b border-slate-700/50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Filtrer les clubs..."
                    value={clubSearchQuery}
                    onChange={e => setClubSearchQuery(e.target.value)}
                    className="w-full bg-slate-700/50 border border-slate-600 text-white rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div className="divide-y divide-slate-700/30 max-h-[500px] overflow-y-auto">
                {clubsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-emerald-500 animate-spin" /></div>
                ) : filteredClubs.filter(c => c.name.toLowerCase().includes(clubSearchQuery.toLowerCase())).map(club => (
                  <button
                    key={club.id}
                    onClick={() => setSelectedClub(club)}
                    className={`w-full flex items-center gap-3 px-4 py-3 transition-all hover:bg-slate-700/40 ${selectedClub?.id === club.id ? 'bg-emerald-500/15 border-l-2 border-emerald-500' : ''}`}
                  >
                    {club.logo_url ? (
                      <img src={club.logo_url} alt={club.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shrink-0">
                        <Shield className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    <div className="flex-1 text-left min-w-0">
                      <p className={`text-sm font-medium truncate ${selectedClub?.id === club.id ? 'text-emerald-300' : 'text-white'}`}>{club.name}</p>
                      <p className="text-xs text-slate-500 truncate">{club.manager_name ? `👤 ${club.manager_name}` : 'Sans manager'}</p>
                    </div>
                    {selectedClub?.id === club.id && <ChevronRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Players area */}
            <div className="lg:col-span-2">
              {!selectedClub ? (
                <div className="bg-slate-800/30 border border-dashed border-slate-700 rounded-2xl p-16 text-center">
                  <Shield className="w-14 h-14 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-400 font-medium">Sélectionnez un club</p>
                  <p className="text-slate-600 text-sm mt-1">ou utilisez l'onglet Recherche pour trouver un joueur</p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-4 mb-5 p-4 bg-slate-800/40 border border-slate-700/50 rounded-2xl">
                    {selectedClub.logo_url ? (
                      <img src={selectedClub.logo_url} alt={selectedClub.name} className="w-12 h-12 rounded-xl object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                        <Shield className="w-6 h-6 text-white" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h2 className="text-lg font-bold text-white">{selectedClub.name}</h2>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                        <span>{clubPlayers.length} joueur{clubPlayers.length > 1 ? 's' : ''}</span>
                        {clubPlayers.filter(p => p.is_on_transfer_list).length > 0 && (
                          <span className="text-red-400 font-medium">· {clubPlayers.filter(p => p.is_on_transfer_list).length} à vendre</span>
                        )}
                        {clubPlayers.filter(p => p.release_clause > 0).length > 0 && (
                          <span className="text-amber-400 font-medium">· {clubPlayers.filter(p => p.release_clause > 0).length} avec clause ⚡</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {playersLoading ? (
                    <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
                  ) : clubPlayers.length === 0 ? (
                    <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-12 text-center">
                      <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400">Aucun joueur dans ce club</p>
                    </div>
                  ) : (
                    <div className="bg-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden">
                      <div className="divide-y divide-slate-800">
                        {clubPlayers.map(player => (
                          <button
                            key={player.id}
                            onClick={() => { setSelectedPlayer(player); setOfferAmount(player.asking_price || player.value || ''); }}
                            className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-slate-800/60 transition-all text-left group"
                          >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-black text-sm text-white ${player.overall >= 85 ? 'bg-amber-500' : player.overall >= 75 ? 'bg-emerald-600' : player.overall >= 65 ? 'bg-blue-600' : 'bg-slate-600'}`}>
                              {player.overall}
                            </div>
                            {player.image_url ? (
                              <img src={player.image_url} alt={player.name} className="w-9 h-9 rounded-full object-cover border-2 border-slate-700 shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center shrink-0"><Users className="w-4 h-4 text-slate-500" /></div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-white font-semibold text-sm">{player.name}</p>
                                {player.is_on_transfer_list && <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs px-1.5 py-0">À vendre</Badge>}
                                {player.release_clause > 0 && <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs px-1.5 py-0">⚡</Badge>}
                              </div>
                              <p className="text-slate-400 text-xs">{player.position} · {player.age} ans · {player.nationality}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-emerald-400 font-bold text-sm">{((player.value || 0) / 1e6).toFixed(1)}M€</p>
                              {player.asking_price > 0 && <p className="text-slate-500 text-xs">{(player.asking_price / 1e6).toFixed(1)}M€</p>}
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── OFFICIALISATIONS TAB ── */}
        {tab === 'officialisations' && !hasActiveSearch && (
          <div className="space-y-4">
            {/* Sub-tabs */}
            <div className="flex gap-2">
              {[
                { key: 'ligue',      label: 'En ligue',   icon: Trophy, color: 'emerald' },
                { key: 'hors_ligue', label: 'Hors Ligue', icon: Globe,  color: 'purple' },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setOfficialTab(t.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                    officialTab === t.key
                      ? t.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                      : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  <t.icon className="w-4 h-4" />
                  {t.label}
                </button>
              ))}
            </div>

            <OfficializationTab currentUser={user} initialSection={officialTab} />
          </div>
        )}

        {/* ── AUCTIONS TAB ── */}
        {tab === 'auctions' && !hasActiveSearch && (
          <div className="space-y-6">
            {(isStaff || user?.has_selected_club) && (
              <div className="flex justify-end">
                <Button onClick={() => setShowAuctionForm(!showAuctionForm)} className="bg-amber-500 hover:bg-amber-600 text-white">
                  <Plus className="w-4 h-4 mr-2" /> Nouvelle enchère
                </Button>
              </div>
            )}

            {showAuctionForm && user && (
              <CreateAuctionForm currentUser={user} onSuccess={() => { setShowAuctionForm(false); queryClient.invalidateQueries({ queryKey: ['auctions'] }); }} />
            )}

            {auctionsLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-amber-500 animate-spin" /></div>
            ) : (
              <>
                {activeAuctions.length > 0 && (
                  <div className="space-y-4">
                    <p className="text-amber-400 font-semibold text-sm flex items-center gap-2">
                      <Gavel className="w-4 h-4" /> Enchères en cours ({activeAuctions.length})
                    </p>
                    {activeAuctions.map(a => <AuctionCard key={a.id} auction={a} currentUser={user} />)}
                  </div>
                )}
                {pendingAuctions.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-amber-400 font-semibold text-sm flex items-center gap-2">
                      ⏳ Enchères en attente ({pendingAuctions.length}) — s'activeront à l'ouverture du mercato
                    </p>
                    {pendingAuctions.map(a => (
                      <div key={a.id} className="bg-slate-800/40 border border-amber-500/20 rounded-xl p-4 flex items-center gap-3 opacity-60">
                        {a.player_image_url ? (
                          <img src={a.player_image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                            <Gavel className="w-4 h-4 text-slate-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm">{a.player_name}</p>
                          <p className="text-slate-400 text-xs">{a.player_position} · {a.player_overall}★ · par {a.seller_club_name}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-amber-400 font-bold text-sm">{((a.starting_price || 0) / 1e6).toFixed(2)}M€</p>
                          <p className="text-slate-500 text-xs">En attente</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeAuctions.length === 0 && closedAuctions.length === 0 && pendingAuctions.length === 0 && (
                  <div className="text-center py-20 text-slate-500">
                    <Gavel className="w-14 h-14 mx-auto mb-4 opacity-20" />
                    <p>Aucune enchère pour le moment</p>
                  </div>
                )}
                {closedAuctions.length > 0 && (
                  <div className="space-y-4">
                    <p className="text-slate-500 font-semibold text-sm">Enchères terminées ({closedAuctions.length})</p>
                    {closedAuctions.map(a => <AuctionCard key={a.id} auction={a} currentUser={user} />)}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── OFFER DIALOG ── */}
      <Dialog open={!!selectedPlayer} onOpenChange={() => { setSelectedPlayer(null); setIsLoanOffer(false); setLoanBuyOption(''); setLoanMandatoryBuyOption(''); }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
              Faire une offre
            </DialogTitle>
          </DialogHeader>
          {selectedPlayer && (
            <div className="space-y-5">
              {/* Player info */}
              <div className="flex items-center gap-4 p-4 bg-slate-800 rounded-xl">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-black text-lg text-white ${selectedPlayer.overall >= 85 ? 'bg-amber-500' : selectedPlayer.overall >= 75 ? 'bg-emerald-600' : 'bg-blue-600'}`}>
                  {selectedPlayer.overall}
                </div>
                {selectedPlayer.image_url ? (
                  <img src={selectedPlayer.image_url} alt={selectedPlayer.name} className="w-11 h-11 rounded-full object-cover border-2 border-slate-600 shrink-0" />
                ) : null}
                <div className="flex-1">
                  <p className="text-white font-bold">{selectedPlayer.name}</p>
                  <p className="text-slate-400 text-sm">{selectedPlayer.position} · {selectedPlayer.age} ans</p>
                  <p className="text-emerald-400 font-semibold text-sm">{((selectedPlayer.value || 0) / 1e6).toFixed(2)}M€</p>
                </div>
              </div>

              {/* Staff club selector */}
              {isStaff && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <p className="text-amber-300 text-xs font-semibold mb-2">🛡️ Staff — Club acheteur</p>
                  <select
                    value={staffBuyingClubId}
                    onChange={e => setStaffBuyingClubId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                  >
                    <option value="">{myClub?.name || 'Mon club'} (par défaut)</option>
                    {allClubs.filter(c => c.id !== selectedPlayer?.club_id).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {activeBuyingClub && (
                    <p className="text-slate-400 text-xs mt-1">Budget : {((activeBuyingClub.budget || 0) / 1e6).toFixed(0)}M€</p>
                  )}
                </div>
              )}

              {/* Clause */}
              {selectedPlayer?.release_clause > 0 && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <p className="text-amber-300 font-semibold text-sm">Clause de libération : <span className="text-amber-200 font-bold">{(selectedPlayer.release_clause / 1e6).toFixed(2)}M€</span></p>
                  </div>
                  <Button
                    onClick={() => activateClause.mutate(selectedPlayer)}
                    disabled={!user?.has_selected_club || !myClub || myClub.budget < selectedPlayer.release_clause || activateClause.isPending}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    {activateClause.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                    Activer la clause
                  </Button>
                </div>
              )}

              <div className="border-t border-slate-700 pt-4 space-y-4">
                <p className="text-slate-400 text-sm font-medium">— ou faire une offre de transfert —</p>

                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">Montant (€)</Label>
                  <Input type="number" value={offerAmount} onChange={e => setOfferAmount(e.target.value)} placeholder="Ex: 5000000" className="bg-slate-800 border-slate-700" />
                  {!isStaff && activeBuyingClub && <p className="text-slate-500 text-xs">Budget : {((activeBuyingClub.budget || 0) / 1e6).toFixed(0)}M€</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">Message (optionnel)</Label>
                  <Textarea value={offerMessage} onChange={e => setOfferMessage(e.target.value)} placeholder="Votre message pour le club vendeur..." className="bg-slate-800 border-slate-700 text-sm resize-none" rows={3} />
                </div>

                {/* Loan section */}
                <div className="space-y-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-blue-400" />
                      <Label className="text-blue-300 font-semibold text-sm cursor-pointer">Prêt avec option d'achat</Label>
                    </div>
                    <Switch checked={isLoanOffer} onCheckedChange={setIsLoanOffer} />
                  </div>
                  {isLoanOffer && (
                    <div className="space-y-3">
                      <p className="text-slate-400 text-xs">Le montant ci-dessus = frais de prêt. Le joueur rejoint directement votre club sans enchère d'officialisation.</p>
                      <div className="space-y-1">
                        <Label className="text-slate-300 text-xs">Option d'achat facultative (€)</Label>
                        <Input type="number" value={loanBuyOption} onChange={e => setLoanBuyOption(e.target.value)} placeholder="Ex: 30000000" className="bg-slate-800 border-slate-700 h-8 text-sm" />
                        {loanBuyOption && <p className="text-slate-500 text-xs">{(parseFloat(loanBuyOption)/1e6).toFixed(2)}M€</p>}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-slate-300 text-xs">Option d'achat obligatoire (€) — prélevée automatiquement à la J.19 si non exercée</Label>
                        <Input type="number" value={loanMandatoryBuyOption} onChange={e => setLoanMandatoryBuyOption(e.target.value)} placeholder="Ex: 50000000" className="bg-slate-800 border-slate-700 h-8 text-sm" />
                        {loanMandatoryBuyOption && <p className="text-slate-500 text-xs">{(parseFloat(loanMandatoryBuyOption)/1e6).toFixed(2)}M€</p>}
                      </div>
                    </div>
                  )}
                </div>

                {activeBuyingClub && parseInt(offerAmount) > (activeBuyingClub.budget || 0) && <p className="text-red-400 text-sm">⚠️ Budget insuffisant</p>}
                {!isStaff && !user?.has_selected_club && <p className="text-amber-400 text-sm">⚠️ Choisissez d'abord un club</p>}

                <Button
                  onClick={() => makeOffer.mutate()}
                  disabled={!canMakeOffer || makeOffer.isPending || !offerAmount}
                  className={`w-full ${isLoanOffer ? 'bg-blue-500 hover:bg-blue-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                >
                  {makeOffer.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : isLoanOffer ? <RefreshCw className="w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  {isLoanOffer ? 'Envoyer l\'offre de prêt' : 'Envoyer l\'offre'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}