import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Swords, Medal, Users, Clock } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TYPE_LABELS = {
  championnat: '🏆 Championnat',
  tableau: '⚔️ Tableau éliminatoire',
  poules: '📋 Phase de poules',
  coupe: '🥤 Coupe',
};

const STATUS_LABELS = {
  upcoming: { label: 'À venir', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  ongoing: { label: 'En cours', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  finished: { label: 'Terminé', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
};

function formatEuros(amount) {
  if (!amount) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

function TournamentMatchResults({ tournamentId, tournamentName }) {
  const { data: matches = [] } = useQuery({
    queryKey: ['tournament-matches', tournamentId],
    queryFn: () => base44.entities.Match.filter({ tournament_id: tournamentId }, 'journee'),
    staleTime: 15000,
  });

  if (matches.length === 0) return null;

  const rounds = {};
  matches.forEach(m => {
    const r = m.journee || 1;
    if (!rounds[r]) rounds[r] = [];
    rounds[r].push(m);
  });

  return (
    <div className="border border-slate-700/50 rounded-xl p-3 bg-slate-800/30">
      <h4 className="text-white font-semibold text-sm flex items-center gap-2 mb-3">
        <Swords className="w-4 h-4 text-red-400" /> Matchs
      </h4>
      <div className="space-y-3">
        {Object.entries(rounds).map(([round, roundMatches]) => (
          <div key={round}>
            {Object.keys(rounds).length > 1 && (
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1">Tour {round}</p>
            )}
            <div className="space-y-1.5">
              {roundMatches.map(m => (
                <div key={m.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                  m.status === 'confirmed' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-700/30 border-slate-700'
                }`}>
                  <span className="flex-1 text-right text-white font-medium truncate">{m.home_club_name}</span>
                  <span className="shrink-0 px-2 font-black text-white">
                    {m.status === 'confirmed' ? `${m.home_score} - ${m.away_score}` : <Clock className="w-3 h-3 text-slate-500" />}
                  </span>
                  <span className="flex-1 text-left text-white font-medium truncate">{m.away_club_name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TournamentTab() {
  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ['tournaments-public'],
    queryFn: () => base44.entities.Tournament.list('-created_date', 50),
  });

  if (isLoading) {
    return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin" /></div>;
  }

  if (tournaments.length === 0) {
    return (
      <div className="text-center py-16">
        <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400 text-lg">Aucun tournoi pour le moment</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tournaments.map(t => {
        const statusInfo = STATUS_LABELS[t.status] || STATUS_LABELS.upcoming;
        return (
          <Card key={t.id} className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shrink-0">
                    <Trophy className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-white text-lg">{t.name}</CardTitle>
                    <div className="flex items-center gap-3 mt-1">
                      {t.tournament_type && <span className="text-slate-400 text-xs">{TYPE_LABELS[t.tournament_type] || t.tournament_type}</span>}
                      {t.team_count && <span className="text-slate-500 text-xs flex items-center gap-1"><Users className="w-3 h-3" />{t.team_count} équipes</span>}
                    </div>
                    {t.created_by_name && <p className="text-slate-500 text-xs">Créé par {t.created_by_name}</p>}
                  </div>
                </div>
                <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {t.description && <p className="text-slate-400 text-sm">{t.description}</p>}

              {/* Prizes */}
              {(t.prize_1st > 0 || t.prize_2nd > 0 || t.prize_3rd > 0) && (
                <div className="grid grid-cols-3 gap-2">
                  {t.prize_1st > 0 && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-center">
                      <Medal className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                      <p className="text-yellow-400 font-bold text-sm">{formatEuros(t.prize_1st)}</p>
                      <p className="text-slate-500 text-xs">1ère place</p>
                    </div>
                  )}
                  {t.prize_2nd > 0 && (
                    <div className="bg-slate-500/10 border border-slate-500/20 rounded-xl p-3 text-center">
                      <Medal className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                      <p className="text-slate-300 font-bold text-sm">{formatEuros(t.prize_2nd)}</p>
                      <p className="text-slate-500 text-xs">2ème place</p>
                    </div>
                  )}
                  {t.prize_3rd > 0 && (
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 text-center">
                      <Medal className="w-4 h-4 text-orange-400 mx-auto mb-1" />
                      <p className="text-orange-400 font-bold text-sm">{formatEuros(t.prize_3rd)}</p>
                      <p className="text-slate-500 text-xs">3ème place</p>
                    </div>
                  )}
                </div>
              )}

              {/* Winners */}
              {t.status === 'finished' && (t.winner_club_name || t.second_club_name || t.third_club_name) && (
                <div className="bg-slate-800/50 rounded-xl p-4 space-y-2">
                  <h4 className="text-white font-semibold flex items-center gap-2 mb-3">
                    <Swords className="w-4 h-4 text-yellow-400" /> Résultats
                  </h4>
                  {t.winner_club_name && (
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400 text-lg">🥇</span>
                      <span className="text-white font-medium">{t.winner_club_name}</span>
                      {t.prize_1st > 0 && <span className="text-yellow-400 text-sm ml-auto">+{formatEuros(t.prize_1st)}</span>}
                    </div>
                  )}
                  {t.second_club_name && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-300 text-lg">🥈</span>
                      <span className="text-white font-medium">{t.second_club_name}</span>
                      {t.prize_2nd > 0 && <span className="text-slate-400 text-sm ml-auto">+{formatEuros(t.prize_2nd)}</span>}
                    </div>
                  )}
                  {t.third_club_name && (
                    <div className="flex items-center gap-2">
                      <span className="text-orange-400 text-lg">🥉</span>
                      <span className="text-white font-medium">{t.third_club_name}</span>
                      {t.prize_3rd > 0 && <span className="text-orange-400 text-sm ml-auto">+{formatEuros(t.prize_3rd)}</span>}
                    </div>
                  )}
                  {t.rewards_distributed && (
                    <div className="mt-2 pt-2 border-t border-slate-700">
                      <span className="text-emerald-400 text-xs">✅ Récompenses distribuées</span>
                    </div>
                  )}
                </div>
              )}

              {/* Groups */}
              {t.groups && t.groups.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" /> Groupes
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {t.groups.map((g, i) => (
                      <div key={i} className="bg-slate-800/60 border border-slate-700 rounded-xl p-3">
                        <p className="text-blue-300 text-xs font-bold mb-2">{g.group_name}</p>
                        {(g.club_names || []).map((name, j) => (
                          <p key={j} className="text-slate-300 text-xs py-0.5 border-b border-slate-700/50 last:border-0">• {name}</p>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Results text */}
              {t.results_text && (
                <div className="bg-slate-800/30 rounded-xl p-3">
                  <p className="text-slate-300 text-sm whitespace-pre-wrap">{t.results_text}</p>
                </div>
              )}

              {/* Tournament matches results */}
              <TournamentMatchResults tournamentId={t.id} tournamentName={t.name} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}