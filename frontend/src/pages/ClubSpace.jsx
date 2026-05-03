import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import {
  Shield, Euro, Users, Trophy, ArrowRightLeft,
  Star, Bell, ChevronRight, Loader2, BarChart2,
  Sparkles, Send, TrendingUp, TrendingDown, Crown,
  MessageSquare, Swords, BadgeCheck, Tag, Trash2, X, UserPlus, UserCircle, Globe, Search, ShoppingCart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import MoneyTransferModal from '@/components/dashboard/MoneyTransferModal';
import DevelopmentPlanTab from '@/components/dashboard/DevelopmentPlanTab';
import AcademyTab from '@/components/dashboard/AcademyTab';
import NotificationCenter from '@/components/dashboard/NotificationCenter';
import ClubChat from '@/components/clubspace/ClubChat';
import MatchTab from '@/components/clubspace/MatchTab';
import DeletePlayerButton from '@/components/clubspace/DeletePlayerButton';
import CreatePlayerModal from '@/components/clubspace/CreatePlayerModal';
import EvolutionTab from '@/components/clubspace/EvolutionTab';
import PlayerCard from '@/components/PlayerCard';
import PlayerStatsEditor from '@/components/clubspace/PlayerStatsEditor';
import SquadTable from '@/components/clubspace/SquadTable';
import EAPseudoGate from '@/components/clubspace/EAPseudoGate';
import InboxPanel from '@/components/clubspace/InboxPanel';
import MakeOfferModal from '@/components/clubspace/MakeOfferModal';
import ProfileTab from '@/components/clubspace/ProfileTab';
import PlayerMessagesPanel from '@/components/clubspace/PlayerMessagesPanel';
import TransferOffer from '@/components/TransferOffer';
import PlayerNegotiationDialog from '@/components/clubspace/PlayerNegotiationDialog';
import HorsLigueStaffView from '@/components/clubspace/HorsLigueStaffView';
import BudgetChart from '@/components/clubspace/BudgetChart';
import BuyBudgetTab from '@/components/clubspace/BuyBudgetTab';
import TabPanel from '@/components/clubspace/TabPanel';
import { fetchAll } from '@/utils/fetchAll';

const STAFF_ROLES = ['owner', 'admin', 'staff_mercato', 'staff_championnat', 'staff_developpement', 'staff_formation'];

function LoanInlineForm({ player, clubId, onDone }) {
  const [loanPrice, setLoanPrice] = React.useState(player.loan_asking_price || '');
  const [saving, setSaving] = React.useState(false);
  const handleConfirm = async () => {
    setSaving(true);
    await base44.entities.Player.update(player.id, {
      is_on_loan_list: true,
      loan_asking_price: parseInt(loanPrice) || 0,
    });
    onDone();
  };
  return (
    <div className="space-y-2">
      <Input
        type="number"
        value={loanPrice}
        onChange={e => setLoanPrice(e.target.value)}
        placeholder="Frais de prêt (€) — optionnel"
        className="bg-slate-800 border-slate-600 text-white"
      />
      {loanPrice ? <p className="text-slate-400 text-xs">{(parseFloat(loanPrice) / 1e6).toFixed(2)}M€</p> : null}
      <Button onClick={handleConfirm} disabled={saving} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white">
        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        🤝 Mettre sur la liste de prêt
      </Button>
    </div>
  );
}
const OWNER_ROLES = ['owner', 'admin'];
const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];

