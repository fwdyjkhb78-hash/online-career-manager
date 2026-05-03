import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Loader2, Save, Plus, Trash2, Copy, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import TacticBoard from '@/components/tactics/TacticBoard';
import TacticSettings from '@/components/tactics/TacticSettings';
import { FORMATION_NAMES, buildLineupFromFormation } from '@/lib/formations';

export default function Tactics() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [club, setClub] = useState(null);
  const [selectedTacticId, setSelectedTacticId] = useState(null);
  const [editedTactic, setEditedTactic] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u?.club_id) {
        base44.entities.Club.filter({ id: u.club_id }).then(clubs => setClub(clubs?.[0] || null));
      }
    });
  }, []);

  const { data: tactics = [], isLoading } = useQuery({
    queryKey: ['tactics', user?.club_id],
    queryFn: () => base44.entities.Tactic.filter({ club_id: user.club_id }),
    enabled: !!user?.club_id,
  });

  const { data: players = [] } = useQuery({
    queryKey: ['my-players', user?.club_id],
    queryFn: () => base44.entities.Player.filter({ club_id: user.club_id }),
    enabled: !!user?.club_id,
  });

  const saveMutation = useMutation({
    mutationFn: (tactic) => tactic.id
      ? base44.entities.Tactic.update(tactic.id, tactic)
      : base44.entities.Tactic.create(tactic),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tactics'] });
      toast.success('Tactique sauvegardée !');
    },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Tactic.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tactics'] });
      setSelectedTacticId(null);
      setEditedTactic(null);
      toast.success('Tactique supprimée');
    },
  });

  const createNew = () => {
    const newTactic = {
      club_id: user.club_id,
      club_name: club?.name || '',
      name: 'Nouvelle Tactique',
      formation: '4-3-3',
      mentality: 'balanced',
      pressing: 5,
      defensive_line: 5,
      width: 5,
      tempo: 5,
      build_up: 'mixed',
      defensive_shape: 'balanced',
      set_pieces_attack: '',
      set_pieces_defense: '',
      lineup: buildLineupFromFormation('4-3-3'),
      is_active: true,
    };
    setSelectedTacticId(null);
    setEditedTactic(newTactic);
  };

  const selectTactic = (tactic) => {
    setSelectedTacticId(tactic.id);
    setEditedTactic({ ...tactic });
  };

  const handleFormationChange = (formation) => {
    const newLineup = buildLineupFromFormation(formation);
    // Conserver les joueurs assignés si possible
    const oldLineup = editedTactic.lineup || [];
    const newLineupWithPlayers = newLineup.map((slot, i) => ({
      ...slot,
      player_id: oldLineup[i]?.player_id || '',
      player_name: oldLineup[i]?.player_name || '',
      instructions: oldLineup[i]?.instructions || { list: [] },
    }));
    setEditedTactic({ ...editedTactic, formation, lineup: newLineupWithPlayers });
  };

  const handleSave = () => {
    if (!editedTactic.name?.trim()) {
      toast.error('Donne un nom à ta tactique');
      return;
    }
    saveMutation.mutate(editedTactic);
  };

  const duplicateTactic = () => {
    const dup = { ...editedTactic, id: undefined, name: editedTactic.name + ' (copie)' };
    setEditedTactic(dup);
    setSelectedTacticId(null);
  };

  if (!user || isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!user.club_id) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        Vous devez avoir un club pour gérer vos tactiques.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <Swords className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Tactiques</h1>
              <p className="text-slate-400 text-sm">{club?.name}</p>
            </div>
          </div>
          <Button onClick={createNew} className="bg-emerald-500 hover:bg-emerald-600">
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle Tactique
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Liste des tactiques */}
          <div className="lg:col-span-1 space-y-2">
            <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Mes Tactiques ({tactics.length})</h2>
            {tactics.length === 0 && !editedTactic && (
              <div className="text-center py-8 text-slate-500 text-sm border border-dashed border-slate-700 rounded-xl">
                Aucune tactique.<br />Crée-en une !
              </div>
            )}
            {tactics.map(t => (
              <motion.button
                key={t.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => selectTactic(t)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selectedTacticId === t.id
                    ? 'bg-emerald-500/10 border-emerald-500/50'
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                }`}
              >
                <p className="text-white font-medium text-sm truncate">{t.name}</p>
                <p className="text-slate-400 text-xs mt-0.5">{t.formation} · {t.mentality?.replace('_', ' ')}</p>
              </motion.button>
            ))}
          </div>

          {/* Éditeur */}
          {editedTactic ? (
            <div className="lg:col-span-3 space-y-4">
              {/* Nom + Formation + Actions */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Input
                    value={editedTactic.name || ''}
                    onChange={(e) => setEditedTactic({ ...editedTactic, name: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white font-bold text-lg w-64"
                    placeholder="Nom de la tactique"
                  />
                  <Select value={editedTactic.formation} onValueChange={handleFormationChange}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {FORMATION_NAMES.map(f => (
                        <SelectItem key={f} value={f} className="text-white">{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2 ml-auto">
                    <Button variant="outline" size="sm" onClick={duplicateTactic} className="border-slate-600 text-slate-300">
                      <Copy className="w-4 h-4" />
                    </Button>
                    {selectedTacticId && (
                      <Button
                        variant="outline" size="sm"
                        onClick={() => deleteMutation.mutate(selectedTacticId)}
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      onClick={handleSave}
                      disabled={saveMutation.isPending}
                      className="bg-emerald-500 hover:bg-emerald-600"
                    >
                      {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Sauvegarder
                    </Button>
                  </div>
                </div>
              </div>

              {/* Terrain + Paramètres */}
              <Tabs defaultValue="board">
                <TabsList className="bg-slate-800/50 border border-slate-700/50">
                  <TabsTrigger value="board" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
                    ⚽ Terrain & Composition
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                    ⚙️ Paramètres Tactiques
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="board">
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
                    <div className="max-w-xs mx-auto">
                      <TacticBoard
                        lineup={editedTactic.lineup || []}
                        players={players}
                        formation={editedTactic.formation}
                        onLineupChange={(lineup) => setEditedTactic({ ...editedTactic, lineup })}
                      />
                    </div>
                    <p className="text-center text-slate-500 text-xs mt-3">Clique sur un joueur pour l'assigner et définir ses instructions</p>
                  </div>
                </TabsContent>

                <TabsContent value="settings">
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                    <TacticSettings
                      tactic={editedTactic}
                      onChange={setEditedTactic}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="lg:col-span-3 flex items-center justify-center border border-dashed border-slate-700 rounded-2xl text-center py-20">
              <div>
                <Swords className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">Sélectionne une tactique ou crée-en une nouvelle</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}