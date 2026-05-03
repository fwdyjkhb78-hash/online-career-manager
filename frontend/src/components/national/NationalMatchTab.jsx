import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Swords, Plus, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function NationalMatchTab({ team }) {
  const queryClient = useQueryClient();
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [homeTeam, setHomeTeam] = useState(team?.country || '');
  const [awayTeam, setAwayTeam] = useState('');
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [editingMatchId, setEditingMatchId] = useState(null);
  const [editHomeScore, setEditHomeScore] = useState('');
  const [editAwayScore, setEditAwayScore] = useState('');

  const { data: matches = [] } = useQuery({
    queryKey: ['national-matches', team?.id],
    queryFn: async () => {
      try {
        const allMatches = await base44.entities.Match.list('-created_date', 200);
        // Filtrer les matchs nationaux (championnat ou tournoi) où cette équipe participe
        return allMatches.filter(m => 
          (m.match_type === 'championnat' || m.match_type === 'tournoi') &&
          (m.home_club_name === team?.country || m.away_club_name === team?.country)
        );
      } catch (e) {
        return [];
      }
    },
    enabled: !!team?.id,
  });

  const createMatchMutation = useMutation({
    mutationFn: async (matchData) => {
      const journee = matches.length + 1;
      await base44.entities.Match.create({
        journee,
        match_type: 'championnat',
        home_club_id: team?.id,
        home_club_name: homeTeam,
        away_club_id: 'national-' + awayTeam.replace(/\s+/g, '-'),
        away_club_name: awayTeam,
        home_score: parseInt(homeScore),
        away_score: parseInt(awayScore),
        status: 'confirmed',
        home_submitted_by: 'staff',
        away_submitted_by: 'staff',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['national-matches', team?.id] });
      queryClient.invalidateQueries({ queryKey: ['all-national-teams-list'] });
      setHomeScore('');
      setAwayScore('');
      setAwayTeam('');
      setMatchDialogOpen(false);
      toast.success('Match enregistré avec succès');
    },
    onError: (err) => {
      toast.error(err?.message || 'Erreur lors de la création du match');
    },
  });

  const deleteMatchMutation = useMutation({
    mutationFn: (matchId) => base44.entities.Match.delete(matchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['national-matches', team?.id] });
      queryClient.invalidateQueries({ queryKey: ['all-national-teams-list'] });
      toast.success('Match supprimé');
    },
  });

  const updateScoreMutation = useMutation({
    mutationFn: (data) => base44.entities.Match.update(data.matchId, {
      home_score: parseInt(data.homeScore),
      away_score: parseInt(data.awayScore),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['national-matches', team?.id] });
      queryClient.invalidateQueries({ queryKey: ['all-national-teams-list'] });
      setEditingMatchId(null);
      toast.success('Résultat enregistré');
    },
  });

  const handleCreateMatch = () => {
    if (!homeTeam.trim() || !awayTeam.trim() || homeScore === '' || awayScore === '') {
      toast.error('Remplissez tous les champs');
      return;
    }
    createMatchMutation.mutate({});
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          onClick={() => setMatchDialogOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un match
        </Button>
      </div>

      {matches.length === 0 ? (
        <div className="text-center py-16">
          <Swords className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">Aucun match enregistré</p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => (
            <div
              key={match.id}
              className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5"
            >
              {editingMatchId === match.id ? (
                <div className="space-y-3">
                  <p className="text-slate-400 text-sm mb-2">
                    {match.tournament_name ? (
                      <span className="inline-block bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded text-xs mr-2">{match.tournament_name}</span>
                    ) : (
                      <span>J{match.journee}</span>
                    )}
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 text-right">
                      <p className="text-white font-semibold text-sm">{match.home_club_name}</p>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      value={editHomeScore}
                      onChange={(e) => setEditHomeScore(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white text-center w-16"
                    />
                    <span className="text-slate-400">-</span>
                    <Input
                      type="number"
                      min="0"
                      value={editAwayScore}
                      onChange={(e) => setEditAwayScore(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white text-center w-16"
                    />
                    <div className="flex-1">
                      <p className="text-white font-semibold text-sm">{match.away_club_name}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingMatchId(null)}
                      className="flex-1 border-slate-600"
                    >
                      Annuler
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => updateScoreMutation.mutate({ matchId: match.id, homeScore: editHomeScore, awayScore: editAwayScore })}
                      disabled={updateScoreMutation.isPending}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                    >
                      {updateScoreMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Valider'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-slate-400 text-sm mb-2">
                      {match.tournament_name ? (
                        <span className="inline-block bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded text-xs mr-2">{match.tournament_name}</span>
                      ) : (
                        <span>J{match.journee}</span>
                      )}
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 text-right">
                        <p className="text-white font-semibold">{match.home_club_name}</p>
                      </div>
                      <button
                        onClick={() => {
                          setEditingMatchId(match.id);
                          setEditHomeScore(match.home_score ?? '');
                          setEditAwayScore(match.away_score ?? '');
                        }}
                        className="text-center bg-slate-900/50 hover:bg-slate-900 rounded-lg px-4 py-2 min-w-[80px] transition-colors cursor-pointer"
                      >
                        <p className="text-2xl font-black text-emerald-400">
                          {match.home_score !== null && match.away_score !== null ? 
                            `${match.home_score}-${match.away_score}` : 
                            '-'}
                        </p>
                      </button>
                      <div className="flex-1">
                        <p className="text-white font-semibold">{match.away_club_name}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteMatchMutation.mutate(match.id)}
                    disabled={deleteMatchMutation.isPending}
                    className="text-slate-500 hover:text-red-400 transition-colors ml-4"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={matchDialogOpen} onOpenChange={setMatchDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Ajouter un match</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Équipe adverse</label>
              <Input
                placeholder="Ex: Belgique, Pays-Bas..."
                value={awayTeam}
                onChange={(e) => setAwayTeam(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{homeTeam} - Buts</label>
                <Input
                  type="number"
                  min="0"
                  value={homeScore}
                  onChange={(e) => setHomeScore(e.target.value)}
                  placeholder="0"
                  className="bg-slate-800 border-slate-700 text-white text-center"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{awayTeam || 'Adverse'} - Buts</label>
                <Input
                  type="number"
                  min="0"
                  value={awayScore}
                  onChange={(e) => setAwayScore(e.target.value)}
                  placeholder="0"
                  className="bg-slate-800 border-slate-700 text-white text-center"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setMatchDialogOpen(false)}
                className="flex-1 border-slate-600 text-slate-300"
              >
                Annuler
              </Button>
              <Button
                onClick={handleCreateMatch}
                disabled={createMatchMutation.isPending}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600"
              >
                {createMatchMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Création...</>
                ) : (
                  'Créer le match'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}