export default function ClubSpace() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [moneyTransferOpen, setMoneyTransferOpen] = useState(false);
  const [selectedClubId, setSelectedClubId] = useState(null);
  const [createPlayerOpen, setCreatePlayerOpen] = useState(false);
  const [makeOfferOpen, setMakeOfferOpen] = useState(false);
  const [negotiationDialog, setNegotiationDialog] = useState({ open: false, player: null, transfer: null });

  // Squad management state
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [transferListDialog, setTransferListDialog] = useState(false);
  const [askingPrice, setAskingPrice] = useState('');
  const [confirmRelease, setConfirmRelease] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        if (!userData.has_selected_club && !STAFF_ROLES.includes(userData.role)) {
          navigate(createPageUrl('Home'));
        }
        // Owner/admin can switch clubs, default to their own club
        if (!OWNER_ROLES.includes(userData.role)) {
          setSelectedClubId(userData.club_id);
        } else {
          setSelectedClubId(userData.club_id || null);
        }
      } catch (e) {
        base44.auth.redirectToLogin(createPageUrl('ClubSpace'));
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [navigate]);

  const clubId = selectedClubId || user?.club_id;

  const isOwner = user ? OWNER_ROLES.includes(user.role) : false;
  const isStaffRole = user ? STAFF_ROLES.includes(user.role) : false;
  const isStaffChampionnat = user ? (user.role === 'staff_championnat' || OWNER_ROLES.includes(user.role)) : false;
  // Manager simple (non-staff) gérant son propre club : peut saisir matchs/evo/CDF, mais pas modifier joueurs ni supprimer matchs
  const isRegularManager = user ? (!isStaffRole && user.club_id === clubId) : false;

  const [clubSearch, setClubSearch] = useState('');

  const { data: allClubs = [], isLoading: allClubsLoading } = useQuery({
    queryKey: ['all-clubs'],
    queryFn: () => base44.entities.Club.list(),
    staleTime: 0,
    gcTime: 60000,
    refetchInterval: false,
    retry: 1,
  });

  const { data: sansLigueClubs = [] } = useQuery({
    queryKey: ['sans-ligue-clubs-staff'],
    queryFn: () => base44.entities.SansLigueClub.filter({ is_active: true }, 'name', 500),
    enabled: isOwner,
  });

  // Auto-select first club for owner if no club assigned
  useEffect(() => {
    if (isOwner && allClubs.length > 0 && !clubId) {
      setSelectedClubId(allClubs[0].id);
    }
  }, [isOwner, allClubs, clubId]);

  const club = allClubs.find(c => c.id === clubId) || null;
  const sansLigueClub = sansLigueClubs.find(c => c.id === clubId) || null;
  const isHorsLigueSelected = !club && !!sansLigueClub;
  const clubLoading = allClubsLoading;
  const refetchClub = () => queryClient.invalidateQueries({ queryKey: ['all-clubs'] });

  const { data: players = [], isLoading: playersLoading } = useQuery({
    queryKey: ['my-players', clubId],
    queryFn: async () => {
      const all = await fetchAll('Player');
      return all.filter(p => p.club_id === clubId);
    },
    enabled: !!clubId,
    staleTime: 30000,
    gcTime: 60000,
    refetchInterval: false,
    retry: 1,
  });

  const { data: incomingOffers = [] } = useQuery({
    queryKey: ['incoming-offers', clubId],
    queryFn: async () => {
      const result = await fetchAll('Transfer');
      return (result || []).filter(t => t.from_club_id === clubId && ['pending', 'negotiating', 'accepted'].includes(t.status));
    },
    enabled: !!clubId,
    staleTime: 30000,
    retry: 1,
  });

  const { data: outgoingOffers = [] } = useQuery({
    queryKey: ['outgoing-offers', clubId],
    queryFn: async () => {
      const result = await fetchAll('Transfer');
      return (result || []).filter(t => t.to_club_id === clubId && ['pending', 'negotiating', 'accepted'].includes(t.status));
    },
    enabled: !!clubId,
    staleTime: 30000,
    retry: 1,
  });

  const clubName = club?.name;

  const { data: activeLoans = [] } = useQuery({
    queryKey: ['active-loans', clubId, clubName],
    queryFn: async () => {
      if (!clubName) return [];
      const auctions = await base44.entities.Auction.list('-created_date', 200);
      return auctions.filter(a =>
        a.is_loan === true &&
        a.loan_mandatory_buy_option > 0 &&
        a.loan_buy_option_exercised !== true &&
        a.status === 'completed' &&
        a.current_bidder_club === clubName
      );
    },
    enabled: !!clubId && !!clubName,
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  });

  const { data: receivedLoans = [] } = useQuery({
    queryKey: ['received-loans', clubId, clubName],
    queryFn: async () => {
      if (!clubName) return [];
      const auctions = await base44.entities.Auction.list('-created_date', 200);
      return auctions.filter(a =>
        a.is_loan === true &&
        a.status === 'completed' &&
        a.loan_buy_option_exercised !== true &&
        a.current_bidder_club === clubName
      );
    },
    enabled: !!clubId && !!clubName,
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  });

  const { data: arrivals = [] } = useQuery({
    queryKey: ['arrivals', clubId],
    queryFn: async () => {
      const all = await fetchAll('Transfer');
      return all.filter(t => t.to_club_id === clubId && t.status === 'completed');
    },
    enabled: !!clubId,
    staleTime: 120000,
    gcTime: 300000,
    refetchInterval: false,
    retry: 1,
  });

  const { data: departures = [] } = useQuery({
    queryKey: ['departures', clubId],
    queryFn: async () => {
      const all = await fetchAll('Transfer');
      return all.filter(t => t.from_club_id === clubId && t.status === 'completed');
    },
    enabled: !!clubId,
    staleTime: 120000,
    gcTime: 300000,
    refetchInterval: false,
    retry: 1,
  });

  const { data: moneyTransfers = { sent: [], received: [] } } = useQuery({
    queryKey: ['money-transfers', clubId],
    queryFn: async () => {
      const all = await base44.entities.MoneyTransfer.list('-created_date', 40);
      const sent = all.filter(t => t.from_club_id === clubId).slice(0, 20);
      const received = all.filter(t => t.to_club_id === clubId).slice(0, 20);
      return { sent, received };
    },
    enabled: !!clubId,
    staleTime: 120000,
    gcTime: 300000,
    retry: 1,
    refetchInterval: false,
  });

  const { data: mercatoWindow } = useQuery({
    queryKey: ['mercato-window'],
    queryFn: async () => {
      const list = await base44.entities.MercatoWindow.list('-created_date', 1);
      return list[0] || null;
    },
    staleTime: 30000,
    retry: 1,
  });

  const isMercatoOpen = mercatoWindow?.is_open === true;


  const { data: playerMessages = [] } = useQuery({
    queryKey: ['player-messages-squad', clubId],
    queryFn: () => base44.entities.PlayerMessage.filter({ club_id: clubId }, '-created_date', 100),
    enabled: !!clubId && !playersLoading,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  });

  const playerMorales = {};
  playerMessages.forEach(m => {
    if (m.morale != null && !playerMorales[m.player_id]) {
      playerMorales[m.player_id] = m.morale;
    }
  });

  const returnLoan = useMutation({
    mutationFn: async (auction) => {
      if (auction.player_id) {
        await base44.entities.Player.update(auction.player_id, {
          club_id: auction.seller_club_id,
          club_name: auction.seller_club_name,
          is_on_transfer_list: false,
        });
      }
      await base44.entities.Auction.update(auction.id, { status: 'closed', loan_buy_option_exercised: false });
      try {
        const allUsers = await base44.entities.User.list();
        const sellerUser = allUsers.find(u => u.club_id === auction.seller_club_id && u.has_selected_club);
        if (sellerUser) {
          await base44.entities.Notification.create({
            user_id: sellerUser.id, club_id: auction.seller_club_id, type: 'transfer_offer',
            title: `Prêt terminé — ${auction.player_name}`,
            message: `${club.name} a renvoyé ${auction.player_name}. Le joueur est de retour dans votre effectif.`,
            is_read: false, link_page: 'ClubSpace'
          });
        }
      } catch (e) {}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['received-loans', clubId] });
      queryClient.invalidateQueries({ queryKey: ['my-players', clubId] });
    }
  });

  const exerciseMandatoryBuyOption = useMutation({
    mutationFn: async (auction) => {
      const amount = auction.loan_mandatory_buy_option;
      const buyerClub = club;
      const sellerClub = allClubs.find(c => c.id === auction.seller_club_id);
      if (!buyerClub || !sellerClub) throw new Error('Clubs introuvables');
      if ((buyerClub.budget || 0) < amount) throw new Error('Budget insuffisant');

      await base44.entities.Club.update(buyerClub.id, { budget: (buyerClub.budget || 0) - amount });
      await base44.entities.Club.update(sellerClub.id, { budget: (sellerClub.budget || 0) + amount });
      await base44.entities.Auction.update(auction.id, { loan_buy_option_exercised: true });

      try {
        const allUsers = await base44.entities.User.list();
        const sellerUser = allUsers.find(u => u.club_id === sellerClub.id && u.has_selected_club);
        if (sellerUser) {
          await base44.entities.Notification.create({
            user_id: sellerUser.id, club_id: sellerClub.id, type: 'transfer_offer',
            title: `Option obligatoire exercée — ${auction.player_name}`,
            message: `${buyerClub.name} a exercé l'option d'achat obligatoire de ${(amount / 1e6).toFixed(2)}M€ pour ${auction.player_name}.`,
            is_read: false, link_page: 'Community'
          });
        }
      } catch (e) {}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-loans', clubId] });
      queryClient.invalidateQueries({ queryKey: ['all-clubs'] });
    }
  });

  // Squad mutations
  const toggleTransferList = useMutation({
    mutationFn: async ({ player, onList, price }) => {
      await base44.entities.Player.update(player.id, {
        is_on_transfer_list: onList,
        asking_price: price || player.value
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-players', clubId] });
      setTransferListDialog(false);
      setSelectedPlayer(null);
      setAskingPrice('');
    }
  });

  const deletePlayer = useMutation({
    mutationFn: (playerId) => base44.entities.Player.delete(playerId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-players', clubId] }),
  });

  const releasePlayer = useMutation({
    mutationFn: async (player) => {
      // Créer une officialisation de libération
      const now = new Date().toISOString();
      await base44.entities.Auction.create({
        player_id: player.id,
        player_name: player.name,
        player_position: player.position || '',
        player_overall: player.overall || 0,
        player_age: player.age || null,
        player_nationality: player.nationality || '',
        player_image_url: player.image_url || '',
        seller_club_id: player.club_id,
        seller_club_name: player.club_name || club?.name || 'Inconnu',
        starting_price: 0,
        current_price: 0,
        current_bidder_club: 'Agent libre',
        last_bid_at: now,
        ends_at: now,
        is_external_player: false,
        transfer_type: 'ligue',
        status: 'completed',
        is_loan: false,
        reactions: {},
      });
      await base44.entities.Player.update(player.id, {
        club_id: null,
        club_name: null,
        is_on_transfer_list: false,
        asking_price: null
      });
      if (clubId && player.value) {
        const currentClub = allClubs.find(c => c.id === clubId);
        if (currentClub) {
          await base44.entities.Club.update(clubId, { budget: (currentClub.budget || 0) + player.value });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-players', clubId] });
      queryClient.invalidateQueries({ queryKey: ['all-clubs'] });
      setTransferListDialog(false);
      setSelectedPlayer(null);
      setConfirmRelease(false);
    }
  });

  const handleOffer = useMutation({
    mutationFn: async ({ transfer, action, counterAmount, counterExtra }) => {
      const history = transfer.negotiation_history || [];
      if (action === 'accept') {
        const now = new Date().toISOString();
        const isLoan = transfer.offer_type === 'loan';
        const isSwap = transfer.offer_type === 'swap';
        const isReleaseClause = transfer.is_release_clause === true;

        // Récupérer les infos du joueur
        let playerData = null;
        if (transfer.player_id) {
          try {
            const allPlayers = await fetchAll('Player');
            playerData = allPlayers.find(p => p.id === transfer.player_id) || null;
          } catch (e) { /* ignore */ }
        }

        let buyer = null;
        try {
          const allUsers = await base44.entities.User.list();
          buyer = allUsers.find(u => u.club_id === transfer.to_club_id && u.has_selected_club);
        } catch (e) { /* non-admin, ignore */ }

        if (isReleaseClause) {
          // CLAUSE DE LIBÉRATION : transfert direct sans enchère
          const clauseAmount = transfer.amount;
          const buyerClubData = allClubs.find(c => c.id === transfer.to_club_id);
          const sellerClubData = allClubs.find(c => c.id === transfer.from_club_id);
          if (buyerClubData) await base44.entities.Club.update(transfer.to_club_id, { budget: (buyerClubData.budget || 0) - clauseAmount });
          if (sellerClubData) await base44.entities.Club.update(transfer.from_club_id, { budget: (sellerClubData.budget || 0) + clauseAmount });
          if (transfer.player_id) {
            await base44.entities.Player.update(transfer.player_id, {
              club_id: transfer.to_club_id, club_name: transfer.to_club_name,
              is_on_transfer_list: false, asking_price: null, release_clause: null
            });
          }
          // Officialisation directe (pas d'enchère)
          await base44.entities.Auction.create({
            player_id: transfer.player_id,
            player_name: transfer.player_name,
            player_position: '', player_overall: 0,
            seller_club_id: transfer.from_club_id, seller_club_name: transfer.from_club_name,
            starting_price: clauseAmount, current_price: clauseAmount,
            current_bidder_club: transfer.to_club_name,
            last_bid_at: now, ends_at: now,
            is_external_player: false, transfer_type: 'ligue', status: 'completed',
            is_loan: false, reactions: {}
          });
          await base44.entities.Transfer.update(transfer.id, {
            status: 'completed',
            negotiation_history: [...history, { from_club: transfer.from_club_name, amount: clauseAmount, action: 'release_clause_accepted' }]
          });
          let buyer = null;
          try { const u = await base44.entities.User.list(); buyer = u.find(u2 => u2.club_id === transfer.to_club_id && u2.has_selected_club); } catch(e) {}
          if (buyer) {
            await base44.entities.Notification.create({
              user_id: buyer.id, club_id: transfer.to_club_id, type: 'transfer_offer',
              title: `Clause acceptée ! ${transfer.player_name}`,
              message: `${transfer.from_club_name} a accepté la clause de libération. ${transfer.player_name} rejoint directement votre club pour ${(clauseAmount/1e6).toFixed(2)}M€.`,
              is_read: false, link_page: 'Community'
            });
          }
        } else if (isSwap) {
          // ÉCHANGE : déplacer les deux joueurs
          if (transfer.player_id) {
            await base44.entities.Player.update(transfer.player_id, {
              club_id: transfer.to_club_id, club_name: transfer.to_club_name,
              is_on_transfer_list: false, asking_price: null
            });
          }
          if (transfer.swap_player_id) {
            await base44.entities.Player.update(transfer.swap_player_id, {
              club_id: transfer.from_club_id, club_name: transfer.from_club_name,
              is_on_transfer_list: false, asking_price: null
            });
          }
          // Soulte éventuelle
          if (transfer.amount > 0) {
            const buyerClubData = allClubs.find(c => c.id === transfer.to_club_id);
            const sellerClubData = allClubs.find(c => c.id === transfer.from_club_id);
            if (buyerClubData) await base44.entities.Club.update(transfer.to_club_id, { budget: (buyerClubData.budget || 0) - transfer.amount });
            if (sellerClubData) await base44.entities.Club.update(transfer.from_club_id, { budget: (sellerClubData.budget || 0) + transfer.amount });
          }
          // Officialiser l'échange
          await base44.entities.Auction.create({
            player_name: `${transfer.player_name} ⇄ ${transfer.swap_player_name}`,
            player_position: '', player_overall: 0,
            seller_club_id: transfer.from_club_id, seller_club_name: transfer.from_club_name,
            starting_price: transfer.amount || 0, current_price: transfer.amount || 0,
            current_bidder_club: transfer.to_club_name,
            last_bid_at: now, ends_at: now,
            is_external_player: false, transfer_type: 'ligue', status: 'completed',
            is_loan: false, reactions: {}
          });
          await base44.entities.Transfer.update(transfer.id, {
            status: 'completed',
            negotiation_history: [...history, { from_club: transfer.from_club_name, amount: transfer.amount, action: 'swap_accepted' }]
          });
          if (buyer) {
            await base44.entities.Notification.create({
              user_id: buyer.id, club_id: transfer.to_club_id, type: 'transfer_offer',
              title: `Échange accepté ! ${transfer.player_name} ⇄ ${transfer.swap_player_name}`,
              message: `${transfer.from_club_name} a accepté l'échange. Les joueurs ont rejoint leur nouveau club.`,
              is_read: false, link_page: 'Community'
            });
          }
        } else if (isLoan) {
          // PRÊT : officialisation directe, pas d'enchère
          if (transfer.amount > 0) {
            const buyerClubData = allClubs.find(c => c.id === transfer.to_club_id);
            const sellerClubData = allClubs.find(c => c.id === transfer.from_club_id);
            if (buyerClubData) await base44.entities.Club.update(transfer.to_club_id, { budget: (buyerClubData.budget || 0) - transfer.amount });
            if (sellerClubData) await base44.entities.Club.update(transfer.from_club_id, { budget: (sellerClubData.budget || 0) + transfer.amount });
          }
          // Récupérer la saison active pour savoir quand le prêt a commencé
          let currentSeasonNumber = 1;
          try {
            const seasons = await base44.entities.Season.list('-season_number', 1);
            const activeSeason = seasons.find(s => s.is_active);
            if (activeSeason) currentSeasonNumber = activeSeason.season_number;
          } catch (e) {}
          // Assigner le joueur au nouveau club directement
          if (transfer.player_id) {
            await base44.entities.Player.update(transfer.player_id, {
              club_id: transfer.to_club_id, club_name: transfer.to_club_name,
              is_on_transfer_list: false, asking_price: null
            });
          }
          // Créer une officialisation directe (completed)
          await base44.entities.Auction.create({
            player_id: transfer.player_id,
            player_name: transfer.player_name,
            player_position: playerData?.position || '',
            player_overall: playerData?.overall || 0,
            player_age: playerData?.age || null,
            player_nationality: playerData?.nationality || '',
            player_image_url: playerData?.image_url || '',
            seller_club_id: transfer.from_club_id,
            seller_club_name: transfer.from_club_name,
            starting_price: transfer.amount,
            current_price: transfer.amount,
            current_bidder_id: buyer?.id || transfer.to_club_id,
            current_bidder_name: buyer?.full_name || null,
            current_bidder_club: transfer.to_club_name,
            last_bid_at: now,
            is_external_player: false,
            transfer_type: 'ligue',
            status: 'completed',
            is_loan: true,
            loan_buy_option: transfer.loan_buy_option || 0,
            loan_mandatory_buy_option: transfer.loan_mandatory_buy_option || 0,
            loan_buy_option_exercised: false,
            ends_at: now,
            transfer_id: transfer.id,
            reactions: {}
          });
          await base44.entities.Transfer.update(transfer.id, {
            status: 'completed',
            season_at_creation: currentSeasonNumber,
            negotiation_history: [...history, { from_club: transfer.from_club_name, amount: transfer.amount, action: 'loan_accepted' }]
          });
          if (buyer) {
            await base44.entities.Notification.create({
              user_id: buyer.id, club_id: transfer.to_club_id, type: 'transfer_offer',
              title: `Prêt accepté ! ${transfer.player_name}`,
              message: `${transfer.from_club_name} a accepté le prêt. ${transfer.player_name} rejoint directement votre club.`,
              is_read: false, link_page: 'Community'
            });
          }
          let sellerLoan = null;
          try {
            const u2 = await base44.entities.User.list();
            sellerLoan = u2.find(u => u.club_id === transfer.from_club_id && u.has_selected_club);
          } catch (e) {}
          if (sellerLoan) {
            await base44.entities.Notification.create({
              user_id: sellerLoan.id, club_id: transfer.from_club_id, type: 'transfer_offer',
              title: `Prêt de ${transfer.player_name} officialisé`,
              message: `Prêt à ${transfer.to_club_name} à ${(transfer.amount / 1e6).toFixed(2)}M€ de frais. Officialisation directe.`,
              is_read: false, link_page: 'Community'
            });
          }
        } else {
          // TRANSFERT CLASSIQUE : on marque 'accepted', l'acheteur doit négocier avec le joueur avant l'enchère
          await base44.entities.Transfer.update(transfer.id, {
            status: 'accepted',
            negotiation_history: [...history, { from_club: transfer.from_club_name, amount: transfer.amount, action: 'accepted' }]
          });
          if (buyer) {
            await base44.entities.Notification.create({
              user_id: buyer.id, club_id: transfer.to_club_id, type: 'transfer_offer',
              title: `Accord conclu ! ${transfer.player_name}`,
              message: `${transfer.from_club_name} a accepté votre offre de ${(transfer.amount / 1e6).toFixed(2)}M€. Allez dans Mon Club > Transferts pour négocier avec le joueur.`,
              is_read: false, link_page: 'ClubSpace'
            });
          }
          let seller = null;
          try {
            const allUsers2 = await base44.entities.User.list();
            seller = allUsers2.find(u => u.club_id === transfer.from_club_id && u.has_selected_club);
          } catch (e) { /* ignore */ }
          if (seller) {
            await base44.entities.Notification.create({
              user_id: seller.id, club_id: transfer.from_club_id, type: 'transfer_offer',
              title: `Offre acceptée pour ${transfer.player_name}`,
              message: `Vous avez accepté l'offre de ${transfer.to_club_name} à ${(transfer.amount / 1e6).toFixed(2)}M€. Le club acheteur doit maintenant négocier avec le joueur.`,
              is_read: false, link_page: 'ClubSpace'
            });
          }
        }
      } else if (action === 'cancel') {
        await base44.entities.Transfer.update(transfer.id, {
          status: 'rejected',
          negotiation_history: [...history, { from_club: transfer.to_club_name, amount: transfer.amount, action: 'cancelled' }]
        });
      } else if (action === 'reject') {
        await base44.entities.Transfer.update(transfer.id, {
          status: 'rejected',
          negotiation_history: [...history, { from_club: transfer.from_club_name, amount: transfer.amount, action: 'rejected' }]
        });
      } else if (action === 'counter') {
        const isSellerCountering = clubId === transfer.from_club_id;
        const updatedHistory = [...history, {
          from_club: isSellerCountering ? transfer.from_club_name : transfer.to_club_name,
          amount: transfer.amount, action: 'counter'
        }];
        await base44.entities.Transfer.update(transfer.id, {
          amount: counterAmount,
          status: 'negotiating',
          last_offer_by: clubId,
          negotiation_history: updatedHistory,
          ...(counterExtra || {}),
        });
        try {
          const allUsers = await base44.entities.User.list();
          const otherClubId = isSellerCountering ? transfer.to_club_id : transfer.from_club_id;
          const otherUser = allUsers.find(u => u.club_id === otherClubId && u.has_selected_club);
          if (otherUser) {
            await base44.entities.Notification.create({
              user_id: otherUser.id, club_id: otherClubId, type: 'transfer_offer',
              title: `Contre-offre pour ${transfer.player_name}`,
              message: `${isSellerCountering ? transfer.from_club_name : transfer.to_club_name} propose ${(counterAmount / 1e6).toFixed(2)}M€.`,
              is_read: false, link_page: 'ClubSpace'
            });
          }
        } catch (e) { /* ignore notification error */ }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incoming-offers', clubId] });
      queryClient.invalidateQueries({ queryKey: ['outgoing-offers', clubId] });
      queryClient.invalidateQueries({ queryKey: ['my-players', clubId] });
      queryClient.invalidateQueries({ queryKey: ['all-clubs'] });
    }
  });

  const openTransferDialog = (player) => {
    setSelectedPlayer(player);
    setAskingPrice(player.asking_price || player.value || '');
    setConfirmRelease(false);
    setTransferListDialog(true);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
    </div>
  );

  // Bloquer l'accès si le manager n'a pas soumis sa présentation (non-staff uniquement)
  if (user && !isStaffRole && user.has_selected_club && !user.intro_submitted && club) {
    return <EAPseudoGate user={user} club={club} onComplete={() => window.location.reload()} />;
  }

  if (!user?.club_id && !isOwner) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-center px-4">
      <Shield className="w-16 h-16 text-slate-600" />
      <h2 className="text-2xl font-bold text-white">Aucun club sélectionné</h2>
      <p className="text-slate-400">Vous devez d'abord choisir un club.</p>
      <Link to={createPageUrl('SelectClub')}>
        <Button className="bg-emerald-500 hover:bg-emerald-600">Choisir un club</Button>
      </Link>
    </div>
  );

  if (clubLoading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
    </div>
  );

  // Pour les clubs hors-ligue, on crée un objet "club" synthétique pour réutiliser le même layout
  if (isHorsLigueSelected && isOwner) {
    const fakeClub = {
      id: sansLigueClub.id,
      name: sansLigueClub.name,
      logo_url: sansLigueClub.logo_url || '',
      budget: 0,
      points: 0, wins: 0, draws: 0, losses: 0,
      goals_for: 0, goals_against: 0,
      manager_name: '—',
      championship: 'hors-ligue',
      championships: [],
      _isHorsLigue: true,
    };
    // Redirige vers le rendu principal avec fakeClub
    // On remplace temporairement club par fakeClub
    const hlPlayers = players; // players filtrés par club_id = sansLigueClub.id mais club_name match
    return (
      <HorsLigueStaffView
        sansLigueClub={sansLigueClub}
        players={hlPlayers}
        isOwner={isOwner}
        user={user}
        headerExtra={
          <div className="mb-4 flex items-center gap-3 relative">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={clubSearch}
                onChange={e => setClubSearch(e.target.value)}
                placeholder="Rechercher un club (ligue ou hors-ligue)..."
                className="bg-slate-800/80 border-slate-700 text-white pl-9 h-9 text-sm"
              />
            </div>
            {clubSearch.trim() && (
              <div className="absolute top-10 left-0 z-50 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                {[
                  ...allClubs.filter(c => c.name.toLowerCase().includes(clubSearch.toLowerCase())).map(c => ({ ...c, _type: 'ligue' })),
                  ...sansLigueClubs.filter(c => c.name.toLowerCase().includes(clubSearch.toLowerCase())).map(c => ({ ...c, _type: 'horsligue' }))
                ].slice(0, 20).map(c => (
                  <button
                    key={`${c._type}-${c.id}`}
                    onClick={() => { setSelectedClubId(c.id); setClubSearch(''); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-700 transition-colors flex items-center justify-between gap-2"
                  >
                    <span className="text-white text-sm truncate">{c.name}</span>
                    {c._type === 'horsligue' && <span className="text-blue-400 text-xs shrink-0">Hors-ligue</span>}
                  </button>
                ))}
                {allClubs.filter(c => c.name.toLowerCase().includes(clubSearch.toLowerCase())).length === 0 &&
                 sansLigueClubs.filter(c => c.name.toLowerCase().includes(clubSearch.toLowerCase())).length === 0 && (
                  <p className="text-slate-500 text-sm text-center py-4">Aucun club trouvé</p>
                )}
              </div>
            )}
          </div>
        }
      />
    );
  }

  if (!club) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
    </div>
  );

  // leagueContext doit être calculé avant le return conditionnel
  const clubChampionshipsEarly = club ? (club.championships || (club.championship ? [club.championship] : [])) : [];
  const leagueClubsEarly = clubChampionshipsEarly.length > 0
    ? allClubs.filter(c => c.championships && c.championships.some(ch => clubChampionshipsEarly.includes(ch)))
    : allClubs;
  const sortedLeagueClubsEarly = [...leagueClubsEarly].sort((a, b) => (b.points - a.points) || ((b.goals_for - b.goals_against) - (a.goals_for - a.goals_against)));
  const allChampionshipSlugsEarly = [...new Set(allClubs.flatMap(c => c.championships || []))];
  const leagueContext = club ? {
    leagueName: clubChampionshipsEarly.join(', ') || 'Championnat principal',
    leagueRank: sortedLeagueClubsEarly.findIndex(c => c.id === club.id) + 1,
    totalLeagueClubs: leagueClubsEarly.length,
    allLeaguesInGame: allChampionshipSlugsEarly,
    isTopLeague: allChampionshipSlugsEarly.length > 0 && clubChampionshipsEarly.some(ch => ch === allChampionshipSlugsEarly[0]),
    topClubsInLeague: sortedLeagueClubsEarly.slice(0, 3).map(c => c.name),
  } : null;

  const sortedClubs = [...allClubs].sort((a, b) => {
    const ptsA = b.points - a.points;
    if (ptsA !== 0) return ptsA;
    return (b.goals_for - b.goals_against) - (a.goals_for - a.goals_against);
  });
  const rank = sortedClubs.findIndex(c => c.id === club.id) + 1;
  const totalClubs = allClubs.length;
  const goalDiff = (club.goals_for || 0) - (club.goals_against || 0);
  const avgOverall = players.length > 0
    ? Math.round(players.reduce((s, p) => s + (p.overall || 0), 0) / players.length) : 0;

  const groupedPlayers = {
    GK: players.filter(p => p.position === 'GK'),
    DEF: players.filter(p => ['CB', 'LB', 'RB'].includes(p.position)),
    MID: players.filter(p => ['CDM', 'CM', 'CAM'].includes(p.position)),
    ATT: players.filter(p => ['LW', 'RW', 'ST'].includes(p.position))
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10" />
        <div className="relative max-w-7xl mx-auto px-4 py-6">
          {/* Owner club selector — recherche uniquement */}
          {isOwner && (
            <div className="mb-4 flex items-center gap-3">
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={clubSearch}
                  onChange={e => setClubSearch(e.target.value)}
                  placeholder="Rechercher un club (ligue ou hors-ligue)..."
                  className="bg-slate-800/80 border-slate-700 text-white pl-9 h-9 text-sm"
                />
              </div>
              {clubSearch.trim() && (
                <div className="absolute mt-12 z-50 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                  {[
                    ...allClubs.filter(c => c.name.toLowerCase().includes(clubSearch.toLowerCase())).map(c => ({ ...c, _type: 'ligue' })),
                    ...sansLigueClubs.filter(c => c.name.toLowerCase().includes(clubSearch.toLowerCase())).map(c => ({ ...c, _type: 'horsligue' }))
                  ].slice(0, 20).map(c => (
                    <button
                      key={`${c._type}-${c.id}`}
                      onClick={() => { setSelectedClubId(c.id); setClubSearch(''); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-700 transition-colors flex items-center justify-between gap-2"
                    >
                      <span className="text-white text-sm truncate">{c.name}</span>
                      {c._type === 'horsligue' && <span className="text-blue-400 text-xs shrink-0">Hors-ligue</span>}
                    </button>
                  ))}
                  {allClubs.filter(c => c.name.toLowerCase().includes(clubSearch.toLowerCase())).length === 0 &&
                   sansLigueClubs.filter(c => c.name.toLowerCase().includes(clubSearch.toLowerCase())).length === 0 && (
                    <p className="text-slate-500 text-sm text-center py-4">Aucun club trouvé</p>
                  )}
                </div>
              )}
              {clubId && <span className="text-slate-300 text-sm font-medium">{club?.name || sansLigueClubs.find(c => c.id === clubId)?.name}</span>}
            </div>
          )}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {club.logo_url ? (
                <img src={club.logo_url} alt={club.name} className="w-16 h-16 rounded-2xl shadow-lg object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                  <Shield className="w-8 h-8 text-white" />
                </div>
              )}
              <div>
                <p className="text-slate-400 text-sm mb-1 flex items-center gap-1.5">
                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" />
                  {isOwner && clubId !== user?.club_id ? 'Vue Staff — ' : 'Espace Privé — '}
                  {club.name}
                </p>
                <h1 className="text-2xl font-bold text-white">{club.name}</h1>
                <p className="text-slate-400 text-sm">Manager : {club.manager_name || '—'}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">

              <Button onClick={() => setMoneyTransferOpen(true)} variant="outline" className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10">
                <Send className="w-4 h-4 mr-2" />Transfert Financier
              </Button>
              {isOwner && (
                <Link to={createPageUrl('StaffRoom')}>
                  <Button variant="outline" className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10">
                    <Crown className="w-4 h-4 mr-2" />Salon Staff
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Budget", value: `${((club.budget || 0) / 1e6).toFixed(0)}M€`, icon: Euro, color: "from-emerald-500 to-emerald-600", sub: "Disponible" },
            { label: "Classement", value: `${rank}/${totalClubs}`, icon: Trophy, color: "from-amber-500 to-amber-600", sub: `${club.points || 0} pts` },
            { label: "Effectif", value: players.length, icon: Users, color: "from-blue-500 to-blue-600", sub: `Moy. ${avgOverall}` },
            { label: "Offres en attente", value: incomingOffers.length, icon: Bell, color: incomingOffers.length > 0 ? "from-red-500 to-red-600" : "from-slate-500 to-slate-600", sub: "À traiter" },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-slate-300 text-sm font-medium">{stat.label}</p>
              <p className="text-slate-500 text-xs mt-1">{stat.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-8 pb-12">
          <TabsList className="bg-slate-900/80 border border-slate-700/60 flex-wrap h-auto gap-1.5 p-1.5 rounded-2xl shadow-lg">
            {[
              { value: 'overview', label: 'Aperçu', Icon: BarChart2, color: 'data-[state=active]:bg-emerald-500' },
              { value: 'squad', label: 'Effectif', Icon: Users, color: 'data-[state=active]:bg-blue-500' },
              { value: 'transfers', label: 'Transferts', Icon: ArrowRightLeft, color: 'data-[state=active]:bg-purple-500', badge: incomingOffers.length || null },
              { value: 'finances', label: 'Finances', Icon: Euro, color: 'data-[state=active]:bg-amber-500' },
              { value: 'matches', label: 'Matchs', Icon: Swords, color: 'data-[state=active]:bg-emerald-500' },
              { value: 'academy', label: 'Formation', Icon: Sparkles, color: 'data-[state=active]:bg-pink-500' },
              { value: 'evolutions', label: 'Évolutions', Icon: TrendingUp, color: 'data-[state=active]:bg-violet-500' },
              { value: 'chat', label: 'Chat Staff', Icon: MessageSquare, color: 'data-[state=active]:bg-cyan-500' },
              { value: 'notifications', label: 'Notifications', Icon: Bell, color: 'data-[state=active]:bg-red-500' },
              { value: 'player-messages', label: 'Joueurs', Icon: MessageSquare, color: 'data-[state=active]:bg-purple-600' },
              { value: 'buy-budget', label: 'Acheter Budget', Icon: ShoppingCart, color: 'data-[state=active]:bg-blue-500' },
              { value: 'profile', label: 'Profil', Icon: UserCircle, color: 'data-[state=active]:bg-slate-500' },
            ].map(({ value, label, Icon, color, badge }) => (
              <TabsTrigger
                key={value}
                value={value}
                className={`${color} data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 rounded-xl text-xs px-3 py-2 gap-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {label}
                {badge ? (
                  <span className="w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">
                    {badge}
                  </span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── APERÇU ── */}
          <TabsContent value="overview">
            <TabPanel>
            <div className="mb-6">
              <BudgetChart club={club} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-5">
                  <BarChart2 className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-lg font-bold text-white">Performances</h2>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-5">
                  <div className="text-center p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <p className="text-3xl font-bold text-emerald-400">{club.wins || 0}</p>
                    <p className="text-slate-400 text-sm mt-1">Victoires</p>
                  </div>
                  <div className="text-center p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <p className="text-3xl font-bold text-amber-400">{club.draws || 0}</p>
                    <p className="text-slate-400 text-sm mt-1">Nuls</p>
                  </div>
                  <div className="text-center p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-3xl font-bold text-red-400">{club.losses || 0}</p>
                    <p className="text-slate-400 text-sm mt-1">Défaites</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Buts marqués", value: club.goals_for || 0, color: "text-white" },
                    { label: "Buts encaissés", value: club.goals_against || 0, color: "text-white" },
                    { label: "Différence", value: (goalDiff >= 0 ? '+' : '') + goalDiff, color: goalDiff >= 0 ? 'text-emerald-400' : 'text-red-400' }
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl">
                      <span className="text-slate-400 text-sm">{row.label}</span>
                      <span className={`font-bold ${row.color}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-400" />
                    <h2 className="text-lg font-bold text-white">Top 5 Joueurs</h2>
                  </div>
                </div>
                <div className="space-y-3">
                  {[...players].sort((a, b) => b.overall - a.overall).slice(0, 5).map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-xl">
                      <span className="text-slate-500 text-sm w-5 font-bold">{i + 1}</span>
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">{p.overall}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{p.name}</p>
                        <p className="text-slate-400 text-xs">{p.position} · {p.age} ans</p>
                      </div>
                    </div>
                  ))}
                  {players.length === 0 && <p className="text-slate-500 text-center py-6">Aucun joueur</p>}
                </div>
              </div>
            </div>
            </TabPanel>
          </TabsContent>

          {/* ── EFFECTIF ── */}
          <TabsContent value="squad">
            <TabPanel>
            {playersLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-blue-400 animate-spin" /></div>
            ) : (
              <div className="space-y-8">
                {/* Bouton ajouter joueur — visible pour staff uniquement, pas les managers simples */}
                {(isOwner || (user?.club_id === clubId && isStaffRole)) && (
                  <div className="flex justify-end">
                    <Button onClick={() => setCreatePlayerOpen(true)} className="bg-emerald-500 hover:bg-emerald-600">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Ajouter un joueur
                    </Button>
                  </div>
                )}
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Joueurs', value: players.length, color: 'text-blue-400' },
                    { label: 'Note moy.', value: avgOverall, color: 'text-emerald-400' },
                    { label: 'En vente', value: players.filter(p => p.is_on_transfer_list).length, color: 'text-amber-400' },
                    { label: 'Postes couverts', value: POSITIONS.filter(pos => players.some(p => p.position === pos)).length + '/' + POSITIONS.length, color: 'text-purple-400' },
                  ].map(s => (
                    <div key={s.label} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 text-center">
                      <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                      <p className="text-slate-400 text-sm mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Squad Table style FM */}
                <SquadTable
                 players={players}
                 clubId={clubId}
                 canEdit={!isRegularManager && (user?.club_id === clubId || isOwner)}
                 canEditRole={isRegularManager}
                 canDelete={isStaffChampionnat}
                 onManage={openTransferDialog}
                 onDelete={(id) => deletePlayer.mutate(id)}
                 playerMorales={playerMorales}
                />

                {players.length === 0 && (
                  <div className="text-center py-16">
                    <Users className="w-14 h-14 mx-auto text-slate-600 mb-4" />
                    <p className="text-slate-400 text-lg font-medium">Aucun joueur dans l'effectif</p>
                  </div>
                )}
              </div>
            )}
            </TabPanel>
          </TabsContent>

          {/* ── TRANSFERTS ── */}
          <TabsContent value="transfers">
            <TabPanel>
            <div className="space-y-6">
              {/* Bouton faire une offre */}
              {(user?.club_id === clubId || isOwner) && (
                <div className="flex justify-end">
                  <Button onClick={() => setMakeOfferOpen(true)} className="bg-purple-500 hover:bg-purple-600">
                    <ArrowRightLeft className="w-4 h-4 mr-2" />
                    Faire une offre
                  </Button>
                </div>
              )}

              {/* Prêts reçus — possibilité de renvoyer */}
              {receivedLoans.length > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-5 space-y-3">
                  <h3 className="text-blue-300 font-bold flex items-center gap-2">
                    <span className="text-lg">🔄</span> Joueurs en prêt dans votre club
                  </h3>
                  {receivedLoans.map(loan => (
                    <div key={loan.id} className="flex items-center justify-between gap-4 p-3 bg-slate-800/60 rounded-xl">
                      <div>
                        <p className="text-white font-semibold">{loan.player_name}</p>
                        <p className="text-slate-400 text-xs">Prêt de {loan.seller_club_name}</p>
                        <p className="text-blue-300 text-xs mt-0.5">
                          Frais : {(loan.starting_price / 1e6).toFixed(2)}M€
                          {loan.loan_buy_option > 0 && ` · Option achat : ${(loan.loan_buy_option / 1e6).toFixed(2)}M€`}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => returnLoan.mutate(loan)}
                        disabled={returnLoan.isPending}
                        className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10 shrink-0"
                      >
                        {returnLoan.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                        Renvoyer le joueur
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Prêts actifs avec option obligatoire */}
              {activeLoans.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 space-y-3">
                  <h3 className="text-amber-300 font-bold flex items-center gap-2">
                    <span className="text-lg">⚠️</span> Options d'achat obligatoires
                  </h3>
                  {activeLoans.map(loan => (
                    <div key={loan.id} className="flex items-center justify-between gap-4 p-3 bg-slate-800/60 rounded-xl">
                      <div>
                        <p className="text-white font-semibold">{loan.player_name}</p>
                        <p className="text-slate-400 text-xs">Prêt de {loan.seller_club_name}</p>
                        <p className="text-amber-300 text-xs font-semibold mt-0.5">
                          Option obligatoire : {(loan.loan_mandatory_buy_option / 1e6).toFixed(2)}M€
                        </p>
                        {(club?.budget || 0) < loan.loan_mandatory_buy_option && (
                          <p className="text-red-400 text-xs mt-0.5">⚠️ Budget insuffisant — sera prélevé en fin de saison</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => exerciseMandatoryBuyOption.mutate(loan)}
                        disabled={exerciseMandatoryBuyOption.isPending || (club?.budget || 0) < loan.loan_mandatory_buy_option}
                        className="bg-amber-500 hover:bg-amber-600 text-white shrink-0"
                      >
                        {exerciseMandatoryBuyOption.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                        Payer maintenant
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Négociations en cours */}
              {(incomingOffers.length > 0 || outgoingOffers.length > 0) && (
                <div className="space-y-6">
                  {incomingOffers.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                        Offres Reçues
                      </h3>
                      <div className="space-y-3">
                        {incomingOffers.map(offer => {
                          const isClause = offer.is_release_clause === true;
                          const weCountered = offer.last_offer_by === clubId;
                          // Offre acceptée par le club adverse (vendeur) = le buyer peut négocier
                          const canNegotiate = !isClause && offer.status === 'accepted';
                          const canInteract = !isClause && !weCountered && !canNegotiate;
                          return (
                            <div key={offer.id}>
                              <TransferOffer
                                transfer={offer}
                                isReceived={canInteract}
                                onAccept={canInteract ? () => handleOffer.mutate({ transfer: offer, action: 'accept' }) : undefined}
                                onReject={canInteract ? () => handleOffer.mutate({ transfer: offer, action: 'reject' }) : undefined}
                                onCounterOffer={canInteract ? (amt, extra) => handleOffer.mutate({ transfer: offer, action: 'counter', counterAmount: amt, counterExtra: extra }) : undefined}
                                onCancel={!canNegotiate ? () => handleOffer.mutate({ transfer: offer, action: 'cancel' }) : undefined}
                                loading={handleOffer.isPending}
                              />
                              {canNegotiate && (
                                <div className="mt-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-emerald-300 text-sm font-semibold">✅ Accord trouvé — Négociez avec le joueur</p>
                                    <p className="text-slate-400 text-xs mt-0.5">Le club adverse a accepté votre offre. Proposez un rôle au joueur.</p>
                                  </div>
                                  <Button
                                    size="sm"
                                    className="bg-emerald-500 hover:bg-emerald-600 shrink-0"
                                    onClick={async () => {
                                      const playerData = offer.player_id
                                        ? (await base44.entities.Player.filter({ id: offer.player_id }))?.[0] || null
                                        : null;
                                      setNegotiationDialog({ open: true, player: playerData || { name: offer.player_name }, transfer: offer });
                                    }}
                                  >
                                    💬 Négocier
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {outgoingOffers.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Mes Offres Envoyées</h3>
                      <div className="space-y-3">
                        {outgoingOffers.map(offer => {
                          const isClause = offer.is_release_clause === true;
                          const otherSideCountered = !isClause && offer.status === 'negotiating' && offer.last_offer_by && offer.last_offer_by !== clubId;
                          const canNegotiate = offer.status === 'accepted' || isClause;
                          return (
                            <div key={offer.id}>
                              <TransferOffer
                                transfer={offer}
                                isReceived={otherSideCountered}
                                onAccept={otherSideCountered ? () => handleOffer.mutate({ transfer: offer, action: 'accept' }) : undefined}
                                onReject={otherSideCountered ? () => handleOffer.mutate({ transfer: offer, action: 'reject' }) : undefined}
                                onCounterOffer={otherSideCountered ? (amt, extra) => handleOffer.mutate({ transfer: offer, action: 'counter', counterAmount: amt, counterExtra: extra }) : undefined}
                                onCancel={!canNegotiate ? () => handleOffer.mutate({ transfer: offer, action: 'cancel' }) : undefined}
                                loading={handleOffer.isPending}
                              />
                              {canNegotiate && (
                                <div className="mt-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-emerald-300 text-sm font-semibold">✅ {isClause ? 'Clause activée' : 'Accord trouvé'} — Négociez avec le joueur</p>
                                    <p className="text-slate-400 text-xs mt-0.5">Proposez un rôle au joueur pour finaliser le transfert</p>
                                  </div>
                                  <Button
                                    size="sm"
                                    className="bg-emerald-500 hover:bg-emerald-600 shrink-0"
                                    onClick={async () => {
                                      const playerData = offer.player_id
                                        ? (await base44.entities.Player.filter({ id: offer.player_id }))?.[0] || null
                                        : { name: offer.player_name, id: offer.player_id };
                                      setNegotiationDialog({ open: true, player: playerData || { name: offer.player_name }, transfer: offer });
                                    }}
                                  >
                                    💬 Négocier
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Historique */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />Arrivées <span className="text-slate-500 font-normal text-base">({arrivals.length})</span>
                  </h3>
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {arrivals.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl">
                        <div>
                          <p className="text-white font-medium text-sm">{t.player_name}</p>
                          <p className="text-slate-400 text-xs">de {t.from_club_name || 'Agent libre'}</p>
                        </div>
                        <span className="text-emerald-400 font-bold text-sm whitespace-nowrap">{(t.amount / 1e6).toFixed(1)}M€</span>
                      </div>
                    ))}
                    {arrivals.length === 0 && <p className="text-slate-500 text-center py-6 text-sm">Aucune arrivée</p>}
                  </div>
                </div>
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-red-400" />Départs <span className="text-slate-500 font-normal text-base">({departures.length})</span>
                  </h3>
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {departures.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl">
                        <div>
                          <p className="text-white font-medium text-sm">{t.player_name}</p>
                          <p className="text-slate-400 text-xs">vers {t.to_club_name}</p>
                        </div>
                        <span className="text-emerald-400 font-bold text-sm whitespace-nowrap">+{(t.amount / 1e6).toFixed(1)}M€</span>
                      </div>
                    ))}
                    {departures.length === 0 && <p className="text-slate-500 text-center py-6 text-sm">Aucun départ</p>}
                  </div>
                </div>
              </div>

              {incomingOffers.length === 0 && outgoingOffers.length === 0 && arrivals.length === 0 && departures.length === 0 && (
                <div className="text-center py-16">
                  <ArrowRightLeft className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg">Aucun transfert</p>
                </div>
              )}
            </div>
            </TabPanel>
          </TabsContent>

          {/* ── FINANCES ── */}
          <TabsContent value="finances">
            <TabPanel>
            <div className="space-y-6">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <p className="text-slate-300 text-sm mb-1">Budget disponible</p>
                  <p className="text-4xl font-black text-white">{((club.budget || 0) / 1e6).toFixed(1)}M€</p>
                </div>
                <Button onClick={() => setMoneyTransferOpen(true)} className="bg-emerald-500 hover:bg-emerald-600">
                  <Send className="w-4 h-4 mr-2" />Transférer des fonds
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                  <h3 className="text-white font-bold mb-4">Fonds Envoyés</h3>
                  <div className="space-y-3">
                    {(moneyTransfers?.sent || []).map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl">
                        <div><p className="text-white text-sm font-medium">→ {t.to_club_name}</p>{t.reason && <p className="text-slate-500 text-xs">{t.reason}</p>}</div>
                        <span className="text-red-400 font-bold text-sm">-{(t.amount / 1e6).toFixed(1)}M€</span>
                      </div>
                    ))}
                    {(moneyTransfers?.sent || []).length === 0 && <p className="text-slate-500 text-center py-4">Aucun envoi</p>}
                  </div>
                </div>
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                  <h3 className="text-white font-bold mb-4">Fonds Reçus</h3>
                  <div className="space-y-3">
                    {(moneyTransfers?.received || []).map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl">
                        <div><p className="text-white text-sm font-medium">← {t.from_club_name}</p>{t.reason && <p className="text-slate-500 text-xs">{t.reason}</p>}</div>
                        <span className="text-emerald-400 font-bold text-sm">+{(t.amount / 1e6).toFixed(1)}M€</span>
                      </div>
                    ))}
                    {(moneyTransfers?.received || []).length === 0 && <p className="text-slate-500 text-center py-4">Aucune réception</p>}
                  </div>
                </div>
              </div>
            </div>
            </TabPanel>
          </TabsContent>

          {/* ── MATCHS ── */}
          <TabsContent value="matches">
            <TabPanel>
            <MatchTab
              club={club}
              user={user}
              clubs={allClubs}
              canDelete={!isRegularManager}
              canCreate={!isRegularManager}
            />
            </TabPanel>
          </TabsContent>

          {/* ── CENTRE DE FORMATION ── */}
          <TabsContent value="academy">
            <TabPanel><AcademyTab club={club} /></TabPanel>
          </TabsContent>

          {/* ── ÉVOLUTIONS ── */}
          <TabsContent value="evolutions">
            <TabPanel><EvolutionTab club={club} user={user} /></TabPanel>
          </TabsContent>

          {/* ── CHAT STAFF ── */}
          <TabsContent value="chat">
            <TabPanel><ClubChat club={club} user={user} /></TabPanel>
          </TabsContent>

          {/* ── NOTIFICATIONS ── */}
          <TabsContent value="notifications">
            <TabPanel><InboxPanel userId={isOwner ? (club.manager_id || user?.id) : user?.id} /></TabPanel>
          </TabsContent>

          {/* ── MESSAGES JOUEURS ── */}
          <TabsContent value="player-messages">
            <TabPanel><PlayerMessagesPanel club={club} players={players} /></TabPanel>
          </TabsContent>

          {/* ── ACHETER BUDGET ── */}
          <TabsContent value="buy-budget">
            <TabPanel><BuyBudgetTab club={club} user={user} /></TabPanel>
          </TabsContent>

          {/* ── PROFIL ── */}
          <TabsContent value="profile">
            <TabPanel><ProfileTab user={user} onSaved={() => window.location.reload()} /></TabPanel>
          </TabsContent>


        </Tabs>
      </div>

      <PlayerNegotiationDialog
        open={negotiationDialog.open}
        onClose={() => setNegotiationDialog({ open: false, player: null, transfer: null })}
        player={negotiationDialog.player}
        buyerClub={club}
        squadPlayers={players}
        leagueContext={leagueContext}
        onNegotiationComplete={async ({ role }) => {
          const transfer = negotiationDialog.transfer;
          if (transfer) {
            const isClause = transfer.is_release_clause === true;
            if (isClause) {
              // Clause : transfert direct
              const [buyerClubs, sellerClubs] = await Promise.all([
                base44.entities.Club.filter({ id: transfer.to_club_id }),
                base44.entities.Club.filter({ id: transfer.from_club_id }),
              ]);
              const buyerClub = buyerClubs?.[0];
              const sellerClub = sellerClubs?.[0];
              if (transfer.player_id) {
                await base44.entities.Player.update(transfer.player_id, {
                  club_id: transfer.to_club_id,
                  club_name: transfer.to_club_name,
                  is_on_transfer_list: false,
                  asking_price: null,
                  release_clause: null,
                  ...(role ? { player_role: role } : {}),
                });
              }
              if (buyerClub) await base44.entities.Club.update(transfer.to_club_id, { budget: (buyerClub.budget || 0) - transfer.amount });
              if (sellerClub) await base44.entities.Club.update(transfer.from_club_id, { budget: (sellerClub.budget || 0) + transfer.amount });
              // Officialisation directe
              const now = new Date().toISOString();
              await base44.entities.Auction.create({
                player_id: transfer.player_id,
                player_name: transfer.player_name,
                player_position: '', player_overall: 0,
                seller_club_id: transfer.from_club_id, seller_club_name: transfer.from_club_name,
                starting_price: transfer.amount, current_price: transfer.amount,
                current_bidder_club: transfer.to_club_name,
                last_bid_at: now, ends_at: now,
                is_external_player: false, transfer_type: 'ligue', status: 'completed',
                is_loan: false, reactions: {}
              });
              await base44.entities.Transfer.update(transfer.id, { status: 'completed' });
            } else {
              // Offre classique acceptée + joueur négocié → transfert direct sans enchère
              const now = new Date().toISOString();
              const buyerClubs = allClubs.find(c => c.id === transfer.to_club_id);
              const sellerClubs = allClubs.find(c => c.id === transfer.from_club_id);
              if (transfer.player_id) {
                await base44.entities.Player.update(transfer.player_id, {
                  club_id: transfer.to_club_id, club_name: transfer.to_club_name,
                  is_on_transfer_list: false, asking_price: null,
                  ...(role ? { player_role: role } : {}),
                });
              }
              if (buyerClubs) await base44.entities.Club.update(transfer.to_club_id, { budget: (buyerClubs.budget || 0) - transfer.amount });
              if (sellerClubs) await base44.entities.Club.update(transfer.from_club_id, { budget: (sellerClubs.budget || 0) + transfer.amount });
              await base44.entities.Auction.create({
                player_id: transfer.player_id, player_name: transfer.player_name,
                player_position: '', player_overall: 0,
                seller_club_id: transfer.from_club_id, seller_club_name: transfer.from_club_name,
                starting_price: transfer.amount, current_price: transfer.amount,
                current_bidder_club: transfer.to_club_name,
                last_bid_at: now, ends_at: now,
                is_external_player: false, transfer_type: 'ligue', status: 'completed',
                transfer_id: transfer.id, reactions: {}
              });
              await base44.entities.Transfer.update(transfer.id, { status: 'completed' });
            }
            queryClient.invalidateQueries({ queryKey: ['outgoing-offers', clubId] });
            queryClient.invalidateQueries({ queryKey: ['my-players', clubId] });
            queryClient.invalidateQueries({ queryKey: ['all-clubs'] });
          }
          setNegotiationDialog({ open: false, player: null, transfer: null });
        }}
      />

      {club && (
        <CreatePlayerModal
          club={club}
          open={createPlayerOpen}
          onClose={() => setCreatePlayerOpen(false)}
        />
      )}

      <MakeOfferModal
        open={makeOfferOpen}
        onClose={() => setMakeOfferOpen(false)}
        myClub={club}
        user={user}
      />

      <MoneyTransferModal
        open={moneyTransferOpen}
        onClose={() => setMoneyTransferOpen(false)}
        club={club}
        onSuccess={() => refetchClub()}
      />

      {/* Transfer List Dialog */}
      <Dialog open={transferListDialog} onOpenChange={setTransferListDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Gérer le joueur</DialogTitle>
          </DialogHeader>
          {selectedPlayer && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                  <span className="text-white font-bold text-xl">{selectedPlayer.overall}</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg">{selectedPlayer.name}</h3>
                  <p className="text-slate-400">{selectedPlayer.position} • Valeur: {((selectedPlayer.value || 0) / 1000000).toFixed(1)}M€</p>
                </div>
              </div>
              {/* Joueur en prêt — actions bloquées */}
              {receivedLoans.some(l => l.player_id === selectedPlayer.id) && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-center gap-3">
                  <span className="text-2xl">🔄</span>
                  <div>
                    <p className="text-blue-300 font-semibold text-sm">Joueur en prêt</p>
                    <p className="text-slate-400 text-xs">Ce joueur est en prêt dans votre club. Vous ne pouvez pas le libérer ni le mettre sur la liste des transferts.</p>
                  </div>
                </div>
              )}
              <div className="space-y-4">
                {!isRegularManager && !receivedLoans.some(l => l.player_id === selectedPlayer.id) && (() => {
                  // Joueur acheté dans le mercato actuel = présent dans arrivals
                  const boughtThisMercato = arrivals.some(t => t.player_id === selectedPlayer.id);
                  return (
                  <>
                    {boughtThisMercato && isMercatoOpen && (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center gap-3">
                        <span className="text-2xl">🔒</span>
                        <div>
                          <p className="text-amber-300 font-semibold text-sm">Vente bloquée ce mercato</p>
                          <p className="text-slate-400 text-xs">Ce joueur a été acheté lors de ce mercato. Il ne peut pas être revendu avant le prochain mercato. Vous pouvez uniquement le mettre en prêt.</p>
                        </div>
                      </div>
                    )}
                    {selectedPlayer.is_on_transfer_list && (
                      <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                        <div className="flex items-center gap-3">
                          <Tag className="w-5 h-5 text-amber-400" />
                          <div>
                            <p className="font-medium text-amber-300">Actuellement en vente</p>
                            <p className="text-slate-400 text-sm">Retirer de la liste des transferts</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); toggleTransferList.mutate({ player: selectedPlayer, onList: false }); }}
                          disabled={toggleTransferList.isPending}
                          className="border-red-500/50 text-red-400 hover:bg-red-500/10 shrink-0"
                        >
                          <X className="w-3.5 h-3.5 mr-1" />Retirer
                        </Button>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Prix demandé (€)</Label>
                      <Input
                        type="number"
                        value={askingPrice}
                        onChange={(e) => setAskingPrice(e.target.value)}
                        placeholder="Ex: 50000000"
                        className="bg-slate-800 border-slate-700"
                      />
                      <p className="text-slate-500 text-sm">
                        {askingPrice ? `${(parseFloat(askingPrice) / 1000000).toFixed(1)}M€` : 'Entrez un montant'}
                      </p>
                    </div>
                    <Button
                      onClick={() => toggleTransferList.mutate({ player: selectedPlayer, onList: true, price: parseInt(askingPrice) })}
                      disabled={toggleTransferList.isPending || !askingPrice || (boughtThisMercato && isMercatoOpen)}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40"
                    >
                      {toggleTransferList.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {boughtThisMercato && isMercatoOpen ? '🔒 Vente bloquée ce mercato' : 'Mettre sur la liste des transferts'}
                    </Button>

                    {/* Section prêt */}
                    <div className="border-t border-slate-700 pt-4 space-y-2">
                      <Label className="text-cyan-300 flex items-center gap-1.5">🤝 Liste de prêt</Label>
                      {selectedPlayer.is_on_loan_list ? (
                        <div className="flex items-center justify-between p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
                          <div>
                            <p className="text-cyan-300 font-medium text-sm">Disponible pour prêt</p>
                            {selectedPlayer.loan_asking_price > 0 && (
                              <p className="text-slate-400 text-xs">Frais : {(selectedPlayer.loan_asking_price / 1e6).toFixed(2)}M€</p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              base44.entities.Player.update(selectedPlayer.id, { is_on_loan_list: false, loan_asking_price: null })
                                .then(() => { queryClient.invalidateQueries({ queryKey: ['my-players', clubId] }); setTransferListDialog(false); });
                            }}
                            className="border-red-500/50 text-red-400 hover:bg-red-500/10 shrink-0"
                          >
                            <X className="w-3.5 h-3.5 mr-1" />Retirer
                          </Button>
                        </div>
                      ) : (
                        <LoanInlineForm player={selectedPlayer} clubId={clubId} onDone={() => { queryClient.invalidateQueries({ queryKey: ['my-players', clubId] }); setTransferListDialog(false); }} />
                      )}
                    </div>
                  </>
                  );
                })()}

                <div className={isRegularManager || receivedLoans.some(l => l.player_id === selectedPlayer.id) ? '' : 'border-t border-slate-700 pt-4'}>
                   {!receivedLoans.some(l => l.player_id === selectedPlayer.id) && <p className="text-slate-400 text-sm mb-2">Zone dangereuse</p>}
                   {!confirmRelease && !receivedLoans.some(l => l.player_id === selectedPlayer.id) ? (
                    <Button
                      variant="outline"
                      onClick={() => setConfirmRelease(true)}
                      className="w-full border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                    >
                      Libérer le joueur (agent libre)
                    </Button>
                  ) : (
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 space-y-3">
                      <p className="text-orange-300 text-sm font-medium">⚠️ Confirmer la libération</p>
                      <p className="text-slate-400 text-xs">
                        {selectedPlayer.name} sera libéré et votre budget sera crédité de{' '}
                        <span className="text-emerald-400 font-semibold">{((selectedPlayer.value || 0) / 1e6).toFixed(1)}M€</span>.
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setConfirmRelease(false)}
                          className="flex-1 border-slate-600 text-slate-300">
                          Annuler
                        </Button>
                        <Button size="sm"
                          onClick={() => releasePlayer.mutate(selectedPlayer)}
                          disabled={releasePlayer.isPending}
                          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white">
                          {releasePlayer.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmer'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}