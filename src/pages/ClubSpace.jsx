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
  MessageSquare, Swords, BadgeCheck, Tag, Trash2, X, UserPlus, UserCircle
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
import { fetchAll } from '@/utils/fetchAll';

const STAFF_ROLES = ['owner', 'admin', 'staff_mercato', 'staff_championnat', 'staff_developpement', 'staff_formation'];
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

  const isOwner = user ? OWNER_ROLES.includes(user.role) : false;
  const isStaffChampionnat = user ? (user.role === 'staff_championnat' || OWNER_ROLES.includes(user.role)) : false;

  const clubId = selectedClubId || user?.club_id;

  const { data: allClubs = [], isLoading: allClubsLoading } = useQuery({
    queryKey: ['all-clubs'],
    queryFn: () => base44.entities.Club.list(),
    staleTime: 0,
    gcTime: 60000,
    refetchInterval: false,
    retry: 1,
  });

  // Auto-select first club for owner if no club assigned
  useEffect(() => {
    if (isOwner && allClubs.length > 0 && !clubId) {
      setSelectedClubId(allClubs[0].id);
    }
  }, [isOwner, allClubs, clubId]);

  const club = allClubs.find(c => c.id === clubId) || null;
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
    mutationFn: async ({ transfer, action, counterAmount }) => {
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
          // TRANSFERT CLASSIQUE : enchère d'officialisation
          const endsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
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
            current_bidder_id: buyer?.id || null,
            current_bidder_name: buyer?.full_name || null,
            current_bidder_club: transfer.to_club_name,
            last_bid_at: now,
            is_external_player: false,
            transfer_type: 'ligue',
            status: 'active',
            ends_at: endsAt,
            transfer_id: transfer.id,
            reactions: {}
          });
          if (transfer.player_id) {
            await base44.entities.Player.update(transfer.player_id, {
              club_id: null, club_name: null, is_on_transfer_list: false, asking_price: null
            });
          }
          await base44.entities.Transfer.update(transfer.id, {
            status: 'completed',
            negotiation_history: [...history, { from_club: transfer.from_club_name, amount: transfer.amount, action: 'accepted' }]
          });
          if (buyer) {
            await base44.entities.Notification.create({
              user_id: buyer.id, club_id: transfer.to_club_id, type: 'transfer_offer',
              title: `Accord conclu ! ${transfer.player_name}`,
              message: `${transfer.from_club_name} a accepté votre offre de ${(transfer.amount / 1e6).toFixed(2)}M€. L'enchère d'officialisation est lancée (1h) sur la Communauté.`,
              is_read: false, link_page: 'Community'
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
              title: `Accord conclu pour ${transfer.player_name}`,
              message: `Accord avec ${transfer.to_club_name} à ${(transfer.amount / 1e6).toFixed(2)}M€. L'enchère ligue est lancée automatiquement.`,
              is_read: false, link_page: 'Community'
            });
          }
        }
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
          amount: counterAmount, status: 'negotiating',
          last_offer_by: clubId, negotiation_history: updatedHistory
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
  const isStaffRole = user && STAFF_ROLES.includes(user.role);
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

  if (clubLoading || !club) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
    </div>
  );

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
          {/* Owner club selector */}
          {isOwner && allClubs.length > 0 && (
            <div className="mb-4 flex gap-2 flex-wrap">
              {allClubs.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedClubId(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    clubId === c.id
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {c.name}
                </button>
              ))}
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
        <Tabs defaultValue="overview" className="space-y-6 pb-10">
          <TabsList className="bg-slate-800/50 border border-slate-700/50 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              <BarChart2 className="w-4 h-4 mr-1.5" />Aperçu
            </TabsTrigger>
            <TabsTrigger value="squad" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-1.5" />Effectif
            </TabsTrigger>
            <TabsTrigger value="transfers" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <ArrowRightLeft className="w-4 h-4 mr-1.5" />Transferts
              {incomingOffers.length > 0 && (
                <span className="ml-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {incomingOffers.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="finances" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <Euro className="w-4 h-4 mr-1.5" />Finances
            </TabsTrigger>
            <TabsTrigger value="matches" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              <Swords className="w-4 h-4 mr-1.5" />Matchs
            </TabsTrigger>

            <TabsTrigger value="academy" className="data-[state=active]:bg-pink-500 data-[state=active]:text-white">
              <Sparkles className="w-4 h-4 mr-1.5" />Formation
            </TabsTrigger>
            <TabsTrigger value="evolutions" className="data-[state=active]:bg-violet-500 data-[state=active]:text-white">
              <TrendingUp className="w-4 h-4 mr-1.5" />Évolutions
            </TabsTrigger>
            <TabsTrigger value="chat" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white">
              <MessageSquare className="w-4 h-4 mr-1.5" />Chat Staff
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
              <Bell className="w-4 h-4 mr-1.5" />Notifications
            </TabsTrigger>
            <TabsTrigger value="player-messages" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <MessageSquare className="w-4 h-4 mr-1.5" />Joueurs
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-slate-500 data-[state=active]:text-white">
              <UserCircle className="w-4 h-4 mr-1.5" />Profil
            </TabsTrigger>
          </TabsList>

          {/* ── APERÇU ── */}
          <TabsContent value="overview">
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
          </TabsContent>

          {/* ── EFFECTIF ── */}
          <TabsContent value="squad">
            {playersLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-blue-400 animate-spin" /></div>
            ) : (
              <div className="space-y-8">
                {/* Bouton ajouter joueur — visible pour tous les managers du club */}
                {(user?.club_id === clubId || isOwner) && (
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
                  canEdit={user?.club_id === clubId || isOwner}
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
          </TabsContent>

          {/* ── TRANSFERTS ── */}
          <TabsContent value="transfers">
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
                        {incomingOffers.map(offer => (
                          <TransferOffer
                            key={offer.id}
                            transfer={offer}
                            isReceived
                            onAccept={() => handleOffer.mutate({ transfer: offer, action: 'accept' })}
                            onReject={() => handleOffer.mutate({ transfer: offer, action: 'reject' })}
                            onCounterOffer={(amt) => handleOffer.mutate({ transfer: offer, action: 'counter', counterAmount: amt })}
                            loading={handleOffer.isPending}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {outgoingOffers.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Mes Offres Envoyées</h3>
                      <div className="space-y-3">
                        {outgoingOffers.map(offer => {
                          const isNegotiating = offer.status === 'negotiating' || offer.status === 'pending';
                          const otherSideCountered = isNegotiating && offer.last_offer_by === offer.from_club_id;
                          return (
                            <TransferOffer
                              key={offer.id}
                              transfer={offer}
                              isReceived={otherSideCountered}
                              onAccept={otherSideCountered ? () => handleOffer.mutate({ transfer: offer, action: 'accept' }) : undefined}
                              onReject={otherSideCountered ? () => handleOffer.mutate({ transfer: offer, action: 'reject' }) : undefined}
                              onCounterOffer={otherSideCountered ? (amt) => handleOffer.mutate({ transfer: offer, action: 'counter', counterAmount: amt }) : undefined}
                              loading={handleOffer.isPending}
                            />
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
          </TabsContent>

          {/* ── FINANCES ── */}
          <TabsContent value="finances">
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
          </TabsContent>

          {/* ── MATCHS ── */}
          <TabsContent value="matches">
            <MatchTab club={club} user={user} clubs={allClubs} />
          </TabsContent>

          {/* ── CENTRE DE FORMATION ── */}
          <TabsContent value="academy">
            <AcademyTab club={club} />
          </TabsContent>

          {/* ── ÉVOLUTIONS ── */}
          <TabsContent value="evolutions">
            <EvolutionTab club={club} user={user} />
          </TabsContent>

          {/* ── CHAT STAFF ── */}
          <TabsContent value="chat">
            <ClubChat club={club} user={user} />
          </TabsContent>

          {/* ── NOTIFICATIONS ── */}
          <TabsContent value="notifications">
            <InboxPanel userId={isOwner ? (club.manager_id || user?.id) : user?.id} />
          </TabsContent>

          {/* ── MESSAGES JOUEURS ── */}
          <TabsContent value="player-messages">
            <PlayerMessagesPanel club={club} players={players} />
          </TabsContent>

          {/* ── PROFIL ── */}
          <TabsContent value="profile">
            <ProfileTab user={user} onSaved={() => window.location.reload()} />
          </TabsContent>
        </Tabs>
      </div>

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
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Tag className="w-5 h-5 text-emerald-400" />
                    <div>
                      <p className="font-medium">Liste des transferts</p>
                      <p className="text-slate-400 text-sm">Rendre le joueur disponible à la vente</p>
                    </div>
                  </div>
                  <Switch
                    checked={selectedPlayer.is_on_transfer_list}
                    onCheckedChange={(checked) => {
                      if (!checked) toggleTransferList.mutate({ player: selectedPlayer, onList: false });
                    }}
                  />
                </div>
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
                  disabled={toggleTransferList.isPending || !askingPrice}
                  className="w-full bg-emerald-500 hover:bg-emerald-600"
                >
                  {toggleTransferList.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Mettre sur la liste des transferts
                </Button>

                <div className="border-t border-slate-700 pt-4">
                  <p className="text-slate-400 text-sm mb-2">Zone dangereuse</p>
                  {!isMercatoOpen ? (
                    <div className="w-full border border-slate-600/50 text-slate-500 rounded-xl p-3 text-sm text-center bg-slate-800/30">
                      🔒 Mercato fermé — libération impossible
                    </div>
                  ) : !confirmRelease ? (
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