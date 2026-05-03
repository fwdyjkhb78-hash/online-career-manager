import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronRight, Trophy, CheckCircle2, AlertCircle, Swords, BarChart2 } from 'lucide-react';
import { toast } from 'sonner';

function getRoundLabel(n) {
  if (n === 2) return 'Finale';
  if (n === 4) return 'Demi-finales';
  if (n === 8) return 'Quarts de finale';
  if (n === 16) return 'Huitièmes de finale';
  return `Tour (${n} équipes)`;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function computeStandings(teams, matches) {
  const stats = {};
  teams.forEach(t => {
    stats[t.id] = { id: t.id, name: t.name, pts: 0, j: 0, g: 0, d: 0, p: 0, gf: 0, ga: 0 };
  });
  matches.forEach(m => {
    if (m.status !== 'confirmed') return;
    if (!stats[m.home_club_id] || !stats[m.away_club_id]) return;
    const hs = m.home_score ?? 0;
    const as_ = m.away_score ?? 0;
    stats[m.home_club_id].j++;
    stats[m.away_club_id].j++;
    stats[m.home_club_id].gf += hs;
    stats[m.home_club_id].ga += as_;
    stats[m.away_club_id].gf += as_;
    stats[m.away_club_id].ga += hs;
    if (hs > as_) {
      stats[m.home_club_id].pts += 3;
      stats[m.home_club_id].g++;
      stats[m.away_club_id].p++;
    } else if (as_ > hs) {
      stats[m.away_club_id].pts += 3;
      stats[m.away_club_id].g++;
      stats[m.home_club_id].p++;
    } else {
      stats[m.home_club_id].pts += 1;
      stats[m.away_club_id].pts += 1;
      stats[m.home_club_id].d++;
      stats[m.away_club_id].d++;
    }
  });
  return Object.values(stats).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
}

export default function TournamentKoGenerator({ tournament }) {
  const queryClient = useQueryClient();
  const [koCount, setKoCount] = useState(8);
  const [seeding, setSeeding] = useState('ranked'); // 'ranked' | 'random'

  // Fetch all matches of this tournament
  const { data: allMatches = [], isLoading } = useQuery({
    queryKey: ['tournament-matches', tournament.id],
    queryFn: () => base44.entities.Match.filter({ tournament_id: tournament.id }),
  });

  // Only league phase matches (not KO = not journee > max league journée)
  // We consider league phase = all matches (since KO hasn't been generated yet)
  const leagueMatches = allMatches.filter(m => {
    // Si la phase KO a été générée, on filtre la phase de ligue par journée
    if (tournament.league_journee_count) {
      return m.journee <= tournament.league_journee_count;
    }
    return true;
  });

  const confirmedCount = leagueMatches.filter(m => m.status === 'confirmed').length;
  const totalCount = leagueMatches.length;
  const allDone = totalCount > 0 && confirmedCount === totalCount;

  // Participants (from tournament)
  const teams = (tournament.participating_club_ids || []).map((id, i) => ({
    id,
    name: (tournament.participating_club_names || [])[i] || id,
  }));

  const standings = computeStandings(teams, leagueMatches);

  const generateKoMutation = useMutation({
    mutationFn: async () => {
      const maxLeagueJournee = Math.max(...leagueMatches.map(m => m.journee), 0);
      const startJournee = maxLeagueJournee + 1;

      let qualified = standings.slice(0, koCount);
      if (seeding === 'random') qualified = shuffle(qualified);

      // Générer le bracket KO
      let list = [...qualified];
      let journee = startJournee;

      while (list.length > 1) {
        const matches = [];
        for (let i = 0; i < list.length; i += 2) {
          if (i + 1 < list.length) {
            matches.push({ home: list[i], away: list[i + 1], journee });
          }
        }
        await base44.entities.Match.bulkCreate(matches.map(m => ({
          journee: m.journee,
          match_type: 'tournoi',
          tournament_id: tournament.id,
          tournament_name: tournament.name,
          home_club_id: m.home.id,
          home_club_name: m.home.name,
          away_club_id: m.away.id,
          away_club_name: m.away.name,
          status: 'pending',
        })));

        // Simuler les vainqueurs avec des placeholders pour le prochain tour
        const next = [];
        for (let i = 0; i < list.length; i += 2) {
          if (i + 1 < list.length) {
            next.push({ id: `W_${list[i].id}_${list[i+1].id}`, name: `Vainqueur (${list[i].name} vs ${list[i+1].name})` });
          } else {
            next.push(list[i]); // bye
          }
        }
        list = next;
        journee++;
      }

      // Sauvegarder la config KO sur le tournoi
      await base44.entities.Tournament.update(tournament.id, {
        knockout_generated: true,
        league_journee_count: maxLeagueJournee,
      });

      return koCount;
    },
    onSuccess: (count) => {
      toast.success(`Phase éliminatoire générée ! Top ${count} qualifiés.`);
      queryClient.invalidateQueries({ queryKey: ['tournament-matches', tournament.id] });
      queryClient.invalidateQueries({ queryKey: ['tournaments-staff'] });
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Chargement des matchs…</div>;
  }

  return (
    <div className="space-y-4">
      {/* Progression */}
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-slate-700 rounded-full h-2">
          <div
            className="bg-emerald-500 h-2 rounded-full transition-all"
            style={{ width: totalCount > 0 ? `${(confirmedCount / totalCount) * 100}%` : '0%' }}
          />
        </div>
        <span className="text-slate-300 text-sm font-medium shrink-0">
          {confirmedCount}/{totalCount} matchs terminés
        </span>
        {allDone
          ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          : <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
        }
      </div>

      {/* Classement */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-700">
          <BarChart2 className="w-4 h-4 text-amber-400" />
          <p className="text-amber-300 text-sm font-semibold">Classement phase de ligue</p>
        </div>
        <div className="divide-y divide-slate-700/50">
          {standings.map((team, idx) => {
            const isQualified = idx < koCount;
            return (
              <div key={team.id} className={`flex items-center gap-3 px-4 py-2 text-sm ${isQualified ? 'bg-emerald-500/5' : ''}`}>
                <span className={`w-6 text-center font-bold shrink-0 ${idx < koCount ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {idx + 1}
                </span>
                <span className={`flex-1 truncate ${idx < koCount ? 'text-white' : 'text-slate-400'}`}>{team.name}</span>
                <div className="flex items-center gap-3 text-xs text-slate-400 shrink-0">
                  <span className="hidden sm:inline">{team.j}J</span>
                  <span className="text-green-400">{team.g}V</span>
                  <span className="text-yellow-400">{team.d}N</span>
                  <span className="text-red-400">{team.p}D</span>
                  <span className="hidden sm:inline">{team.gf}-{team.ga}</span>
                  <span className="font-bold text-white w-8 text-right">{team.pts}pts</span>
                </div>
                {isQualified && <span className="text-emerald-400 text-xs font-bold shrink-0">✓ Q</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Matchs par journée */}
      <details className="group">
        <summary className="cursor-pointer text-slate-400 text-sm flex items-center gap-2 py-1 select-none">
          <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
          Voir tous les matchs ({totalCount})
        </summary>
        <div className="mt-2 space-y-2 max-h-64 overflow-y-auto pr-1">
          {Array.from(new Set(leagueMatches.map(m => m.journee))).sort((a, b) => a - b).map(j => {
            const jMatches = leagueMatches.filter(m => m.journee === j);
            return (
              <div key={j} className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-3">
                <p className="text-slate-400 text-xs font-bold mb-2">Journée {j}</p>
                {jMatches.map(m => (
                  <div key={m.id} className="flex items-center gap-2 text-xs py-0.5">
                    <span className={`flex-1 text-right truncate ${m.status === 'confirmed' ? 'text-slate-300' : 'text-slate-500'}`}>{m.home_club_name}</span>
                    <span className={`shrink-0 font-mono px-1.5 py-0.5 rounded text-xs ${
                      m.status === 'confirmed'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-700 text-slate-500'
                    }`}>
                      {m.status === 'confirmed' ? `${m.home_score ?? 0}-${m.away_score ?? 0}` : 'vs'}
                    </span>
                    <span className={`flex-1 truncate ${m.status === 'confirmed' ? 'text-slate-300' : 'text-slate-500'}`}>{m.away_club_name}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </details>

      {/* Génération KO */}
      {!tournament.knockout_generated && (
        <div className="border border-amber-500/30 rounded-xl p-4 bg-amber-500/5 space-y-3">
          <p className="text-amber-300 font-semibold text-sm flex items-center gap-2">
            <Swords className="w-4 h-4" /> Générer la phase éliminatoire
          </p>

          {!allDone && (
            <div className="flex items-center gap-2 text-amber-400 text-xs bg-amber-500/10 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Il reste <strong>{totalCount - confirmedCount}</strong> match{totalCount - confirmedCount > 1 ? 's' : ''} à confirmer. Vous pouvez quand même générer en avance.</span>
            </div>
          )}

          <div className="flex flex-wrap gap-3 items-center">
            <div>
              <p className="text-slate-400 text-xs mb-1">Qualifiés</p>
              <div className="flex gap-2 flex-wrap">
                {[4, 8, 16].filter(n => n <= teams.length).map(n => (
                  <button
                    key={n}
                    onClick={() => setKoCount(n)}
                    className={`px-3 py-1 rounded-lg border text-sm transition-colors ${
                      koCount === n
                        ? 'bg-amber-500/20 border-amber-500/60 text-amber-400'
                        : 'border-slate-600 text-slate-400'
                    }`}
                  >
                    Top {n} → {getRoundLabel(n)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">Tirage</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setSeeding('ranked')}
                  className={`px-3 py-1 rounded-lg border text-sm transition-colors ${seeding === 'ranked' ? 'bg-amber-500/20 border-amber-500/60 text-amber-400' : 'border-slate-600 text-slate-400'}`}
                >
                  Par classement
                </button>
                <button
                  onClick={() => setSeeding('random')}
                  className={`px-3 py-1 rounded-lg border text-sm transition-colors ${seeding === 'random' ? 'bg-amber-500/20 border-amber-500/60 text-amber-400' : 'border-slate-600 text-slate-400'}`}
                >
                  Aléatoire
                </button>
              </div>
            </div>
          </div>

          <p className="text-slate-400 text-xs">
            Les <strong className="text-white">{koCount}</strong> premiers du classement seront qualifiés.
            {seeding === 'ranked' ? ' Le 1er affronte le dernier qualifié, etc.' : ' Les matchs seront tirés au sort.'}
          </p>

          <Button
            onClick={() => generateKoMutation.mutate()}
            disabled={generateKoMutation.isPending}
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
          >
            {generateKoMutation.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Génération…</>
              : <><Swords className="w-4 h-4 mr-2" /> Générer les éliminatoires</>
            }
          </Button>
        </div>
      )}

      {tournament.knockout_generated && (
        <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/10 rounded-xl px-4 py-3 border border-emerald-500/20">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          Phase éliminatoire déjà générée.
        </div>
      )}
    </div>
  );
}