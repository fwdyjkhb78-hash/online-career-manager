import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Plus, Zap } from 'lucide-react';
import { toast } from 'sonner';

const AWARD_TYPES = {
  totw:            { label: 'Team Of The Week',    color: 'bg-blue-600',    emoji: '📅' },
  toty:            { label: 'Team Of The Year',    color: 'bg-yellow-600',  emoji: '🏆' },
  ballon_d_or:     { label: "Ballon d'Or",         color: 'bg-amber-600',   emoji: '🥇', isRanking: true, maxPick: 10 },
  meilleur_jeune:  { label: 'Meilleur Jeune',      color: 'bg-green-600',   emoji: '🌟', isRanking: true, maxPick: 5, filterFn: (p) => (p.age || 99) < 23 },
  meilleur_gardien:{ label: 'Meilleur Gardien',    color: 'bg-cyan-600',    emoji: '🧤', isRanking: true, maxPick: 5, filterFn: (p) => p.position === 'GK' },
  meilleur_coach:  { label: 'Meilleur Coach',      color: 'bg-purple-600',  emoji: '🎖️', isRanking: true, maxPick: 5, isCoach: true },
};

const FORMATION = { GK: 1, CB: 2, RB: 1, LB: 1, CM: 3, RW: 1, LW: 1, ST: 1 };
const POSITION_LABELS = {
  GK: 'Gardien', CB: 'Défenseur Central', RB: 'Arrière Droit', LB: 'Arrière Gauche',
  CM: 'Milieu Central', RW: 'Ailier Droit', LW: 'Ailier Gauche', ST: 'Attaquant',
};

const DEFAULT_BOOSTS_10 = [3, 2, 1, 1, 1, 0, 0, 0, 0, 0];
const DEFAULT_BOOSTS_5  = [2, 1, 1, 0, 0];

