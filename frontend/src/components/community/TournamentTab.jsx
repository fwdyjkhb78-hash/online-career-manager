import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Swords, Medal, Users, Clock, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

const TYPE_LABELS = {
  championnat: '🏆 Championnat',
  tableau: '⚔️ Tableau éliminatoire',
  poules: '📋 Phase de poules',
  coupe: '🥤 Coupe',
  poules_tableau: '📋⚔️ Poules + Tableau',
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

// ---- Bracket Knockout visuel ----
function BracketMatch({ match, clubs }) {
  const homeClub = clubs[match.home_club_id];
  const awayClub = clubs[match.away_club_id];
  const confirmed = match.status === 'confirmed';
  const homeWon = confirmed && match.home_score > match.away_score;
  const awayWon = confirmed && match.away_score > match.home_score;

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden w-52 shrink-0">
      {[
        { club: match.home_club_id, name: match.home_club_name, score: match.home_score, won: homeWon, logo: homeClub?.logo_url },
        { club: match.away_club_id, name: match.away_club_name, score: match.away_score, won: awayWon, logo: awayClub?.logo_url },
      ].map((side, i) => (
        <div key={i} className={`flex items-center gap-2 px-3 py-2 ${i === 0 ? 'border-b border-slate-700/50' : ''} ${side.won ? 'bg-emerald-500/10' : ''}`}>
          {side.logo ? (
            <img src={side.logo} alt={side.name} className="w-5 h-5 rounded object-cover shrink-0" />
          ) : (
            <div className="w-5 h-5 rounded bg-slate-700 flex items-center justify-center shrink-0">
              <span className="text-slate-400 text-[8px] font-bold">{side.name?.substring(0, 2).toUpperCase()}</span>
            </div>
          )}
          <span className={`text-xs flex-1 truncate font-medium ${side.won ? 'text-emerald-300' : 'text-slate-300'}`}>{side.name || '?'}</span>
          <span className={`text-sm font-black w-5 text-center shrink-0 ${side.won ? 'text-emerald-300' : confirmed ? 'text-slate-300' : 'text-slate-600'}`}>
            {confirmed ? side.score : '-'}
          </span>
        </div>
      ))}
    </div>
  );
}

