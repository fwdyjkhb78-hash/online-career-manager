import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Plus } from 'lucide-react';
import { toast } from 'sonner';

const AWARD_TYPES = {
  totw: { label: 'Team Of The Week', color: 'bg-blue-600' },
  toty: { label: 'Team Of The Year', color: 'bg-yellow-600' },
  ballon_d_or: { label: 'Ballon d\'Or', color: 'bg-amber-600' }
};

const FORMATION = {
  GK: 1,
  CB: 2,
  RB: 1,
  LB: 1,
  CM: 3,
  RW: 1,
  LW: 1,
  ST: 1,
};

const POSITION_LABELS = {
  GK: 'Gardien',
  CB: 'Défenseur Central',
  RB: 'Arrière Droit',
  LB: 'Arrière Gauche',
  CM: 'Milieu Central',
  RW: 'Ailier Droit',
  LW: 'Ailier Gauche',
  ST: 'Attaquant',
};

export default function AwardsTab() {
  const [open, setOpen] = useState(false);
  const [awardType, setAwardType] = useState('totw');
  const [season, setSeason] = useState(1);
  const [matchday, setMatchday] = useState(1);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [searchByPos, setSearchByPos] = useState({});
  const queryClient = useQueryClient();

  const { data: awards = [] } = useQuery({
    queryKey: ['awards'],
    queryFn: () => base44.entities.Award.list('-created_date', 100)
  });

  const { data: players = [] } = useQuery({
    queryKey: ['all-players'],
    queryFn: async () => {
      const all = await base44.entities.Player.list('-overall', 500);
      return all.filter(p => p.club_id && p.club_id.trim() !== '' && p.club_name && p.club_name.trim() !== '');
    }
  });

  const createAwardMutation = useMutation({
    mutationFn: async (playerId) => {
      const user = await base44.auth.me();
      const player = players.find(p => p.id === playerId);
      await base44.entities.Award.create({
        type: awardType,
        season,
        matchday: awardType === 'totw' ? matchday : undefined,
        player_id: player.id,
        player_name: player.name,
        position: player.position,
        club_id: player.club_id,
        club_name: player.club_name,
        overall: player.overall,
        image_url: player.image_url,
        created_by: user.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['awards'] });
      toast.success('Award ajouté');
    }
  });

  const deleteAwardMutation = useMutation({
    mutationFn: (awardId) => base44.entities.Award.delete(awardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['awards'] });
      toast.success('Award supprimé');
    }
  });

  const getPositionCount = (position) =>
    selectedPlayers.filter(id => players.find(p => p.id === id)?.position === position).length;

  const isFormationValid = () =>
    Object.entries(FORMATION).every(([pos, count]) => getPositionCount(pos) === count);

  const handleCreateAwards = () => {
    if (!isFormationValid()) { toast.error('Formation incomplète'); return; }
    selectedPlayers.forEach(playerId => createAwardMutation.mutate(playerId));
    setOpen(false);
    setSelectedPlayers([]);
    setSearchByPos({});
  };

  const togglePlayer = (playerId) => {
    const player = players.find(p => p.id === playerId);
    const posCount = getPositionCount(player.position);
    const posRequired = FORMATION[player.position];
    if (selectedPlayers.includes(playerId)) {
      setSelectedPlayers(prev => prev.filter(id => id !== playerId));
    } else if (posCount < posRequired) {
      setSelectedPlayers(prev => [...prev, playerId]);
    }
  };

  const filteredAwards = {
    totw: awards.filter(a => a.type === 'totw' && a.season === season),
    toty: awards.filter(a => a.type === 'toty' && a.season === season),
    ballon_d_or: awards.filter(a => a.type === 'ballon_d_or' && a.season === season)
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Gestion des Trophées</h3>
        <Button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un trophée
        </Button>
      </div>

      <Tabs defaultValue="totw" className="w-full">
        <TabsList className="bg-slate-800">
          <TabsTrigger value="totw">TOTW</TabsTrigger>
          <TabsTrigger value="toty">TOTY</TabsTrigger>
          <TabsTrigger value="ballon_d_or">Ballon d'Or</TabsTrigger>
        </TabsList>

        {['totw', 'toty', 'ballon_d_or'].map(type => (
          <TabsContent key={type} value={type} className="space-y-4">
            <div className="text-sm text-slate-400 mb-4">
              Saison: {season} | Total: {filteredAwards[type].length} joueurs
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredAwards[type].map(award => (
                <AwardCard key={award.id} award={award} onDelete={() => deleteAwardMutation.mutate(award.id)} />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter un trophée</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm text-slate-300">Type</label>
                <select
                  value={awardType}
                  onChange={(e) => setAwardType(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white text-sm"
                >
                  {Object.entries(AWARD_TYPES).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-300">Saison</label>
                <Input
                  type="number" min="1" value={season}
                  onChange={(e) => setSeason(parseInt(e.target.value))}
                  className="bg-slate-800 border-slate-600"
                />
              </div>
              {awardType === 'totw' && (
                <div>
                  <label className="text-sm text-slate-300">Journée</label>
                  <Input
                    type="number" min="1" value={matchday}
                    onChange={(e) => setMatchday(parseInt(e.target.value))}
                    className="bg-slate-800 border-slate-600"
                  />
                </div>
              )}
            </div>

            {/* Formation summary */}
            <div className="grid grid-cols-8 gap-1 p-2 bg-slate-700/50 rounded-lg">
              {Object.entries(FORMATION).map(([pos, required]) => {
                const current = getPositionCount(pos);
                return (
                  <div key={pos} className={`text-center p-1 rounded ${current === required ? 'bg-emerald-600' : 'bg-slate-600'}`}>
                    <p className="text-xs font-semibold text-white">{pos}</p>
                    <p className="text-sm font-bold text-white">{current}/{required}</p>
                  </div>
                );
              })}
            </div>

            {/* Player selection by position */}
            <div className="space-y-2">
              {Object.entries(FORMATION).map(([position, required]) => {
                const search = searchByPos[position] || '';
                const filtered = players
                  .filter(p => p.position === position)
                  .filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
                return (
                  <div key={position}>
                    <div className="flex items-center gap-2 mb-1">
                      <label className="text-xs text-slate-400">
                        {POSITION_LABELS[position]} ({getPositionCount(position)}/{required})
                      </label>
                      <input
                        type="text"
                        placeholder="Rechercher..."
                        value={search}
                        onChange={e => setSearchByPos(prev => ({ ...prev, [position]: e.target.value }))}
                        className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-0.5 text-white text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="bg-slate-700 rounded-lg max-h-24 overflow-y-auto space-y-0.5 p-1">
                      {filtered.map(player => (
                        <button
                          key={player.id}
                          onClick={() => togglePlayer(player.id)}
                          disabled={!selectedPlayers.includes(player.id) && getPositionCount(player.position) >= FORMATION[player.position]}
                          className={`w-full text-left px-2 py-1 rounded text-xs transition ${
                            selectedPlayers.includes(player.id)
                              ? 'bg-emerald-600 text-white'
                              : getPositionCount(player.position) >= FORMATION[player.position]
                              ? 'bg-slate-600 text-slate-500 opacity-50 cursor-not-allowed'
                              : 'hover:bg-slate-600 text-slate-300'
                          }`}
                        >
                          <span className="font-medium">{player.name}</span>
                          <span className="ml-2 opacity-70">{player.overall} • {player.club_name}</span>
                        </button>
                      ))}
                      {filtered.length === 0 && (
                        <p className="text-slate-500 text-xs text-center py-1">Aucun résultat</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="border-slate-600">
              Annuler
            </Button>
            <Button
              onClick={handleCreateAwards}
              disabled={!isFormationValid()}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Créer l'équipe type (11 joueurs)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AwardCard({ award, onDelete }) {
  return (
    <div className="bg-slate-800 rounded-lg p-3 relative group">
      <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-semibold text-white ${AWARD_TYPES[award.type].color}`}>
        {AWARD_TYPES[award.type].label}
      </div>
      <div className="h-20 bg-slate-700 rounded mb-2 overflow-hidden flex items-center justify-center">
        {award.image_url ? (
          <img src={award.image_url} alt={award.player_name} className="h-full object-cover" />
        ) : (
          <Trophy className="w-8 h-8 text-yellow-500" />
        )}
      </div>
      <p className="font-semibold text-white text-sm truncate">{award.player_name}</p>
      <p className="text-xs text-slate-400">{award.position} • {award.overall}</p>
      <p className="text-xs text-slate-500 mt-1">{award.club_name}</p>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 absolute top-2 left-2 text-red-400 hover:text-red-300 text-xs transition"
      >
        ✕
      </button>
    </div>
  );
}