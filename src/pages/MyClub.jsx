import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Users, Euro, Trophy, Plus, Settings,
  ArrowRightLeft, Loader2, UserPlus, Tag, X, Trash2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import PlayerCard from '@/components/PlayerCard';
import TransferOffer from '@/components/TransferOffer';
import PlayerStatsEditor from '@/components/clubspace/PlayerStatsEditor';

export default function MyClub() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [transferListDialog, setTransferListDialog] = useState(false);
  const [askingPrice, setAskingPrice] = useState('');
  const [selectedClubId, setSelectedClubId] = useState(null);
  const [confirmRelease, setConfirmRelease] = useState(false);

  const staffRoles = ['owner', 'admin', 'staff_mercato', 'staff_annonces', 'staff_championnat', 'staff_developpement', 'staff_formation'];
  const isStaff = staffRoles.includes(user?.role);
  const isStaffChampionnat = user?.role === 'staff_championnat' || user?.role === 'owner' || user?.role === 'admin';

  const { data: allClubs = [] } = useQuery({
    queryKey: ['all-clubs-staff'],
    queryFn: async () => {
      if (!isStaffChampionnat) return [];
      try {
        return await base44.entities.Club.list();
      } catch (e) {
        console.error('Error loading clubs:', e);
        return [];
      }
    },
    enabled: isStaffChampionnat,
    staleTime: 120000,
    gcTime: 300000,
  });

  // Auto-select first club for staff
  useEffect(() => {
    if (isStaffChampionnat && allClubs.length > 0 && !selectedClubId) {
      setSelectedClubId(allClubs[0].id);
    }
  }, [isStaffChampionnat, allClubs, selectedClubId]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        const userIsStaff = ['owner', 'admin', 'staff_mercato', 'staff_annonces', 'staff_championnat', 'staff_developpement', 'staff_formation'].includes(userData?.role);
        // Pour un staff sans club sélectionnable, on utilise son club_id si défini
        // Pour les managers normaux, on force leur club
        if (!userIsStaff) {
          setSelectedClubId(userData.club_id);
        } else if (userData.club_id && !['owner', 'admin', 'staff_championnat'].includes(userData.role)) {
          // Staff avec club assigné mais sans accès multi-clubs → on pointe sur son club
          setSelectedClubId(userData.club_id);
        }
      } catch (e) {
        // Non connecté → pas de redirect brutal, on affiche juste un état vide
        setUser(null);
      }
    };
    loadUser();
  }, []);

  const clubId = selectedClubId || user?.club_id;

  const { data: club, isLoading: clubLoading } = useQuery({
    queryKey: ['my-club', clubId],
    queryFn: async () => {
      try {
        const data = await base44.entities.Club.filter({ id: clubId });
        return data?.[0] || null;
      } catch (e) {
        console.error('Error loading club:', e);
        return null;
      }
    },
    enabled: !!clubId,
    staleTime: 30000,
    gcTime: 60000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: players = [], isLoading: playersLoading } = useQuery({
    queryKey: ['my-players', clubId],
    queryFn: async () => {
      if (!clubId) return [];
      try {
        const result = await base44.entities.Player.filter({ club_id: clubId });
        return result || [];
      } catch (e) {
        console.error('Error loading players:', e);
        return [];
      }
    },
    enabled: !!clubId,
    retry: 1,
    staleTime: 10000,
  });

  // Offres REÇUES = quelqu'un veut acheter un de NOS joueurs → notre club est le vendeur (from_club_id)
  const { data: incomingOffers = [] } = useQuery({
    queryKey: ['incoming-offers', clubId],
    queryFn: async () => {
      if (!clubId) return [];
      const result = await base44.entities.Transfer.filter({ from_club_id: clubId });
      return (result || []).filter(t => ['pending', 'negotiating', 'accepted'].includes(t.status));
    },
    enabled: !!clubId,
    retry: 1,
    staleTime: 10000,
  });

  // Offres ENVOYÉES = on veut acheter un joueur d'un autre club → notre club est l'acheteur (to_club_id)
  const { data: outgoingOffers = [] } = useQuery({
    queryKey: ['outgoing-offers', clubId],
    queryFn: async () => {
      if (!clubId) return [];
      const result = await base44.entities.Transfer.filter({ to_club_id: clubId });
      return (result || []).filter(t => ['pending', 'negotiating', 'accepted'].includes(t.status));
    },
    enabled: !!clubId,
    retry: 1,
    staleTime: 10000,
  });

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
    mutationFn: async (playerId) => {
      await base44.entities.Player.delete(playerId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-players', clubId] });
    }
  });

  const releasePlayer = useMutation({
    mutationFn: async (player) => {
      // Libérer le joueur (sans club)
      await base44.entities.Player.update(player.id, {
        club_id: null,
        club_name: null,
        is_on_transfer_list: false,
        asking_price: null
      });
      // Créditer le budget du club avec la valeur marchande du joueur
      if (clubId && player.value) {
        const clubs = await base44.entities.Club.filter({ id: clubId });
        if (clubs.length > 0) {
          await base44.entities.Club.update(clubId, { budget: (clubs[0].budget || 0) + (player.value || 0) });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-players', clubId] });
      queryClient.invalidateQueries({ queryKey: ['my-club', clubId] });
      setTransferListDialog(false);
      setSelectedPlayer(null);
    }
  });

  const handleOffer = useMutation({
    mutationFn: async ({ transfer, action, counterAmount }) => {
      const history = transfer.negotiation_history || [];

      if (action === 'accept') {
        const endsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        const now = new Date().toISOString();

        // Récupérer les infos complètes du joueur
        let playerData = null;
        if (transfer.player_id) {
          const players = await base44.entities.Player.filter({ id: transfer.player_id });
          playerData = players?.[0] || null;
        }

        // Récupérer les infos du club acheteur
        const allUsers = await base44.entities.User.list();
        const buyer = allUsers.find(u => u.club_id === transfer.to_club_id && u.has_selected_club);

        // Créer l'enchère ligue avec le club acheteur déjà enchérisseur
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

        // Retirer le joueur de son club vendeur
        if (transfer.player_id) {
          await base44.entities.Player.update(transfer.player_id, {
            club_id: null,
            club_name: null,
            is_on_transfer_list: false,
            asking_price: null
          });
        }

        // Marquer la négociation comme complétée
        await base44.entities.Transfer.update(transfer.id, {
          status: 'completed',
          negotiation_history: [...history, { from_club: transfer.from_club_name, amount: transfer.amount, action: 'accepted' }]
        });

        // Notifier les deux clubs
        if (buyer) {
          await base44.entities.Notification.create({
            user_id: buyer.id,
            club_id: transfer.to_club_id,
            type: 'transfer_offer',
            title: `Accord conclu ! ${transfer.player_name}`,
            message: `${transfer.from_club_name} a accepté votre offre de ${(transfer.amount / 1e6).toFixed(2)}M€. L'enchère d'officialisation est lancée (1h) sur la Communauté.`,
            is_read: false,
            link_page: 'Community'
          });
        }
        const seller = allUsers.find(u => u.club_id === transfer.from_club_id && u.has_selected_club);
        if (seller) {
          await base44.entities.Notification.create({
            user_id: seller.id,
            club_id: transfer.from_club_id,
            type: 'transfer_offer',
            title: `Accord conclu pour ${transfer.player_name}`,
            message: `Accord avec ${transfer.to_club_name} à ${(transfer.amount / 1e6).toFixed(2)}M€. L'enchère ligue est lancée automatiquement.`,
            is_read: false,
            link_page: 'Community'
          });
        }

      } else if (action === 'reject') {
        await base44.entities.Transfer.update(transfer.id, {
          status: 'rejected',
          negotiation_history: [...history, { from_club: transfer.from_club_name, amount: transfer.amount, action: 'rejected' }]
        });

        // Notifier l'acheteur que son offre a été refusée
        const allUsersReject = await base44.entities.User.list();
        const buyerReject = allUsersReject.find(u => u.club_id === transfer.to_club_id && u.has_selected_club);
        if (buyerReject) {
          await base44.entities.Notification.create({
            user_id: buyerReject.id,
            club_id: transfer.to_club_id,
            type: 'transfer_offer',
            title: `Offre refusée pour ${transfer.player_name}`,
            message: `${transfer.from_club_name} a refusé votre offre de ${(transfer.amount / 1e6).toFixed(2)}M€ pour ${transfer.player_name}.`,
            is_read: false,
            link_page: 'MyClub'
          });
        }

      } else if (action === 'counter') {
        // La partie qui répond fait une contre-offre (vendeur ou acheteur selon le tour)
        const isSellerCountering = clubId === transfer.from_club_id;
        const updatedHistory = [...history, {
          from_club: isSellerCountering ? transfer.from_club_name : transfer.to_club_name,
          amount: transfer.amount,
          action: 'counter'
        }];
        await base44.entities.Transfer.update(transfer.id, {
          amount: counterAmount,
          status: 'negotiating',
          last_offer_by: clubId,
          negotiation_history: updatedHistory
        });

        // Notifier l'autre partie
        const allUsers = await base44.entities.User.list();
        const otherClubId = isSellerCountering ? transfer.to_club_id : transfer.from_club_id;
        const counteringClubName = isSellerCountering ? transfer.from_club_name : transfer.to_club_name;
        const otherUser = allUsers.find(u => u.club_id === otherClubId && u.has_selected_club);
        if (otherUser) {
          await base44.entities.Notification.create({
            user_id: otherUser.id,
            club_id: otherClubId,
            type: 'transfer_offer',
            title: `Contre-offre pour ${transfer.player_name}`,
            message: `${counteringClubName} propose ${(counterAmount / 1e6).toFixed(2)}M€ pour ${transfer.player_name}.`,
            is_read: false,
            link_page: 'MyClub'
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incoming-offers', clubId] });
      queryClient.invalidateQueries({ queryKey: ['outgoing-offers', clubId] });
      queryClient.invalidateQueries({ queryKey: ['my-players', clubId] });
      queryClient.invalidateQueries({ queryKey: ['my-club', clubId] });
      queryClient.invalidateQueries({ queryKey: ['auctions-ended'] });
    }
  });

  const openTransferDialog = (player) => {
    setSelectedPlayer(player);
    setAskingPrice(player.asking_price || player.value || '');
    setConfirmRelease(false);
    setTransferListDialog(true);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setTransferListDialog(false);
      setSelectedPlayer(null);
      setAskingPrice('');
    };
  }, []);

  // Afficher un spinner tant que le user n'est pas chargé ou que le club charge
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  // Pas de club sélectionné et pas staff → inviter à choisir un club
  if (!clubId) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <Shield className="w-16 h-16 text-slate-600" />
        <p className="text-slate-400 text-lg">Vous n'avez pas encore de club</p>
        <Button onClick={() => navigate(createPageUrl('SelectClub'))} className="bg-emerald-500 hover:bg-emerald-600">
          Choisir un club
        </Button>
      </div>
    );
  }

  if (clubLoading && !club) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!club) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">Club non trouvé</p>
      </div>
    );
  }

  const groupedPlayers = {
    GK: players.filter(p => p.position === 'GK'),
    DEF: players.filter(p => ['CB', 'LB', 'RB'].includes(p.position)),
    MID: players.filter(p => ['CDM', 'CM', 'CAM'].includes(p.position)),
    ATT: players.filter(p => ['LW', 'RW', 'ST'].includes(p.position))
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Club Header */}
      <div className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10" />
        <div className="relative max-w-7xl mx-auto px-4 py-8">
          {/* Club Selector for Staff */}
          {isStaffChampionnat && (
            <div className="mb-6 flex gap-2 flex-wrap">
              {allClubs.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedClubId(c.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedClubId === c.id
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {club.logo_url ? (
              <img src={club.logo_url} alt={club.name} className="w-24 h-24 rounded-2xl shadow-lg" />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                <Shield className="w-12 h-12 text-slate-500" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">{club.name}</h1>
              {club.stadium && (
                <p className="text-slate-400">{club.stadium}</p>
              )}
            </div>
            <div className="flex gap-4 flex-wrap">
              <div className="bg-slate-800/50 rounded-xl p-4 text-center min-w-[100px]">
                <Euro className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-white">{((club.budget || 0) / 1000000).toFixed(0)}M</p>
                <p className="text-slate-500 text-sm">Budget</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 text-center min-w-[100px]">
                <Users className="w-6 h-6 text-blue-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-white">{players.length}</p>
                <p className="text-slate-500 text-sm">Joueurs</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 text-center min-w-[100px]">
                <Trophy className="w-6 h-6 text-amber-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-white">{club.points || 0}</p>
                <p className="text-slate-500 text-sm">Points</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="squad" className="space-y-6">
          <TabsList className="bg-slate-800/50 border border-slate-700/50">
            <TabsTrigger value="squad" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-2" />
              Effectif
            </TabsTrigger>
            <TabsTrigger value="transfers" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white relative">
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Transferts
              {incomingOffers.length > 0 && (
                <Badge className="ml-2 bg-red-500 text-white h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {incomingOffers.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="squad" className="space-y-8">
            {Object.entries(groupedPlayers).map(([group, groupPlayers]) => (
              <div key={group}>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${
                    group === 'GK' ? 'bg-amber-500' : 
                    group === 'DEF' ? 'bg-blue-500' : 
                    group === 'MID' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  {group === 'GK' ? 'Gardiens' : 
                   group === 'DEF' ? 'Défenseurs' : 
                   group === 'MID' ? 'Milieux' : 'Attaquants'}
                  <Badge variant="outline" className="ml-2 text-slate-400 border-slate-600">
                    {groupPlayers.length}
                  </Badge>
                </h3>
                {groupPlayers.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {groupPlayers.map(player => (
                      <div key={player.id} className="relative group">
                        <PlayerCard
                          player={player}
                          onClick={() => openTransferDialog(player)}
                          showValue
                        />
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <PlayerStatsEditor player={player} clubId={clubId} />
                          {isStaffChampionnat && (
                            <button
                              onClick={() => deletePlayer.mutate(player.id)}
                              disabled={deletePlayer.isPending}
                              className="p-1.5 bg-red-500 hover:bg-red-600 rounded"
                            >
                              <Trash2 className="w-4 h-4 text-white" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-8 bg-slate-800/30 rounded-xl">
                    Aucun joueur dans cette position
                  </p>
                )}
              </div>
            ))}

            {players.length === 0 && (
              <div className="text-center py-16">
                <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 text-lg mb-4">Votre effectif est vide</p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <Button 
                    onClick={() => navigate(createPageUrl('ImportPlayersFromURLs'))}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Importer depuis SofIFA
                  </Button>
                  <Button 
                    onClick={() => navigate(createPageUrl('TransferMarket'))}
                    className="bg-emerald-500 hover:bg-emerald-600"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Recruter au Mercato
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="transfers" className="space-y-6">
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
                   // L'acheteur peut agir si le vendeur vient de faire une contre-offre
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

            {incomingOffers.length === 0 && outgoingOffers.length === 0 && (
              <div className="text-center py-16">
                <ArrowRightLeft className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 text-lg">Aucun transfert en cours</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

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
                      if (!checked) {
                        toggleTransferList.mutate({ player: selectedPlayer, onList: false });
                      }
                    }}
                  />
                </div>

                {(selectedPlayer.is_on_transfer_list || true) && (
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
                )}

                <Button
                  onClick={() => toggleTransferList.mutate({
                    player: selectedPlayer,
                    onList: true,
                    price: parseInt(askingPrice)
                  })}
                  disabled={toggleTransferList.isPending || !askingPrice}
                  className="w-full bg-emerald-500 hover:bg-emerald-600"
                >
                  {toggleTransferList.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Mettre sur la liste des transferts
                </Button>

                <div className="border-t border-slate-700 pt-4">
                  <p className="text-slate-400 text-sm mb-2">Zone dangereuse</p>
                  {!confirmRelease ? (
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
                        {selectedPlayer.name} sera libéré et votre budget sera crédité de <span className="text-emerald-400 font-semibold">{((selectedPlayer.value || 0) / 1e6).toFixed(1)}M€</span>.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setConfirmRelease(false)}
                          className="flex-1 border-slate-600 text-slate-300"
                        >
                          Annuler
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => { releasePlayer.mutate(selectedPlayer); setConfirmRelease(false); }}
                          disabled={releasePlayer.isPending}
                          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                        >
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