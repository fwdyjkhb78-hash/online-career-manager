import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Loader2, Users } from 'lucide-react';
import LeagueTable from '@/components/LeagueTable';
import ScorerStats from '@/components/league/ScorerStats';
import CommunityChat from '@/components/community/CommunityChat';

export default function League() {
  const [user, setUser] = useState(null);
  const [activeChamp, setActiveChamp] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {}
    };
    loadUser();
  }, []);

  const { data: clubs = [], isLoading: loadingClubs } = useQuery({
    queryKey: ['clubs'],
    queryFn: () => base44.entities.Club.list(),
    staleTime: 45000,
    gcTime: 300000,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { data: championships = [], isLoading: loadingChamps } = useQuery({
    queryKey: ['championships'],
    queryFn: () => base44.entities.Championship.list('order', 50),
  });

  const { data: tournaments = [] } = useQuery({
    queryKey: ['tournaments-league'],
    queryFn: () => base44.entities.Tournament.list('-created_date', 50),
    staleTime: 60000,
  });

  const { data: allMatches = [] } = useQuery({
    queryKey: ['matches-for-form'],
    queryFn: async () => {
      const m = await base44.entities.Match.list('-journee', 500);
      return m.filter(x => x.match_type !== 'tournoi' && x.status === 'confirmed');
    },
    staleTime: 60000,
  });

  const { data: tournamentMatches = [] } = useQuery({
    queryKey: ['tournament-matches'],
    queryFn: async () => {
      const m = await base44.entities.Match.list('-journee', 500);
      return m.filter(x => x.match_type === 'tournoi' && x.status === 'confirmed');
    },
    staleTime: 60000,
  });

  // Build map: club_id -> [matches]
  const matchesByClub = useMemo(() => {
    const map = {};
    allMatches.forEach(m => {
      if (!map[m.home_club_id]) map[m.home_club_id] = [];
      if (!map[m.away_club_id]) map[m.away_club_id] = [];
      map[m.home_club_id].push(m);
      map[m.away_club_id].push(m);
    });
    return map;
  }, [allMatches]);

  const isLoading = loadingClubs || loadingChamps;

  // Filtrer : n'afficher que les championnats qui ont au moins 1 club OU un tournoi lié
  const POULES_TYPES = ['poules', 'poules_tableau', 'ldc', 'chapeaux_ldc'];
  const visibleChampionships = championships.filter(champ => 
    clubs.some(c => {
      const arr = c.championships?.length > 0 ? c.championships : (c.championship ? [c.championship] : []);
      return arr.includes(champ.slug);
    }) || tournaments.some(t => t.championship_slug === champ.slug && POULES_TYPES.includes(t.tournament_type))
  );

  // Init activeChamp au premier championnat visible
  React.useEffect(() => {
    if (!activeChamp && visibleChampionships.length > 0) setActiveChamp(visibleChampionships[0].slug);
  }, [visibleChampionships, activeChamp]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  // Trouver le championnat actif
  const activeChampObj = championships.find(c => c.slug === activeChamp);

  // Trouver le tournoi lié au championnat actif via championship_slug
  const matchingTournament = tournaments.find(t =>
    t.championship_slug === activeChamp && POULES_TYPES.includes(t.tournament_type)
  );

  const hasPoulesView = matchingTournament && matchingTournament.groups?.length > 0;

  const filteredClubs = clubs.filter(c => {
    if (!activeChamp) return false;
    const arr = c.championships && c.championships.length > 0 ? c.championships : (c.championship ? [c.championship] : []);
    return arr.includes(activeChamp);
  });
  const currentChamp = activeChampObj;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mb-4">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Championnats</h1>
          <p className="text-slate-400 mt-2">Saison 2025/2026</p>
        </div>

        {/* Championship tabs — seulement les championnats avec des clubs */}
        <div className="flex gap-3 mb-8 p-1 bg-slate-800/60 rounded-xl border border-slate-700/50 flex-wrap">
          {visibleChampionships.map(champ => (
            <button
              key={champ.slug}
              onClick={() => setActiveChamp(champ.slug)}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                activeChamp === champ.slug
                  ? 'bg-amber-500 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <div className="font-bold">{champ.name}</div>
            </button>
          ))}
        </div>

        {/* Affichage poules si tournoi avec poules détecté */}
        {currentChamp && hasPoulesView ? (
          <div className="space-y-6">
            <h2 className="text-white font-bold text-xl flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              {matchingTournament.name} — Phase de poules
            </h2>
            {matchingTournament.groups.map((group, gi) => {
                  const groupClubIds = group.club_ids || [];
                  const groupClubs = clubs.filter(c => groupClubIds.includes(c.id));

              // Calculer les stats depuis les matchs du tournoi pour ce groupe
              const tMatches = tournamentMatches.filter(m =>
                m.tournament_id === matchingTournament.id &&
                groupClubIds.includes(m.home_club_id) &&
                groupClubIds.includes(m.away_club_id)
              );

              const statsMap = {};
              groupClubIds.forEach(id => {
                statsMap[id] = { points: 0, wins: 0, draws: 0, losses: 0, goals_for: 0, goals_against: 0 };
              });
              tMatches.forEach(m => {
                const h = statsMap[m.home_club_id];
                const a = statsMap[m.away_club_id];
                if (!h || !a) return;
                const hs = m.home_score ?? 0;
                const as_ = m.away_score ?? 0;
                h.goals_for += hs; h.goals_against += as_;
                a.goals_for += as_; a.goals_against += hs;
                if (hs > as_) { h.wins++; h.points += 3; a.losses++; }
                else if (hs < as_) { a.wins++; a.points += 3; h.losses++; }
                else { h.draws++; h.points++; a.draws++; a.points++; }
              });

              // Enrichir les clubs avec les stats calculées
              const enrichedClubs = groupClubs.map(c => ({
                ...c,
                ...statsMap[c.id],
              }));

              // Trier par points, puis diff buts
              enrichedClubs.sort((a, b) => {
                const pa = a.points || 0, pb = b.points || 0;
                if (pb !== pa) return pb - pa;
                return (b.goals_for - b.goals_against) - (a.goals_for - a.goals_against);
              });

              const groupMatchesByClub = {};
              groupClubIds.forEach(id => {
                groupMatchesByClub[id] = tMatches.filter(m => m.home_club_id === id || m.away_club_id === id);
              });

              return (
                <div key={gi} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-700 bg-slate-800/80">
                    <h3 className="text-white font-semibold">{group.group_name || `Groupe ${gi + 1}`}</h3>
                  </div>
                  <LeagueTable
                    clubs={enrichedClubs}
                    currentClubId={user?.club_id}
                    title=""
                    matchesByClub={groupMatchesByClub}
                    compact
                  />
                </div>
              );
            })}
          </div>
        ) : currentChamp ? (
          <LeagueTable
            clubs={filteredClubs}
            currentClubId={user?.club_id}
            title={currentChamp.name}
            matchesByClub={matchesByClub}
          />
        ) : null}

        <ScorerStats />

        <div className="mt-10">
          <CommunityChat currentUser={user} />
        </div>

        <div className="mt-8 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-500/20 border-l-4 border-amber-500" />
            <span className="text-slate-400">Champion</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-emerald-500/10 border-l-4 border-emerald-500" />
            <span className="text-slate-400">Qualifié</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500/10 border-l-4 border-red-500" />
            <span className="text-slate-400">Relégation</span>
          </div>
        </div>
      </div>
    </div>
  );
}