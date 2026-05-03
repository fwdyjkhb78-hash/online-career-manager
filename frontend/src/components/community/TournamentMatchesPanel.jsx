import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Swords, CheckCircle2, Clock, Edit2, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function TournamentMatchesPanel({ tournament }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState({}); // matchId -> {home, away}

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ['tournament-matches', tournament.id],
    queryFn: () => base44.entities.Match.filter({ tournament_id: tournament.id }, 'journee'),
    staleTime: 10000,
  });

  const submitMutation = useMutation({
    mutationFn: async ({ match, homeScore, awayScore }) => {
      await base44.entities.Match.update(match.id, {
        home_score: Number(homeScore),
        away_score: Number(awayScore),
        status: 'confirmed',
      });
    },
    onSuccess: (_, { match }) => {
      queryClient.invalidateQueries({ queryKey: ['tournament-matches', tournament.id] });
      setEditing(prev => { const n = { ...prev }; delete n[match.id]; return n; });
      toast.success('Score enregistré !');
    },
  });

  const myClubId = user?.club_id;

  const canEditMatch = (match) => {
    if (!myClubId) return false;
    return match.home_club_id === myClubId || match.away_club_id === myClubId;
  };

  const startEdit = (match) => {
    setEditing(prev => ({
      ...prev,
      [match.id]: {
        home: match.home_score ?? '',
        away: match.away_score ?? '',
      }
    }));
  };

  const saveEdit = (match) => {
    const e = editing[match.id];
    if (e.home === '' || e.away === '') return toast.error('Scores incomplets');
    submitMutation.mutate({ match, homeScore: e.home, awayScore: e.away });
  };

  if (isLoading) return <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-slate-700 border-t-emerald-500 rounded-full animate-spin" /></div>;
  if (matches.length === 0) return <p className="text-slate-500 text-xs italic text-center py-2">Aucun match généré</p>;

  // Group by round (journee)
  const rounds = {};
  matches.forEach(m => {
    const r = m.journee || 1;
    if (!rounds[r]) rounds[r] = [];
    rounds[r].push(m);
  });

  return (
    <div className="space-y-4 mt-2">
      {Object.entries(rounds).map(([round, roundMatches]) => (
        <div key={round}>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1">
            <Swords className="w-3 h-3" /> Tour {round}
          </p>
          <div className="space-y-2">
            {roundMatches.map(match => {
              const isConfirmed = match.status === 'confirmed';
              const isEditing = !!editing[match.id];
              const canEdit = canEditMatch(match);
              const e = editing[match.id] || {};

              return (
                <div key={match.id} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${
                  isConfirmed ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-800/60 border-slate-700/50'
                }`}>
                  {/* Home */}
                  <span className={`flex-1 text-sm font-medium text-right truncate ${match.home_club_id === myClubId ? 'text-emerald-400' : 'text-white'}`}>
                    {match.home_club_name}
                  </span>

                  {/* Score */}
                  {isEditing ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number" min="0"
                        value={e.home}
                        onChange={ev => setEditing(p => ({ ...p, [match.id]: { ...p[match.id], home: ev.target.value } }))}
                        className="w-10 text-center bg-slate-700 border border-slate-600 rounded text-white text-sm py-0.5 px-1"
                      />
                      <span className="text-slate-400 font-bold">-</span>
                      <input
                        type="number" min="0"
                        value={e.away}
                        onChange={ev => setEditing(p => ({ ...p, [match.id]: { ...p[match.id], away: ev.target.value } }))}
                        className="w-10 text-center bg-slate-700 border border-slate-600 rounded text-white text-sm py-0.5 px-1"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 shrink-0 px-2">
                      {isConfirmed ? (
                        <span className="text-white font-black text-base">
                          {match.home_score} - {match.away_score}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" /> À jouer
                        </span>
                      )}
                    </div>
                  )}

                  {/* Away */}
                  <span className={`flex-1 text-sm font-medium text-left truncate ${match.away_club_id === myClubId ? 'text-emerald-400' : 'text-white'}`}>
                    {match.away_club_name}
                  </span>

                  {/* Action */}
                  <div className="shrink-0 w-7">
                    {isConfirmed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : isEditing ? (
                      <button onClick={() => saveEdit(match)} className="p-1 text-emerald-400 hover:text-emerald-300">
                        <Save className="w-4 h-4" />
                      </button>
                    ) : canEdit ? (
                      <button onClick={() => startEdit(match)} className="p-1 text-slate-400 hover:text-white">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}