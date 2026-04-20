import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowRight, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';

export default function MovePlayersTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [targetClubId, setTargetClubId] = useState('');
  const [moveMode, setMoveMode] = useState('transfer'); // 'transfer' | 'loan'
  const [loanBuyOption, setLoanBuyOption] = useState('');
  const [loanMandatoryBuy, setLoanMandatoryBuy] = useState('');
  const [loanSeasons, setLoanSeasons] = useState(1);

  const { data: players = [], isLoading: loadingPlayers } = useQuery({
    queryKey: ['all-players-move'],
    queryFn: () => base44.entities.Player.list(),
  });

  const { data: clubs = [] } = useQuery({
    queryKey: ['clubs-move'],
    queryFn: () => base44.entities.Club.list(),
  });

  const moveMutation = useMutation({
    mutationFn: async ({ player, clubId, isLoan }) => {
      const club = clubs.find(c => c.id === clubId);
      const now = new Date().toISOString();
      // Dans les deux cas on déplace le joueur
      await base44.entities.Player.update(player.id, {
        club_id: clubId,
        club_name: club?.name || '',
        is_on_transfer_list: false,
      });
      // Créer une officialisation
      await base44.entities.Auction.create({
        player_id: player.id,
        player_name: player.name,
        player_position: player.position || '',
        player_overall: player.overall || 0,
        player_age: player.age || null,
        player_nationality: player.nationality || '',
        player_image_url: player.image_url || '',
        seller_club_id: player.club_id || '',
        seller_club_name: player.club_name || 'Sans club',
        current_bidder_club: club?.name || '',
        starting_price: 0,
        current_price: 0,
        last_bid_at: now,
        ends_at: now,
        status: 'completed',
        is_external_player: false,
        transfer_type: 'ligue',
        is_loan: isLoan,
        loan_seasons: isLoan ? loanSeasons : undefined,
        loan_buy_option: isLoan && loanBuyOption ? parseInt(loanBuyOption) : 0,
        loan_mandatory_buy_option: isLoan && loanMandatoryBuy ? parseInt(loanMandatoryBuy) : 0,
        reactions: {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-players-move'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      toast.success(moveMode === 'loan' ? 'Joueur mis en prêt !' : 'Joueur transféré avec succès !');
      setSelectedPlayer(null);
      setTargetClubId('');
      setLoanBuyOption('');
      setLoanMandatoryBuy('');
      setLoanSeasons(1);
      setMoveMode('transfer');
    },
    onError: () => toast.error('Erreur lors du déplacement'),
  });

  const filtered = players.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.club_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-white font-bold text-lg mb-1">Déplacer des joueurs</h2>
        <p className="text-slate-400 text-sm">Sélectionnez un joueur et choisissez son nouveau club.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un joueur ou club..."
          className="bg-slate-800 border-slate-700 text-white pl-9"
        />
      </div>

      {loadingPlayers ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-slate-500 animate-spin" /></div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {filtered.map(player => (
            <div
              key={player.id}
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                selectedPlayer?.id === player.id
                  ? 'bg-emerald-500/10 border-emerald-500/40'
                  : 'bg-slate-800/60 border-slate-700/50 hover:border-slate-600'
              }`}
              onClick={() => { setSelectedPlayer(player); setTargetClubId(''); setMoveMode('transfer'); setLoanBuyOption(''); setLoanMandatoryBuy(''); setLoanSeasons(1); }}
            >
              <div>
                <p className="text-white font-medium">{player.name}</p>
                <p className="text-slate-400 text-xs">{player.position} · {player.club_name || 'Sans club'} · OVR {player.overall}</p>
              </div>
              {selectedPlayer?.id === player.id && (
                <div className="flex flex-col gap-2 items-end" onClick={e => e.stopPropagation()}>
                  {/* Mode selector */}
                  <div className="flex rounded-lg overflow-hidden border border-slate-700">
                    {[{id:'transfer',label:'Transfert'},{id:'loan',label:'Prêt'}].map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMoveMode(m.id)}
                        className={`px-3 py-1 text-xs font-semibold transition-colors ${
                          moveMode === m.id ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >{m.label}</button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-emerald-400 shrink-0" />
                    <Select value={targetClubId} onValueChange={setTargetClubId}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white w-44 h-8 text-xs">
                        <SelectValue placeholder="Nouveau club..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {moveMode === 'transfer' && <SelectItem value="free" className="text-white text-xs">Sans club (libre)</SelectItem>}
                        {clubs.filter(c => c.id !== player.club_id).map(c => (
                          <SelectItem key={c.id} value={c.id} className="text-white text-xs">{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      className="bg-emerald-500 hover:bg-emerald-600 h-8 text-xs px-3"
                      disabled={!targetClubId || moveMutation.isPending}
                      onClick={() => moveMutation.mutate({ player, clubId: targetClubId === 'free' ? '' : targetClubId, isLoan: moveMode === 'loan' })}
                    >
                      {moveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'OK'}
                    </Button>
                  </div>
                  {/* Loan options */}
                  {moveMode === 'loan' && (
                    <div className="flex flex-col gap-2 mt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-xs">Saisons :</span>
                        {[1, 2, 3].map(n => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setLoanSeasons(n)}
                            className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                              loanSeasons === n ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                            }`}
                          >{n}</button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={loanBuyOption}
                          onChange={e => setLoanBuyOption(e.target.value)}
                          placeholder="Option d'achat (€)"
                          className="bg-slate-800 border-slate-700 text-white text-xs h-8 w-36"
                        />
                        <Input
                          type="number"
                          value={loanMandatoryBuy}
                          onChange={e => setLoanMandatoryBuy(e.target.value)}
                          placeholder="Obligatoire (€)"
                          className="bg-slate-800 border-slate-700 text-white text-xs h-8 w-36"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}