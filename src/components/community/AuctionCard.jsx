import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client'; // inclut base44.entities.Notification
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Gavel, Clock, XCircle, Trash2 } from 'lucide-react';

const STAFF_ROLES = ['owner', 'admin', 'staff_mercato', 'staff_championnat', 'staff_developpement', 'staff_formation'];
const EMOJIS = ['🔥', '👏', '😮', '💰', '⚽', '🏆', '😂', '❤️'];

function useCountdown(endsAt) {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    if (!endsAt) return;
    const update = () => {
      const diff = new Date(endsAt) - new Date();
      if (diff <= 0) { setRemaining('Terminée'); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [endsAt]);
  return remaining;
}

export default function AuctionCard({ auction, currentUser }) {
  const queryClient = useQueryClient();
  const [bidAmount, setBidAmount] = useState('');
  const [showBid, setShowBid] = useState(false);
  const [processed, setProcessed] = useState(false);
  const isStaff = currentUser && STAFF_ROLES.includes(currentUser.role);
  const isActive = auction.status === 'active';
  const countdown = useCountdown(auction.ends_at);
  const isEnded = auction.ends_at && new Date(auction.ends_at) < new Date();
  const isHorsLigue = auction.transfer_type === 'hors_ligue' || auction.is_external_player;

  const bidMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(bidAmount);
      const now = new Date().toISOString();
      const newEndsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      await base44.entities.Auction.update(auction.id, {
        current_price: amount,
        current_bidder_id: currentUser.id,
        current_bidder_name: currentUser.full_name,
        current_bidder_club: currentUser.club_name || '',
        last_bid_at: now,
        ends_at: newEndsAt, // reset le timer à 1h après chaque offre
      });

      // Notifier le club vendeur qu'une surenchère a été faite
      if (auction.seller_club_id && auction.seller_club_id !== currentUser.club_id) {
        const allUsers = await base44.entities.User.list();
        const sellerUser = allUsers.find(u => u.club_id === auction.seller_club_id && u.has_selected_club);
        if (sellerUser) {
          await base44.entities.Notification.create({
            user_id: sellerUser.id,
            club_id: auction.seller_club_id,
            type: 'auction_ended',
            title: `Nouvelle offre sur ${auction.player_name}`,
            message: `${currentUser.full_name} (${currentUser.club_name || 'Inconnu'}) a enchéri à ${(amount / 1e6).toFixed(2)}M€ pour ${auction.player_name}.`,
            is_read: false,
            link_page: 'Community'
          });
        }
      }

      // Notifier l'ancien enchérisseur qu'il a été surenchéri
      if (auction.current_bidder_id && auction.current_bidder_id !== currentUser.id) {
        await base44.entities.Notification.create({
          user_id: auction.current_bidder_id,
          club_id: '',
          type: 'auction_ended',
          title: `Surenchère sur ${auction.player_name}`,
          message: `${currentUser.full_name} (${currentUser.club_name || 'Inconnu'}) vous a surenchéri avec ${(amount / 1e6).toFixed(2)}M€ pour ${auction.player_name}.`,
          is_read: false,
          link_page: 'Community'
        });
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['auctions'] }); setBidAmount(''); setShowBid(false); }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Auction.delete(auction.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      queryClient.invalidateQueries({ queryKey: ['auctions-ended'] });
    }
  });

  // Traitement automatique quand le timer expire
  const autoProcessMutation = useMutation({
    mutationFn: async () => {
      const price = auction.current_price || auction.starting_price || 0;

      if (isHorsLigue) {
        // Hors ligue : mettre à jour les budgets si un enchérisseur existe
        if (auction.current_bidder_id) {
          const allClubs = await base44.entities.Club.list();
          const allUsers = await base44.entities.User.list();
          const buyer = allUsers.find(u => u.id === auction.current_bidder_id);
          if (buyer?.club_id) {
            const buyerClub = allClubs.find(c => c.id === buyer.club_id);
            if (buyerClub) {
              await base44.entities.Club.update(buyer.club_id, { budget: buyerClub.budget - price });
            }
          }
          if (auction.seller_club_id) {
            const sellerClub = allClubs.find(c => c.id === auction.seller_club_id);
            if (sellerClub) {
              await base44.entities.Club.update(auction.seller_club_id, { budget: sellerClub.budget + price });
            }
          }
        }
        // Créer officialisation hors ligue
        await base44.entities.Auction.create({
          player_name: auction.player_name,
          player_position: auction.player_position,
          player_overall: auction.player_overall,
          player_age: auction.player_age,
          player_nationality: auction.player_nationality,
          player_image_url: auction.player_image_url,
          seller_club_id: auction.seller_club_id,
          seller_club_name: auction.seller_club_name,
          starting_price: price,
          current_price: price,
          current_bidder_id: auction.current_bidder_id,
          current_bidder_name: auction.current_bidder_name,
          current_bidder_club: auction.current_bidder_club,
          is_external_player: true,
          transfer_type: 'hors_ligue',
          status: 'completed',
          ends_at: auction.ends_at,
          reactions: {}
        });
        // Supprimer l'enchère active
        await base44.entities.Auction.delete(auction.id);

      } else {
        // Ligue : transférer le joueur vers le club gagnant
        if (auction.current_bidder_id && auction.player_id) {
          const allUsers = await base44.entities.User.list();
          const buyer = allUsers.find(u => u.id === auction.current_bidder_id);
          if (buyer?.club_id) {
            await base44.entities.Player.update(auction.player_id, {
              club_id: buyer.club_id,
              club_name: buyer.club_name,
              is_on_transfer_list: false,
              asking_price: null
            });

            // Mettre à jour les budgets
            const allClubs = await base44.entities.Club.list();
            const buyerClub = allClubs.find(c => c.id === buyer.club_id);
            if (buyerClub) {
              await base44.entities.Club.update(buyer.club_id, { budget: buyerClub.budget - price });
            }
            if (auction.seller_club_id) {
              const sellerClub = allClubs.find(c => c.id === auction.seller_club_id);
              if (sellerClub) {
                await base44.entities.Club.update(auction.seller_club_id, { budget: sellerClub.budget + price });
              }
            }

            // Créer officialisation ligue
            await base44.entities.Auction.create({
              player_id: auction.player_id,
              player_name: auction.player_name,
              player_position: auction.player_position,
              player_overall: auction.player_overall,
              player_age: auction.player_age,
              player_nationality: auction.player_nationality,
              player_image_url: auction.player_image_url,
              seller_club_id: auction.seller_club_id,
              seller_club_name: auction.seller_club_name,
              starting_price: price,
              current_price: price,
              current_bidder_id: buyer.id,
              current_bidder_name: buyer.full_name,
              current_bidder_club: buyer.club_name,
              is_external_player: false,
              transfer_type: 'ligue',
              status: 'completed',
              ends_at: auction.ends_at,
              reactions: {}
            });

            // Notifier le gagnant
            await base44.entities.Notification.create({
              user_id: buyer.id,
              club_id: buyer.club_id,
              type: 'auction_ended',
              title: `Enchère remportée : ${auction.player_name}`,
              message: `Vous avez remporté l'enchère pour ${auction.player_name} avec ${(price / 1e6).toFixed(2)}M€.`,
              is_read: false,
              link_page: 'Community'
            });
          }
        }
        // Supprimer l'enchère active
        await base44.entities.Auction.delete(auction.id);
      }
    },
    onSuccess: () => {
      setProcessed(true);
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      queryClient.invalidateQueries({ queryKey: ['auctions-ended'] });
      queryClient.invalidateQueries({ queryKey: ['my-players'] });
      queryClient.invalidateQueries({ queryKey: ['all-clubs'] });
    }
  });

  // Déclencher le traitement automatique dès que le timer tombe à 0
  useEffect(() => {
    if (!isActive || processed || autoProcessMutation.isPending || autoProcessMutation.isSuccess) return;
    if (!isEnded) return;
    autoProcessMutation.mutate();
  }, [isEnded, isActive, processed]);

  const closeMutation = useMutation({
    mutationFn: async () => {
      // Forcer l'expiration immédiate pour déclencher le traitement automatique
      await base44.entities.Auction.update(auction.id, {
        ends_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
    }
  });

  const reactMutation = useMutation({
    mutationFn: async (emoji) => {
      const reactions = { ...(auction.reactions || {}) };
      const arr = reactions[emoji] || [];
      const already = currentUser && arr.includes(currentUser.id);
      reactions[emoji] = already ? arr.filter(id => id !== currentUser.id) : [...arr, currentUser.id];
      await base44.entities.Auction.update(auction.id, { reactions });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['auctions'] })
  });

  const minBid = (auction.current_price || auction.starting_price || 0) + 100000;
  const isFreeAgent = !auction.seller_club_id && !isHorsLigue; // joueur sans club → achat direct

  const buyDirectMutation = useMutation({
    mutationFn: async () => {
      const price = auction.current_price || auction.starting_price || 0;
      if (!currentUser?.club_id) return;

      // Transférer le joueur vers l'acheteur
      if (auction.player_id) {
        await base44.entities.Player.update(auction.player_id, {
          club_id: currentUser.club_id,
          club_name: currentUser.club_name,
          is_on_transfer_list: false,
          asking_price: null
        });
      }

      // Débiter le budget de l'acheteur
      const allClubsDirect = await base44.entities.Club.list();
      const buyerClubDirect = allClubsDirect.find(c => c.id === currentUser.club_id);
      if (buyerClubDirect) {
        await base44.entities.Club.update(currentUser.club_id, { budget: buyerClubDirect.budget - price });
      }

      // Créer l'officialisation
      await base44.entities.Auction.create({
        player_id: auction.player_id,
        player_name: auction.player_name,
        player_position: auction.player_position,
        player_overall: auction.player_overall,
        player_age: auction.player_age,
        player_nationality: auction.player_nationality,
        player_image_url: auction.player_image_url,
        seller_club_id: null,
        seller_club_name: 'Agent libre',
        starting_price: price,
        current_price: price,
        current_bidder_id: currentUser.id,
        current_bidder_name: currentUser.full_name,
        current_bidder_club: currentUser.club_name,
        is_external_player: false,
        transfer_type: 'ligue',
        status: 'completed',
        ends_at: new Date().toISOString(),
        reactions: {}
      });

      // Supprimer l'enchère active
      await base44.entities.Auction.delete(auction.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      queryClient.invalidateQueries({ queryKey: ['auctions-ended'] });
      queryClient.invalidateQueries({ queryKey: ['my-players'] });
      queryClient.invalidateQueries({ queryKey: ['all-clubs'] });
    }
  });

  return (
    <div className={`bg-slate-800/60 border rounded-2xl p-5 space-y-4 ${!isActive || isEnded ? 'border-slate-700/30 opacity-70' : 'border-emerald-500/30'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {auction.player_image_url ? (
            <img src={auction.player_image_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <span className="text-white font-bold text-lg">{auction.player_name?.charAt(0)}</span>
            </div>
          )}
          <div>
            <p className="text-white font-bold">{auction.player_name}</p>
            <div className="flex gap-2 items-center flex-wrap">
              {auction.player_position && <Badge className="bg-slate-700 text-slate-300 text-xs">{auction.player_position}</Badge>}
              {auction.player_overall && <Badge className="bg-amber-500/20 text-amber-300 text-xs">⭐ {auction.player_overall}</Badge>}
              {auction.player_age && <span className="text-slate-500 text-xs">{auction.player_age} ans</span>}
              {auction.is_external_player && <Badge className="bg-purple-500/20 text-purple-300 text-xs">Externe</Badge>}
            </div>
            {auction.seller_club_name && <p className="text-slate-500 text-xs">Vendeur: {auction.seller_club_name}</p>}
          </div>
        </div>
        <div className="text-right shrink-0">
          {isActive && !isEnded ? (
            <div className="flex items-center gap-1 text-orange-400 text-sm font-medium">
              <Clock className="w-4 h-4" /> {countdown}
            </div>
          ) : (
            <Badge className={auction.status === 'closed' ? 'bg-red-500/20 text-red-300' : 'bg-slate-600 text-slate-300'}>
              {auction.status === 'closed' ? 'Fermée' : 'Terminée'}
            </Badge>
          )}
        </div>
      </div>

      {/* Price info */}
      <div className="bg-slate-900/50 rounded-xl p-3 flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-xs">Offre actuelle</p>
          <p className="text-emerald-400 font-bold text-xl">{((auction.current_price || auction.starting_price || 0) / 1000000).toFixed(2)}M€</p>
          {auction.current_bidder_name && (
            <p className="text-slate-400 text-xs mt-0.5">par {auction.current_bidder_name} ({auction.current_bidder_club})</p>
          )}
        </div>
        <Gavel className="w-8 h-8 text-slate-600" />
      </div>

      {/* Bid form */}
      {isActive && !isEnded && currentUser && (currentUser.club_id || currentUser.has_selected_club) && (
        <div>
          {showBid ? (
            <div className="flex gap-2">
              <Input
                type="number"
                value={bidAmount}
                onChange={e => setBidAmount(e.target.value)}
                placeholder={`Min: ${(minBid / 1000000).toFixed(2)}M€`}
                className="bg-slate-700 border-slate-600 text-white flex-1"
              />
              <Button onClick={() => bidMutation.mutate()} disabled={!bidAmount || parseFloat(bidAmount) < minBid || bidMutation.isPending}
                className="bg-emerald-500 hover:bg-emerald-600 shrink-0">
                {bidMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Offrir'}
              </Button>
              <Button variant="ghost" size="sm" className="text-slate-400" onClick={() => setShowBid(false)}>✕</Button>
            </div>
          ) : (
            <Button onClick={() => setShowBid(true)} variant="outline" className="w-full border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10">
              <Gavel className="w-4 h-4 mr-2" /> Faire une offre
            </Button>
          )}
        </div>
      )}

      {/* Staff close button */}
      {isStaff && isActive && !isEnded && (
        <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 w-full" onClick={() => closeMutation.mutate()} disabled={closeMutation.isPending}>
          {closeMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <XCircle className="w-4 h-4 mr-1" />} Fermer l'enchère
        </Button>
      )}

      {/* Processing indicator */}
      {isActive && isEnded && autoProcessMutation.isPending && (
        <div className="flex items-center justify-center gap-2 text-slate-400 text-sm py-1">
          <Loader2 className="w-4 h-4 animate-spin" /> Traitement en cours...
        </div>
      )}

      {/* Reactions */}
      <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-700/30">
        {EMOJIS.map(emoji => {
          const arr = auction.reactions?.[emoji] || [];
          const active = currentUser && arr.includes(currentUser.id);
          return (
            <button key={emoji} onClick={() => currentUser && reactMutation.mutate(emoji)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-sm transition-all ${active ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300' : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500'}`}>
              {emoji} {arr.length > 0 && <span className="text-xs">{arr.length}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}