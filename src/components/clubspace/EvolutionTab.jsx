import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TrendingUp, Search, ArrowUp, Loader2, Info, AlertTriangle, Settings, Trash2 } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from 'sonner';

// La saison est définie par l'entité Season active

const EVOLUTION_LEVELS = [
  { boost: 1, cost: 5_000_000,  label: '+1 OVR', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', btnColor: 'bg-emerald-500 hover:bg-emerald-600' },
  { boost: 2, cost: 10_000_000, label: '+2 OVR', color: 'text-cyan-400',    bg: 'bg-cyan-500/10 border-cyan-500/30',       btnColor: 'bg-cyan-500 hover:bg-cyan-600' },
  { boost: 3, cost: 15_000_000, label: '+3 OVR', color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/30',       btnColor: 'bg-blue-500 hover:bg-blue-600' },
  { boost: 4, cost: 20_000_000, label: '+4 OVR', color: 'text-violet-400',  bg: 'bg-violet-500/10 border-violet-500/30',   btnColor: 'bg-violet-500 hover:bg-violet-600' },
  { boost: 5, cost: 25_000_000, label: '+5 OVR', color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/30',     btnColor: 'bg-amber-500 hover:bg-amber-600' },
];

const STAT_FIELDS = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'];

const STAFF_ROLES = ['owner', 'admin', 'staff_mercato', 'staff_annonces', 'staff_championnat', 'staff_developpement', 'staff_formation'];

export default function EvolutionTab({ club, user }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [editingMax, setEditingMax] = useState(false); // editing used count
  const [editingLimit, setEditingLimit] = useState(false); // editing max limit
  const [maxInput, setMaxInput] = useState('');
  const [limitInput, setLimitInput] = useState('');
  const [editingPlayerEvoId, setEditingPlayerEvoId] = useState(null);
  const [playerEvoInput, setPlayerEvoInput] = useState('');
  const isStaff = user && STAFF_ROLES.includes(user.role);

  // Récupérer la saison active
  const { data: seasons = [] } = useQuery({
    queryKey: ['seasons'],
    queryFn: () => base44.entities.Season.list('-season_number', 1),
    staleTime: 30000,
  });
  const activeSeason = seasons.find(s => s.is_active) || seasons[0];
  const CURRENT_SEASON = activeSeason?.season_number || 1;

  const { data: players = [], isLoading } = useQuery({
    queryKey: ['my-players', club.id],
    queryFn: () => base44.entities.Player.filter({ club_id: club.id }),
    staleTime: 30000,
    retry: 1,
  });

  // Récupérer toutes les évolutions de la saison en cours pour ce club
  const { data: seasonEvolutions = [] } = useQuery({
    queryKey: ['season-evolutions', club.id, CURRENT_SEASON],
    queryFn: async () => {
      const all = await base44.entities.PlayerEvolution.filter({ club_id: club.id, season: CURRENT_SEASON });
      return all.filter(e => !e.is_academy);
    },
    staleTime: 10000,
    retry: 1,
    enabled: !!activeSeason,
  });

  const MAX_EVOLUTIONS = activeSeason?.max_evolutions ?? 10;
  const uniqueEvolvedPlayers = new Set(seasonEvolutions.map(e => e.player_id)).size;
  // Toujours calculer automatiquement depuis les enregistrements réels
  const totalEvolutionsThisSeason = uniqueEvolvedPlayers;
  const limitReached = totalEvolutionsThisSeason >= MAX_EVOLUTIONS;

  const updateUsedEvolutions = async (val) => {
    const num = parseInt(val);
    if (!activeSeason?.id || isNaN(num) || num < 0) return;
    const current = activeSeason.extra_evolutions_used || {};
    await base44.entities.Season.update(activeSeason.id, {
      extra_evolutions_used: { ...current, [club.id]: num }
    });
    queryClient.invalidateQueries({ queryKey: ['seasons'] });
    setEditingMax(false);
    toast.success(`Compteur mis à jour : ${num} évolution(s)`);
  };

  const updateMaxEvolutions = async (val) => {
    const num = parseInt(val);
    if (!activeSeason?.id || isNaN(num) || num < 1) return;
    await base44.entities.Season.update(activeSeason.id, { max_evolutions: num });
    queryClient.invalidateQueries({ queryKey: ['seasons'] });
    setEditingLimit(false);
    toast.success(`Limite max mise à jour : ${num}`);
  };

  // Modifier le nombre d'évolutions d'un joueur (staff)
  const setPlayerEvolutionCount = async (playerId, targetCount) => {
    const currentEvos = seasonEvolutions.filter(e => e.player_id === playerId);
    const currentCount = currentEvos.length;
    if (targetCount === currentCount) { setEditingPlayerEvoId(null); return; }
    if (targetCount < currentCount) {
      // Supprimer les excédents
      const toDelete = currentEvos.slice(targetCount);
      for (const evo of toDelete) await base44.entities.PlayerEvolution.delete(evo.id);
    } else {
      // Ajouter des entrées fictives
      const player = players.find(p => p.id === playerId);
      for (let i = currentCount; i < targetCount; i++) {
        await base44.entities.PlayerEvolution.create({
          player_id: playerId,
          player_name: player?.name || '',
          player_position: player?.position || '',
          player_image_url: player?.image_url || '',
          club_id: club.id,
          club_name: club.name,
          overall_before: player?.overall || 0,
          overall_after: player?.overall || 0,
          season: CURRENT_SEASON,
        });
      }
    }
    queryClient.invalidateQueries({ queryKey: ['season-evolutions'] });
    toast.success(`Compteur d'évolution mis à jour : ${targetCount}x`);
    setEditingPlayerEvoId(null);
  };

  // Compte combien de fois un joueur a évolué cette saison
  const getPlayerEvolutionCount = (playerId) =>
    seasonEvolutions.filter(e => e.player_id === playerId).length;

  // Calcule le coût réel : x(N+1) selon le nombre d'évolutions déjà effectuées cette saison
  const getRealCost = (playerId, baseCost) => {
    const count = getPlayerEvolutionCount(playerId);
    return baseCost * (count + 1);
  };

  const evolveMutation = useMutation({
    mutationFn: async ({ player, level, club }) => {
      const realCost = getRealCost(player.id, level.cost);
      const newBudget = (club.budget || 0) - realCost;
      if (newBudget < 0) throw new Error('Budget insuffisant');

      const newOverall = Math.min(99, (player.overall || 0) + level.boost);
      const statsUpdate = {};
      STAT_FIELDS.forEach(f => {
        if (player[f]) statsUpdate[f] = Math.min(99, (player[f] || 0) + level.boost);
      });

      // Augmentation valeur marchande : boost * 5M
      const valueIncrease = level.boost * 5_000_000;
      const newValue = (player.value || 0) + valueIncrease;

      // Mise à jour joueur + suppression clause de libération
      await base44.entities.Player.update(player.id, {
        overall: newOverall,
        ...statsUpdate,
        value: newValue,
        release_clause: null,
      });
      await base44.entities.Club.update(club.id, { budget: newBudget });
      await base44.entities.PlayerEvolution.create({
        player_id: player.id,
        player_name: player.name,
        player_position: player.position,
        player_image_url: player.image_url || '',
        club_id: club.id,
        club_name: club.name,
        overall_before: player.overall,
        overall_after: newOverall,
        season: CURRENT_SEASON,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-players', club.id] });
      queryClient.invalidateQueries({ queryKey: ['my-club'] });
      queryClient.invalidateQueries({ queryKey: ['season-evolutions'] });
      toast.success(`${selectedPlayer?.name} a évolué ! 🚀`);
      setConfirmOpen(false);
      setSelectedPlayer(null);
      setSelectedLevel(null);
    },
    onError: (err) => {
      toast.error(err.message || 'Erreur lors de l\'évolution');
      setConfirmOpen(false);
    }
  });

  const openConfirm = (player, level) => {
    setSelectedPlayer(player);
    setSelectedLevel(level);
    setConfirmOpen(true);
  };

  const deleteEvolution = useMutation({
    mutationFn: (evoId) => base44.entities.PlayerEvolution.delete(evoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['season-evolutions'] });
      toast.success('Évolution supprimée');
    }
  });

  const filtered = players.filter(p => {
    const q = search.toLowerCase();
    return !q || p.name?.toLowerCase().includes(q) || p.position?.toLowerCase().includes(q);
  });

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-violet-500 animate-spin" /></div>;

  const confirmRealCost = selectedPlayer && selectedLevel ? getRealCost(selectedPlayer.id, selectedLevel.cost) : 0;
  const selectedPlayerEvolutionCount = selectedPlayer ? getPlayerEvolutionCount(selectedPlayer.id) : 0;
  const isDoubled = selectedPlayerEvolutionCount > 0;

  return (
    <div className="space-y-5">
      {/* Header info */}
      <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-violet-300 font-semibold">Système d'Évolution — {activeSeason?.label || `Saison ${CURRENT_SEASON}`}</p>
            <p className="text-slate-400 text-sm">Faites évoluer vos joueurs depuis votre budget. <span className="text-amber-400 font-semibold">Le prix se multiplie à chaque évolution dans la même saison (x2, x3, x4…).</span></p>
            <div className="flex flex-wrap gap-2 mt-2">
              {EVOLUTION_LEVELS.map(l => (
                <span key={l.boost} className={`text-xs px-2 py-1 rounded-lg border ${l.bg} ${l.color} font-semibold`}>
                  {l.label} → {(l.cost / 1_000_000).toFixed(0)}M€
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Budget + compteur évolutions */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center justify-between bg-slate-800/50 border border-slate-700 rounded-2xl px-5 py-3">
          <span className="text-slate-400 text-sm">Budget disponible</span>
          <span className="text-white font-bold text-lg">{((club.budget || 0) / 1_000_000).toFixed(1)}M€</span>
        </div>
        <div className={`flex items-center justify-between border rounded-2xl px-5 py-3 ${limitReached ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-800/50 border-slate-700'}`}>
          <span className="text-slate-400 text-sm">Évolutions utilisées</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              {/* Used count */}
              {isStaff && editingMax ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={maxInput}
                    onChange={e => setMaxInput(e.target.value)}
                    className="w-12 bg-slate-700 border border-violet-500/50 rounded px-1 text-white text-sm font-bold text-center"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') updateUsedEvolutions(maxInput); if (e.key === 'Escape') setEditingMax(false); }}
                  />
                  <button onClick={() => updateUsedEvolutions(maxInput)} className="text-emerald-400 hover:text-emerald-300 text-xs font-bold">✓</button>
                  <button onClick={() => setEditingMax(false)} className="text-slate-500 hover:text-slate-300 text-xs">✕</button>
                </div>
              ) : (
                <span
                  className={`font-bold text-lg ${limitReached ? 'text-red-400' : 'text-white'} ${isStaff ? 'cursor-pointer hover:text-violet-400 transition-colors underline decoration-dotted' : ''}`}
                  onClick={() => { if (isStaff) { setMaxInput(String(totalEvolutionsThisSeason)); setEditingMax(true); } }}
                  title={isStaff ? 'Modifier le compteur utilisé' : ''}
                >{totalEvolutionsThisSeason}</span>
              )}
              <span className={`font-bold text-lg ${limitReached ? 'text-red-400' : 'text-white'}`}>/</span>
              {/* Max limit */}
              {isStaff && editingLimit ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={limitInput}
                    onChange={e => setLimitInput(e.target.value)}
                    className="w-12 bg-slate-700 border border-amber-500/50 rounded px-1 text-white text-sm font-bold text-center"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') updateMaxEvolutions(limitInput); if (e.key === 'Escape') setEditingLimit(false); }}
                  />
                  <button onClick={() => updateMaxEvolutions(limitInput)} className="text-emerald-400 hover:text-emerald-300 text-xs font-bold">✓</button>
                  <button onClick={() => setEditingLimit(false)} className="text-slate-500 hover:text-slate-300 text-xs">✕</button>
                </div>
              ) : (
                <span
                  className={`font-bold text-lg ${limitReached ? 'text-red-400' : 'text-white'} ${isStaff ? 'cursor-pointer hover:text-amber-400 transition-colors underline decoration-dotted' : ''}`}
                  onClick={() => { if (isStaff) { setLimitInput(String(MAX_EVOLUTIONS)); setEditingLimit(true); } }}
                  title={isStaff ? 'Modifier la limite max' : ''}
                >{MAX_EVOLUTIONS}</span>
              )}
            </div>
            {isStaff && !editingMax && !editingLimit && (
              <button onClick={() => setAdjustOpen(true)} className="text-slate-500 hover:text-slate-300 transition-colors">
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {limitReached && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-2xl">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-red-300 text-sm font-semibold">Limite de {MAX_EVOLUTIONS} évolutions atteinte pour cette saison.</p>
        </div>
      )}

      {/* Recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un joueur..."
          className="pl-9 bg-slate-800 border-slate-700 text-white"
        />
      </div>

      {/* Liste des joueurs */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{search ? 'Aucun résultat.' : 'Aucun joueur dans l\'effectif.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((player) => {
            const alreadyEvolved = getPlayerEvolutionCount(player.id) > 0;
            const atMaxPotential = player.potential && player.overall >= player.potential;
            return (
              <div key={player.id} className={`border rounded-2xl p-4 ${atMaxPotential ? 'bg-slate-800/30 border-slate-700/30 opacity-60' : alreadyEvolved ? 'bg-amber-500/5 border-amber-500/30' : 'bg-slate-800/60 border-slate-700/50'}`}>
                <div className="flex items-center gap-4 mb-3">
                  {player.image_url ? (
                    <img src={player.image_url} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center shrink-0">
                      <span className="text-white font-bold">{player.overall}</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-bold">{player.name}</p>
                      <Badge className="bg-slate-700 text-slate-300 text-xs">{player.position}</Badge>
                      <Badge className="bg-amber-500/20 text-amber-300 text-xs">⭐ {player.overall}</Badge>
                      {atMaxPotential && (
                        <Badge className="bg-slate-600/40 text-slate-400 border border-slate-600/30 text-xs">
                          🔒 Potentiel max atteint ({player.potential})
                        </Badge>
                      )}
                      {(alreadyEvolved || isStaff) && (
                        editingPlayerEvoId === player.id && isStaff ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              value={playerEvoInput}
                              onChange={e => setPlayerEvoInput(e.target.value)}
                              className="w-12 bg-slate-700 border border-violet-500/50 rounded px-1 text-white text-sm font-bold text-center"
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === 'Enter') setPlayerEvolutionCount(player.id, parseInt(playerEvoInput) || 0);
                                if (e.key === 'Escape') setEditingPlayerEvoId(null);
                              }}
                            />
                            <button onClick={() => setPlayerEvolutionCount(player.id, parseInt(playerEvoInput) || 0)} className="text-emerald-400 hover:text-emerald-300 text-xs font-bold">✓</button>
                            <button onClick={() => setEditingPlayerEvoId(null)} className="text-slate-500 hover:text-slate-300 text-xs">✕</button>
                          </div>
                        ) : (
                          <Badge
                            className={`${alreadyEvolved ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-slate-700/50 text-slate-400 border-slate-600/30'} border text-xs ${isStaff ? 'cursor-pointer hover:bg-amber-500/40' : ''}`}
                            onClick={() => { if (isStaff) { setPlayerEvoInput(String(getPlayerEvolutionCount(player.id))); setEditingPlayerEvoId(player.id); } }}
                            title={isStaff ? 'Cliquer pour modifier le compteur' : ''}
                          >
                            {alreadyEvolved ? `⚠️ Prix ×${getPlayerEvolutionCount(player.id) + 1} cette saison` : '✏️ 0 évo'}
                          </Badge>
                        )
                      )}
                    </div>
                    <p className="text-slate-500 text-xs mt-0.5">{player.age} ans · {player.nationality}</p>
                  </div>
                </div>

                {/* Boutons d'évolution */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {EVOLUTION_LEVELS.map((level) => {
                    const realCost = getRealCost(player.id, level.cost);
                    const wouldExceedPotential = player.potential && (player.overall + level.boost) > player.potential;
                    // Si le joueur a déjà été évolué cette saison, la limite ne s'applique pas (pas de nouveau slot)
                    const affordable = (club.budget || 0) >= realCost && (!limitReached || alreadyEvolved) && !atMaxPotential && !wouldExceedPotential;
                    return (
                      <button
                        key={level.boost}
                        onClick={() => affordable && openConfirm(player, level)}
                        disabled={!affordable}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-semibold transition-all
                          ${affordable
                            ? `${level.bg} ${level.color} hover:opacity-80 cursor-pointer`
                            : 'bg-slate-800/40 border-slate-700/40 text-slate-600 cursor-not-allowed'
                          }`}
                      >
                        <div className="flex items-center gap-0.5">
                          <ArrowUp className="w-3 h-3" />
                          <span>{level.boost}</span>
                        </div>
                        <span className={alreadyEvolved ? 'line-through opacity-50' : ''}>
                          {(level.cost / 1_000_000).toFixed(0)}M€
                        </span>
                        {alreadyEvolved && (
                          <span className="text-amber-400">{(realCost / 1_000_000).toFixed(0)}M€</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog ajustement évolutions */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-violet-400" />
              Ajuster les évolutions — {activeSeason?.label || `Saison ${CURRENT_SEASON}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-slate-400 text-sm">Supprimez des enregistrements d'évolution pour ajuster le compteur. Chaque joueur unique compte pour 1 slot.</p>
            {seasonEvolutions.length === 0 ? (
              <p className="text-slate-500 text-center py-6">Aucune évolution cette saison.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {seasonEvolutions.map(evo => (
                  <div key={evo.id} className="flex items-center justify-between p-3 bg-slate-800/60 rounded-xl">
                    <div>
                      <p className="text-white text-sm font-medium">{evo.player_name}</p>
                      <p className="text-slate-500 text-xs">{evo.overall_before} → {evo.overall_after} OVR</p>
                    </div>
                    <button
                      onClick={() => deleteEvolution.mutate(evo.id)}
                      disabled={deleteEvolution.isPending}
                      className="text-red-400 hover:text-red-300 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-violet-400" />
              Confirmer l'évolution
            </DialogTitle>
          </DialogHeader>

          {selectedPlayer && selectedLevel && (
            <div className="space-y-4">
              <div className="bg-slate-800/60 rounded-xl p-4 text-center">
                <p className="text-white font-bold text-lg">{selectedPlayer.name}</p>
                <p className="text-slate-400 text-sm">{selectedPlayer.position}</p>
                <div className="flex items-center justify-center gap-3 mt-3">
                  <div className="text-center">
                    <p className="text-slate-400 text-xs">OVR actuel</p>
                    <p className="text-2xl font-black text-white">{selectedPlayer.overall}</p>
                  </div>
                  <ArrowUp className={`w-6 h-6 ${selectedLevel.color}`} />
                  <div className="text-center">
                    <p className="text-slate-400 text-xs">Nouvel OVR</p>
                    <p className={`text-2xl font-black ${selectedLevel.color}`}>
                      {Math.min(99, (selectedPlayer.overall || 0) + selectedLevel.boost)}
                    </p>
                  </div>
                </div>
              </div>

              {isDoubled && (
                <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <p className="text-amber-300 text-xs">Ce joueur a déjà évolué {selectedPlayerEvolutionCount}x cette saison — prix multiplié par {selectedPlayerEvolutionCount + 1}.</p>
                </div>
              )}

              <div className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <span className="text-slate-300 text-sm">Coût</span>
                <div className="text-right">
                  {isDoubled && <p className="text-slate-500 text-xs line-through">{(selectedLevel.cost / 1_000_000).toFixed(0)}M€</p>}
                  <span className="text-red-400 font-bold">-{(confirmRealCost / 1_000_000).toFixed(0)}M€</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                <span className="text-slate-300 text-sm">Budget restant</span>
                <span className="text-white font-bold">
                  {(((club.budget || 0) - confirmRealCost) / 1_000_000).toFixed(1)}M€
                </span>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 border-slate-600" onClick={() => setConfirmOpen(false)}>
                  Annuler
                </Button>
                <Button
                  className={`flex-1 ${selectedLevel.btnColor}`}
                  onClick={() => evolveMutation.mutate({ player: selectedPlayer, level: selectedLevel, club })}
                  disabled={evolveMutation.isPending}
                >
                  {evolveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TrendingUp className="w-4 h-4 mr-2" />}
                  Confirmer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}