export default function AwardsTab() {
  const [open, setOpen] = useState(false);
  const [awardType, setAwardType] = useState('totw');
  const [season, setSeason] = useState(1);
  const [matchday, setMatchday] = useState(1);
  const [selectedItems, setSelectedItems] = useState([]); // player ids or user ids
  const [searchQuery, setSearchQuery] = useState('');
  const [searchByPos, setSearchByPos] = useState({});
  const [boostPerRank, setBoostPerRank] = useState(DEFAULT_BOOSTS_10);
  const [boostJournees, setBoostJournees] = useState(5);
  const [publishAnnouncement, setPublishAnnouncement] = useState(true);
  const [decrementLoading, setDecrementLoading] = useState(false);
  const queryClient = useQueryClient();

  const typeDef = AWARD_TYPES[awardType];
  const isRanking = !!typeDef?.isRanking;
  const isCoach = !!typeDef?.isCoach;
  const maxPick = typeDef?.maxPick || 10;
  const isFormationBased = !isRanking && (awardType === 'totw' || awardType === 'toty');

  const { data: awards = [] } = useQuery({
    queryKey: ['awards'],
    queryFn: () => base44.entities.Award.list('-created_date', 200)
  });

  const { data: players = [] } = useQuery({
    queryKey: ['all-players'],
    queryFn: async () => {
      const all = await base44.entities.Player.list('-overall', 500);
      return all.filter(p => p.club_id && p.club_id.trim() !== '' && p.club_name && p.club_name.trim() !== '');
    }
  });

  const { data: users = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    enabled: isCoach
  });

  const deleteAwardMutation = useMutation({
    mutationFn: (id) => base44.entities.Award.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['awards'] }); toast.success('Award supprimé'); }
  });

  const getPositionCount = (pos) =>
    selectedItems.filter(id => players.find(p => p.id === id)?.position === pos).length;

  const isFormationValid = () => {
    if (isRanking) return selectedItems.length === maxPick;
    return Object.entries(FORMATION).every(([pos, count]) => getPositionCount(pos) === count);
  };

  // Reset when type changes
  const handleTypeChange = (type) => {
    setAwardType(type);
    setSelectedItems([]);
    setSearchQuery('');
    setSearchByPos({});
    const def = AWARD_TYPES[type];
    if (def?.isRanking) {
      setBoostPerRank(def.maxPick === 5 ? [...DEFAULT_BOOSTS_5] : [...DEFAULT_BOOSTS_10]);
    }
  };

  const handleCreateAwards = async () => {
    if (!isFormationValid()) {
      toast.error(isRanking ? `Sélectionnez exactement ${maxPick} candidats` : 'Formation incomplète');
      return;
    }

    const user = await base44.auth.me();

    if (isRanking) {
      const awardTitle = typeDef.label;
      for (let i = 0; i < selectedItems.length; i++) {
        const itemId = selectedItems[i];
        const boost = boostPerRank[i] ?? 0;

        if (isCoach) {
          const coach = users.find(u => u.id === itemId);
          if (!coach) continue;
          await base44.entities.Award.create({
            type: awardType, season,
            player_id: coach.id,
            player_name: coach.full_name || coach.email,
            club_name: coach.club_name || '',
            image_url: coach.image_url || '',
            created_by: user.email,
            reason: `Rang ${i + 1} — Meilleur Coach Saison ${season}`
          });
        } else {
          const player = players.find(p => p.id === itemId);
          if (!player) continue;
          await base44.entities.Award.create({
            type: awardType, season,
            player_id: player.id,
            player_name: player.name,
            position: player.position,
            club_id: player.club_id,
            club_name: player.club_name,
            overall: player.overall,
            image_url: player.image_url,
            created_by: user.email,
            reason: `Boost +${boost} OVR pendant ${boostJournees} journées`
          });
          if (boost > 0) {
            await base44.entities.Player.update(player.id, {
              overall: (player.overall || 0) + boost,
              boost_overall: boost,
              boost_journees_restantes: boostJournees,
              boost_base_overall: player.overall
            });
          }
        }
      }

      if (publishAnnouncement) {
        const lines = selectedItems.map((itemId, i) => {
          const boost = boostPerRank[i] ?? 0;
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
          if (isCoach) {
            const coach = users.find(u => u.id === itemId);
            return `${medal} ${coach?.full_name || coach?.email || '?'} (${coach?.club_name || ''})`;
          }
          const player = players.find(p => p.id === itemId);
          const boostText = boost > 0 ? ` — +${boost} OVR / ${boostJournees} journées` : '';
          return `${medal} ${player?.name || '?'} (${player?.club_name || ''})${boostText}`;
        }).join('\n');
        const winner = isCoach
          ? users.find(u => u.id === selectedItems[0])
          : players.find(p => p.id === selectedItems[0]);
        const winnerName = isCoach ? (winner?.full_name || winner?.email) : winner?.name;
        await base44.entities.Announcement.create({
          type: 'news',
          title: `${typeDef.emoji} ${awardTitle} — Saison ${season} — Vainqueur : ${winnerName}`,
          content: `Le classement ${awardTitle} de la saison ${season} est officiel !\n\n${lines}`,
          author_id: user.id,
          author_name: user.full_name,
          reactions: {}
        });
      }

      toast.success(`${typeDef.label} publié !`);
      queryClient.invalidateQueries({ queryKey: ['awards'] });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      if (!isCoach) queryClient.invalidateQueries({ queryKey: ['all-players'] });
    } else {
      // TOTW / TOTY — création individuelle
      for (const playerId of selectedItems) {
        const player = players.find(p => p.id === playerId);
        if (!player) continue;
        await base44.entities.Award.create({
          type: awardType, season,
          matchday: awardType === 'totw' ? matchday : undefined,
          player_id: player.id, player_name: player.name, position: player.position,
          club_id: player.club_id, club_name: player.club_name, overall: player.overall,
          image_url: player.image_url, created_by: user.email
        });
      }
      toast.success('Équipe type créée !');
      queryClient.invalidateQueries({ queryKey: ['awards'] });
    }

    setOpen(false);
    setSelectedItems([]);
    setSearchQuery('');
    setSearchByPos({});
  };

  const toggleItem = (id) => {
    if (isRanking) {
      if (selectedItems.includes(id)) {
        setSelectedItems(prev => prev.filter(x => x !== id));
      } else if (selectedItems.length < maxPick) {
        setSelectedItems(prev => [...prev, id]);
      }
      return;
    }
    // Formation-based
    const player = players.find(p => p.id === id);
    const posCount = getPositionCount(player.position);
    const posRequired = FORMATION[player.position];
    if (selectedItems.includes(id)) {
      setSelectedItems(prev => prev.filter(x => x !== id));
    } else if (posCount < posRequired) {
      setSelectedItems(prev => [...prev, id]);
    }
  };

  const handleDecrementBoosts = async () => {
    setDecrementLoading(true);
    const res = await base44.functions.invoke('decrementBoosts', {});
    setDecrementLoading(false);
    const d = res.data;
    toast.success(`Boosts mis à jour : ${d.reset} expirés, ${d.decremented} actifs`);
    queryClient.invalidateQueries({ queryKey: ['all-players'] });
  };

  // Filtered candidate list
  const getCandidates = () => {
    if (isCoach) {
      return users.filter(u => u.club_id || u.club_name)
        .filter(u => (u.full_name || u.email || '').toLowerCase().includes(searchQuery.toLowerCase()));
    }
    let pool = [...players];
    if (typeDef?.filterFn) pool = pool.filter(typeDef.filterFn);
    return pool.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  const filteredAwards = Object.fromEntries(
    Object.keys(AWARD_TYPES).map(type => [type, awards.filter(a => a.type === type && a.season === season)])
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="text-lg font-semibold text-white">Gestion des Trophées</h3>
        <div className="flex gap-2">
          <Button onClick={handleDecrementBoosts} disabled={decrementLoading} variant="outline" className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10">
            <Zap className="w-4 h-4 mr-2" />
            {decrementLoading ? 'Mise à jour...' : 'Journée suivante (boosts)'}
          </Button>
          <Button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un trophée
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <label className="text-sm text-slate-400">Saison affichée :</label>
        <Input type="number" min="1" value={season} onChange={e => setSeason(parseInt(e.target.value) || 1)}
          className="bg-slate-800 border-slate-600 w-20 text-sm" />
      </div>

      <Tabs defaultValue="totw" className="w-full">
        <TabsList className="bg-slate-800 flex-wrap h-auto gap-1">
          {Object.entries(AWARD_TYPES).map(([key, val]) => (
            <TabsTrigger key={key} value={key}>{val.emoji} {val.label}</TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(AWARD_TYPES).map(([type, val]) => (
          <TabsContent key={type} value={type} className="space-y-4">
            <div className="text-sm text-slate-400">Total: {filteredAwards[type]?.length || 0} entrées</div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {(filteredAwards[type] || []).map(award => (
                <AwardCard key={award.id} award={award} typeDef={val} onDelete={() => deleteAwardMutation.mutate(award.id)} />
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
            {/* Type + saison + journée */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm text-slate-300">Type</label>
                <select value={awardType} onChange={e => handleTypeChange(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white text-sm">
                  {Object.entries(AWARD_TYPES).map(([key, val]) => (
                    <option key={key} value={key}>{val.emoji} {val.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-300">Saison</label>
                <Input type="number" min="1" value={season} onChange={e => setSeason(parseInt(e.target.value))}
                  className="bg-slate-800 border-slate-600" />
              </div>
              {awardType === 'totw' && (
                <div>
                  <label className="text-sm text-slate-300">Journée</label>
                  <Input type="number" min="1" value={matchday} onChange={e => setMatchday(parseInt(e.target.value))}
                    className="bg-slate-800 border-slate-600" />
                </div>
              )}
            </div>

            {/* Compteur ou formation */}
            {isRanking ? (
              <div className="space-y-2">
                <div className={`text-center p-2 rounded-lg ${selectedItems.length === maxPick ? 'bg-emerald-600' : 'bg-slate-700/50'}`}>
                  <p className="text-white font-semibold">{selectedItems.length} / {maxPick} sélectionnés</p>
                  {typeDef.filterFn && awardType === 'meilleur_jeune' && (
                    <p className="text-xs text-slate-300 mt-0.5">Joueurs de moins de 23 ans uniquement</p>
                  )}
                  {awardType === 'meilleur_gardien' && (
                    <p className="text-xs text-slate-300 mt-0.5">Gardiens (GK) uniquement</p>
                  )}
                </div>
                {selectedItems.length > 0 && (
                  <div className="bg-slate-800 rounded-lg p-2 space-y-1">
                    <p className="text-xs text-amber-400 font-semibold mb-1">🏆 Classement — glissez pour réordonner</p>
                    {selectedItems.map((itemId, i) => {
                      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                      const label = isCoach
                        ? (() => { const u = users.find(u => u.id === itemId); return `${u?.full_name || u?.email} — ${u?.club_name || ''}`; })()
                        : (() => { const p = players.find(p => p.id === itemId); return `${p?.name} (${p?.overall} • ${p?.position} • ${p?.club_name})`; })();
                      return (
                        <div key={itemId} className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${i === 0 ? 'bg-amber-600/30 border border-amber-500/50' : 'bg-slate-700'}`}>
                          <span className="font-bold w-6 text-center">{medal}</span>
                          <span className="flex-1 text-white truncate">{label}</span>
                          {i !== 0 && (
                            <button onClick={() => setSelectedItems(prev => [itemId, ...prev.filter(id => id !== itemId)])}
                              className="text-amber-400 hover:text-amber-300" title="Mettre 1er">🔝</button>
                          )}
                          <button onClick={() => setSelectedItems(prev => prev.filter(id => id !== itemId))}
                            className="text-red-400 hover:text-red-300">✕</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
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
            )}

            {/* Liste de sélection */}
            <div>
              {isRanking || isCoach ? (
                <div>
                  <input type="text" placeholder="Rechercher..." value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full mb-2 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-emerald-500" />
                  <div className="bg-slate-700 rounded-lg max-h-52 overflow-y-auto space-y-0.5 p-1">
                    {getCandidates().map(item => {
                      const selected = selectedItems.includes(item.id);
                      const disabled = !selected && selectedItems.length >= maxPick;
                      const label = isCoach
                        ? `${item.full_name || item.email} — ${item.club_name || ''}`
                        : `${item.name} (${item.overall}${item.age ? ` • ${item.age} ans` : ''} • ${item.position} • ${item.club_name})`;
                      return (
                        <button key={item.id} onClick={() => toggleItem(item.id)} disabled={disabled}
                          className={`w-full text-left px-2 py-1 rounded text-xs transition ${
                            selected ? 'bg-amber-600 text-white'
                            : disabled ? 'bg-slate-600 text-slate-500 opacity-50 cursor-not-allowed'
                            : 'hover:bg-slate-600 text-slate-300'}`}>
                          {label}
                        </button>
                      );
                    })}
                    {getCandidates().length === 0 && <p className="text-slate-500 text-xs text-center py-2">Aucun résultat</p>}
                  </div>
                </div>
              ) : (
                Object.entries(FORMATION).map(([position, required]) => {
                  const search = searchByPos[position] || '';
                  const filtered = players.filter(p => p.position === position)
                    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
                  return (
                    <div key={position} className="mb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <label className="text-xs text-slate-400">{POSITION_LABELS[position]} ({getPositionCount(position)}/{required})</label>
                        <input type="text" placeholder="Rechercher..." value={search}
                          onChange={e => setSearchByPos(prev => ({ ...prev, [position]: e.target.value }))}
                          className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-0.5 text-white text-xs focus:outline-none focus:border-emerald-500" />
                      </div>
                      <div className="bg-slate-700 rounded-lg max-h-24 overflow-y-auto space-y-0.5 p-1">
                        {filtered.map(player => (
                          <button key={player.id} onClick={() => toggleItem(player.id)}
                            disabled={!selectedItems.includes(player.id) && getPositionCount(player.position) >= FORMATION[player.position]}
                            className={`w-full text-left px-2 py-1 rounded text-xs transition ${
                              selectedItems.includes(player.id) ? 'bg-emerald-600 text-white'
                              : getPositionCount(player.position) >= FORMATION[player.position] ? 'bg-slate-600 text-slate-500 opacity-50 cursor-not-allowed'
                              : 'hover:bg-slate-600 text-slate-300'}`}>
                            <span className="font-medium">{player.name}</span>
                            <span className="ml-2 opacity-70">{player.overall} • {player.club_name}</span>
                          </button>
                        ))}
                        {filtered.length === 0 && <p className="text-slate-500 text-xs text-center py-1">Aucun résultat</p>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Config boost (ranking non-coach) */}
          {isRanking && !isCoach && (
            <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-4 space-y-3 mt-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-semibold text-amber-300">Boosts par rang (OVR)</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {boostPerRank.slice(0, maxPick).map((val, i) => {
                  const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                  const selPlayer = selectedItems[i] ? players.find(p => p.id === selectedItems[i]) : null;
                  return (
                    <div key={i} className={`flex flex-col items-center gap-1 p-2 rounded-lg border ${i < 3 ? 'border-amber-500/40 bg-amber-500/10' : 'border-slate-700 bg-slate-800/50'}`}>
                      <span className="text-xs font-bold text-slate-300">{medal}</span>
                      {selPlayer && <span className="text-xs text-slate-400 truncate w-full text-center">{selPlayer.name.split(' ')[0]}</span>}
                      <input type="number" min="0" max="15" value={val}
                        onChange={e => { const next = [...boostPerRank]; next[i] = parseInt(e.target.value) || 0; setBoostPerRank(next); }}
                        className="w-full bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-white text-xs text-center focus:outline-none focus:border-amber-400" />
                      <span className="text-xs text-slate-500">OVR</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs text-slate-400">Durée (journées)</label>
                  <Input type="number" min="1" max="38" value={boostJournees}
                    onChange={e => setBoostJournees(parseInt(e.target.value) || 1)}
                    className="bg-slate-800 border-slate-600 text-sm" />
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <input type="checkbox" id="pub-ann" checked={publishAnnouncement}
                    onChange={e => setPublishAnnouncement(e.target.checked)} className="accent-emerald-500" />
                  <label htmlFor="pub-ann" className="text-xs text-slate-300 cursor-pointer">Publier une annonce</label>
                </div>
              </div>
            </div>
          )}

          {/* Option annonce pour coach (pas de boost) */}
          {isCoach && (
            <div className="flex items-center gap-2 mt-2 p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl">
              <input type="checkbox" id="pub-ann-coach" checked={publishAnnouncement}
                onChange={e => setPublishAnnouncement(e.target.checked)} className="accent-emerald-500" />
              <label htmlFor="pub-ann-coach" className="text-xs text-slate-300 cursor-pointer">Publier une annonce automatiquement</label>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="border-slate-600">Annuler</Button>
            <Button onClick={handleCreateAwards} disabled={!isFormationValid()}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {isRanking ? `Publier le classement (${maxPick})` : "Créer l'équipe type (11)"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AwardCard({ award, typeDef, onDelete }) {
  return (
    <div className="bg-slate-800 rounded-lg p-3 relative group">
      <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-semibold text-white ${typeDef.color}`}>
        {typeDef.emoji}
      </div>
      <div className="h-20 bg-slate-700 rounded mb-2 overflow-hidden flex items-center justify-center">
        {award.image_url
          ? <img src={award.image_url} alt={award.player_name} className="h-full object-cover" />
          : <Trophy className="w-8 h-8 text-yellow-500" />}
      </div>
      <p className="font-semibold text-white text-sm truncate">{award.player_name}</p>
      {award.position && <p className="text-xs text-slate-400">{award.position} • {award.overall}</p>}
      <p className="text-xs text-slate-500 mt-1">{award.club_name}</p>
      {award.reason && <p className="text-xs text-emerald-400 mt-1">{award.reason}</p>}
      <button onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 absolute top-2 left-2 text-red-400 hover:text-red-300 text-xs transition">✕</button>
    </div>
  );
}