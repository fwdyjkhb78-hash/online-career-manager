import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, UserX, Gavel, Loader2 } from 'lucide-react';
import { fetchAll } from '@/utils/fetchAll';
import { toast } from 'sonner';

export default function FreePlayersTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: players = [] } = useQuery({
    queryKey: ['all-players-staff'],
    queryFn: () => fetchAll('Player'),
  });

  const { data: auctions = [] } = useQuery({
    queryKey: ['auctions'],
    queryFn: async () => {
      const all = await base44.entities.Auction.list();
      return all.filter(a => a.status === 'active');
    },
  });

  // Joueurs avec un club (pas encore libres)
  const playersWithClub = players.filter(p => p.club_id && p.club_name);

  // Joueurs sans club
  const freePlayers = players.filter(p => !p.club_id || !p.club_name);

  const activeAuctionPlayerIds = new Set(auctions.map(a => a.player_id).filter(Boolean));

  const releasePlayerMutation = useMutation({
    mutationFn: async (player) => {
      // Récupérer le club pour mettre à jour son budget
      if (player.club_id && player.value) {
        const allClubs = await base44.entities.Club.list();
        const club = allClubs.find(c => c.id === player.club_id);
        if (club) {
          const newBudget = (club.budget || 0) + player.value;
          await base44.entities.Club.update(club.id, { budget: newBudget });
        }
      }
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
        seller_club_name: player.club_name || 'Inconnu',
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
      // Retirer le joueur de son club
      await base44.entities.Player.update(player.id, {
        club_id: null,
        club_name: null,
        is_on_transfer_list: false,
        asking_price: null,
      });
    },
    onSuccess: (_, player) => {
      queryClient.invalidateQueries({ queryKey: ['all-players-staff'] });
      const valueM = ((player.value || 0) / 1e6).toFixed(2);
      toast.success(`${player.name} libéré — ${valueM}M€ reversés au club`);
    },
    onError: () => toast.error('Erreur lors de la libération'),
  });

  const createAuctionMutation = useMutation({
    mutationFn: async (player) => {
      const startingPrice = player.value || player.asking_price || 0;
      const endsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h
      await base44.entities.Auction.create({
        player_id: player.id,
        player_name: player.name,
        player_position: player.position,
        player_overall: player.overall,
        player_age: player.age,
        player_nationality: player.nationality,
        player_image_url: player.image_url || '',
        seller_club_id: null,
        seller_club_name: 'Agent libre',
        starting_price: startingPrice,
        current_price: startingPrice,
        is_external_player: false,
        transfer_type: 'ligue',
        status: 'active',
        ends_at: endsAt,
        reactions: {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      toast.success('Enchère créée pour le joueur libre');
    },
    onError: () => toast.error('Erreur lors de la création de l\'enchère'),
  });

  const filteredWithClub = playersWithClub.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.club_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.position?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredFree = freePlayers.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.position?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Barre de recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un joueur..."
          className="bg-slate-800 border-slate-700 text-white pl-10"
        />
      </div>

      {/* Section: Libérer un joueur de son club */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <UserX className="w-5 h-5 text-red-400" />
            Libérer un joueur de son club
          </CardTitle>
          <p className="text-slate-400 text-sm">Le joueur devient sans club et pourra être mis aux enchères.</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredWithClub.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">Aucun joueur trouvé</p>
            ) : (
              filteredWithClub.map(player => (
                <div key={player.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {player.image_url ? (
                      <img src={player.image_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
                        <span className="text-white font-bold">{player.name?.charAt(0)}</span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{player.name}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="bg-slate-700 text-slate-300 text-xs">{player.position}</Badge>
                        <span className="text-slate-400 text-xs">⭐ {player.overall}</span>
                        <span className="text-slate-500 text-xs truncate">{player.club_name}</span>
                      </div>
                      <p className="text-emerald-400 text-xs">{((player.value || 0) / 1e6).toFixed(2)}M€</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => releasePlayerMutation.mutate(player)}
                    disabled={releasePlayerMutation.isPending}
                  >
                    {releasePlayerMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Libérer'}
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section: Joueurs libres — mettre aux enchères */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Gavel className="w-5 h-5 text-emerald-400" />
            Joueurs libres ({filteredFree.length})
          </CardTitle>
          <p className="text-slate-400 text-sm">Créer une enchère à la valeur du joueur pour qu'un club puisse le racheter.</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredFree.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">Aucun joueur libre</p>
            ) : (
              filteredFree.map(player => {
                const alreadyInAuction = activeAuctionPlayerIds.has(player.id);
                return (
                  <div key={player.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {player.image_url ? (
                        <img src={player.image_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
                          <span className="text-white font-bold">{player.name?.charAt(0)}</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{player.name}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className="bg-slate-700 text-slate-300 text-xs">{player.position}</Badge>
                          <span className="text-slate-400 text-xs">⭐ {player.overall}</span>
                          <Badge className="bg-amber-500/20 text-amber-300 text-xs">Agent libre</Badge>
                        </div>
                        <p className="text-emerald-400 text-xs">{((player.value || 0) / 1e6).toFixed(2)}M€</p>
                      </div>
                    </div>
                    {alreadyInAuction ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 text-xs shrink-0">En enchère</Badge>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-emerald-500 hover:bg-emerald-600 shrink-0"
                        onClick={() => createAuctionMutation.mutate(player)}
                        disabled={createAuctionMutation.isPending}
                      >
                        {createAuctionMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : (
                          <><Gavel className="w-3 h-3 mr-1" />Enchère</>
                        )}
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}