function KnockoutBracket({ matches, clubs }) {
  const rounds = {};
  matches.forEach(m => {
    const r = m.journee || 1;
    if (!rounds[r]) rounds[r] = [];
    rounds[r].push(m);
  });

  const roundEntries = Object.entries(rounds).sort((a, b) => Number(a[0]) - Number(b[0]));

  const ROUND_NAMES = {
    1: 'Finale',
    2: 'Demi-finales',
    3: 'Quarts de finale',
    4: 'Huitièmes de finale',
    5: '16ème de finale',
  };

  // Count total rounds to label properly
  const totalRounds = roundEntries.length;
  const getRoundName = (roundIdx) => {
    // roundIdx 0 = first round (earliest), totalRounds-1 = final
    const fromEnd = totalRounds - 1 - roundIdx;
    return ROUND_NAMES[fromEnd + 1] || `Tour ${Number(roundEntries[roundIdx][0])}`;
  };

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-4 min-w-max">
        {roundEntries.map(([round, roundMatches], roundIdx) => (
          <div key={round} className="flex flex-col gap-2">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider text-center mb-1 px-1">
              {getRoundName(roundIdx)}
            </p>
            <div className="flex flex-col gap-3 justify-around h-full" style={{ minHeight: `${roundMatches.length * 80}px` }}>
              {roundMatches.map(m => (
                <BracketMatch key={m.id} match={m} clubs={clubs} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Classement de groupe ----
function GroupStandings({ group, matches, clubs }) {
  const clubIds = group.club_ids || [];
  const standings = clubIds.map(id => {
    const name = clubs[id]?.name || group.club_names?.[clubIds.indexOf(id)] || id;
    const logo = clubs[id]?.logo_url;
    const groupMatches = matches.filter(m =>
      m.status === 'confirmed' &&
      (m.home_club_id === id || m.away_club_id === id)
    );
    let pts = 0, w = 0, d = 0, l = 0, gf = 0, gc = 0;
    groupMatches.forEach(m => {
      const isHome = m.home_club_id === id;
      const scored = isHome ? (m.home_score || 0) : (m.away_score || 0);
      const conceded = isHome ? (m.away_score || 0) : (m.home_score || 0);
      gf += scored; gc += conceded;
      if (scored > conceded) { pts += 3; w++; }
      else if (scored === conceded) { pts += 1; d++; }
      else l++;
    });
    return { id, name, logo, pts, w, d, l, gf, gc, mj: w + d + l };
  });

  standings.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    return (b.gf - b.gc) - (a.gf - a.gc);
  });

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden">
      <div className="px-3 py-2 bg-blue-500/10 border-b border-slate-700/50">
        <span className="text-blue-300 font-bold text-sm">{group.group_name}</span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-slate-500 uppercase text-[10px] border-b border-slate-700/30">
            <th className="text-left px-3 py-1.5">#</th>
            <th className="text-left px-2 py-1.5">Club</th>
            <th className="text-center px-2 py-1.5">MJ</th>
            <th className="text-center px-2 py-1.5">V</th>
            <th className="text-center px-2 py-1.5">N</th>
            <th className="text-center px-2 py-1.5">D</th>
            <th className="text-center px-2 py-1.5">DB</th>
            <th className="text-center px-2 py-1.5 pr-3">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => (
            <tr key={s.id} className={`border-b border-slate-700/20 last:border-0 ${i === 0 ? 'bg-emerald-500/5' : ''}`}>
              <td className="px-3 py-2 text-slate-400 font-bold">{i + 1}</td>
              <td className="px-2 py-2">
                <div className="flex items-center gap-1.5">
                  {s.logo ? (
                    <img src={s.logo} alt={s.name} className="w-4 h-4 rounded object-cover" />
                  ) : (
                    <div className="w-4 h-4 rounded bg-slate-700 flex items-center justify-center">
                      <span className="text-slate-500 text-[8px]">{s.name?.substring(0, 2).toUpperCase()}</span>
                    </div>
                  )}
                  <span className="text-white font-medium truncate max-w-[80px]">{s.name}</span>
                </div>
              </td>
              <td className="text-center px-2 py-2 text-slate-300">{s.mj}</td>
              <td className="text-center px-2 py-2 text-emerald-400">{s.w}</td>
              <td className="text-center px-2 py-2 text-slate-400">{s.d}</td>
              <td className="text-center px-2 py-2 text-red-400">{s.l}</td>
              <td className="text-center px-2 py-2 text-slate-400">{s.gf - s.gc > 0 ? '+' : ''}{s.gf - s.gc}</td>
              <td className="text-center px-2 py-2 pr-3 font-black text-white">{s.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---- Tournoi card ----
function TournamentCard({ tournament, clubs }) {
  const [showMatches, setShowMatches] = useState(false);

  const { data: matches = [] } = useQuery({
    queryKey: ['tournament-matches', tournament.id],
    queryFn: () => base44.entities.Match.filter({ tournament_id: tournament.id }, 'journee'),
    staleTime: 15000,
    enabled: showMatches,
  });

  const statusInfo = STATUS_LABELS[tournament.status] || STATUS_LABELS.upcoming;
  const isKnockout = tournament.tournament_type === 'tableau' || tournament.tournament_type === 'coupe';
  const hasGroups = tournament.groups && tournament.groups.length > 0;
  const knockoutMatches = matches.filter(m => !hasGroups || (tournament.knockout_generated && m.journee > (tournament.groups?.length || 0)));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shrink-0">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg leading-tight">{tournament.name}</h3>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {tournament.tournament_type && (
                  <span className="text-slate-400 text-xs">{TYPE_LABELS[tournament.tournament_type] || tournament.tournament_type}</span>
                )}
                {tournament.team_count > 0 && (
                  <span className="text-slate-500 text-xs flex items-center gap-1">
                    <Users className="w-3 h-3" />{tournament.team_count} équipes
                  </span>
                )}
              </div>
              {tournament.created_by_name && <p className="text-slate-500 text-xs mt-0.5">Par {tournament.created_by_name}</p>}
            </div>
          </div>
          <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {tournament.description && (
          <p className="text-slate-400 text-sm">{tournament.description}</p>
        )}

        {/* Prizes */}
        {(tournament.prize_1st > 0 || tournament.prize_2nd > 0 || tournament.prize_3rd > 0) && (
          <div className="grid grid-cols-3 gap-2">
            {tournament.prize_1st > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-center">
                <Medal className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                <p className="text-yellow-400 font-bold text-sm">{formatEuros(tournament.prize_1st)}</p>
                <p className="text-slate-500 text-xs">1ère</p>
              </div>
            )}
            {tournament.prize_2nd > 0 && (
              <div className="bg-slate-500/10 border border-slate-500/20 rounded-xl p-3 text-center">
                <Medal className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                <p className="text-slate-300 font-bold text-sm">{formatEuros(tournament.prize_2nd)}</p>
                <p className="text-slate-500 text-xs">2ème</p>
              </div>
            )}
            {tournament.prize_3rd > 0 && (
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 text-center">
                <Medal className="w-4 h-4 text-orange-400 mx-auto mb-1" />
                <p className="text-orange-400 font-bold text-sm">{formatEuros(tournament.prize_3rd)}</p>
                <p className="text-slate-500 text-xs">3ème</p>
              </div>
            )}
          </div>
        )}

        {/* Winners */}
        {tournament.status === 'finished' && tournament.winner_club_name && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 font-bold text-sm">Palmarès</span>
            </div>
            <div className="space-y-1.5">
              {tournament.winner_club_name && (
                <div className="flex items-center gap-2">
                  <span className="text-lg">🥇</span>
                  <span className="text-white font-semibold">{tournament.winner_club_name}</span>
                  {tournament.prize_1st > 0 && <span className="text-yellow-400 text-xs ml-auto">+{formatEuros(tournament.prize_1st)}</span>}
                </div>
              )}
              {tournament.second_club_name && (
                <div className="flex items-center gap-2">
                  <span className="text-lg">🥈</span>
                  <span className="text-white font-semibold">{tournament.second_club_name}</span>
                  {tournament.prize_2nd > 0 && <span className="text-slate-400 text-xs ml-auto">+{formatEuros(tournament.prize_2nd)}</span>}
                </div>
              )}
              {tournament.third_club_name && (
                <div className="flex items-center gap-2">
                  <span className="text-lg">🥉</span>
                  <span className="text-white font-semibold">{tournament.third_club_name}</span>
                  {tournament.prize_3rd > 0 && <span className="text-orange-400 text-xs ml-auto">+{formatEuros(tournament.prize_3rd)}</span>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Toggle matches button */}
        <button
          onClick={() => setShowMatches(v => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-800/60 hover:bg-slate-700/50 border border-slate-700/50 rounded-xl text-sm font-medium text-slate-300 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-red-400" />
            {showMatches ? 'Masquer les matchs' : 'Voir le tableau / les matchs'}
          </span>
          {showMatches ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showMatches && (
          <div className="space-y-4">
            {/* Group Standings */}
            {hasGroups && (
              <div className="space-y-3">
                <p className="text-white font-semibold text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" /> Phase de groupes
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {tournament.groups.map((g, i) => (
                    <GroupStandings
                      key={i}
                      group={g}
                      matches={matches}
                      clubs={clubs}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Knockout Bracket */}
            {(isKnockout || tournament.knockout_generated) && knockoutMatches.length > 0 && (
              <div className="space-y-3">
                {hasGroups && (
                  <p className="text-white font-semibold text-sm flex items-center gap-2">
                    <Swords className="w-4 h-4 text-red-400" /> Phase éliminatoire
                  </p>
                )}
                <KnockoutBracket matches={knockoutMatches} clubs={clubs} />
              </div>
            )}

            {/* Simple match list fallback (non-knockout, non-group) */}
            {!isKnockout && !tournament.knockout_generated && matches.length > 0 && (
              <div className="space-y-1.5">
                {matches.map(m => (
                  <div key={m.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                    m.status === 'confirmed' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-800/50 border-slate-700'
                  }`}>
                    {clubs[m.home_club_id]?.logo_url ? (
                      <img src={clubs[m.home_club_id].logo_url} alt="" className="w-5 h-5 rounded object-cover shrink-0" />
                    ) : null}
                    <span className="flex-1 text-right text-white font-medium truncate">{m.home_club_name}</span>
                    <span className="shrink-0 px-2 font-black text-white">
                      {m.status === 'confirmed' ? `${m.home_score} - ${m.away_score}` : <Clock className="w-3 h-3 text-slate-500" />}
                    </span>
                    <span className="flex-1 text-left text-white font-medium truncate">{m.away_club_name}</span>
                    {clubs[m.away_club_id]?.logo_url ? (
                      <img src={clubs[m.away_club_id].logo_url} alt="" className="w-5 h-5 rounded object-cover shrink-0" />
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            {matches.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-4">Aucun match encore programmé</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Main export ----
export default function TournamentTab() {
  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ['tournaments-public'],
    queryFn: () => base44.entities.Tournament.list('-created_date', 50),
  });

  const { data: clubsList = [] } = useQuery({
    queryKey: ['clubs-light'],
    queryFn: () => base44.entities.Club.list('name', 200),
    staleTime: 60000,
  });

  const clubs = useMemo(() => {
    const m = {};
    clubsList.forEach(c => { m[c.id] = c; });
    return m;
  }, [clubsList]);

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
      {tournaments.map(t => (
        <TournamentCard key={t.id} tournament={t} clubs={clubs} />
      ))}
    </div>
  );
}