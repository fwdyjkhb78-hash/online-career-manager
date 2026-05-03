import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, Calendar, ChevronDown, ChevronUp, CheckCircle2, Clock, AlertCircle, Filter, Users, Trophy } from 'lucide-react';

const groupByJournee = (matches) => {
  const groups = {};
  for (const m of matches) {
    const j = m.journee || 0;
    if (!groups[j]) groups[j] = [];
    groups[j].push(m);
  }
  return Object.entries(groups).sort((a, b) => Number(a[0]) - Number(b[0]));
};

function ClubBadge({ name, logo, align = 'left' }) {
  return (
    <div className={`flex items-center gap-2 flex-1 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
      {logo ? (
        <img src={logo} alt={name} className="w-7 h-7 rounded-md object-cover shrink-0" />
      ) : (
        <div className="w-7 h-7 rounded-md bg-slate-700 flex items-center justify-center shrink-0">
          <span className="text-slate-400 text-[10px] font-bold">{name?.substring(0, 2).toUpperCase()}</span>
        </div>
      )}
      <span className={`text-white text-sm font-semibold truncate ${align === 'right' ? 'text-right' : 'text-left'}`}>{name}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === 'confirmed') return (
    <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
      <CheckCircle2 className="w-3 h-3" /> Confirmé
    </span>
  );
  if (status === 'home_submitted' || status === 'away_submitted') return (
    <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full shrink-0">
      <AlertCircle className="w-3 h-3" /> En attente
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full shrink-0">
      <Clock className="w-3 h-3" /> À jouer
    </span>
  );
}

function MatchRow({ m, clubMap }) {
  const homeClub = clubMap[m.home_club_id];
  const awayClub = clubMap[m.away_club_id];
  const confirmed = m.status === 'confirmed';
  const hasScore = m.home_score !== undefined && m.away_score !== undefined;

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2">
        <ClubBadge name={m.home_club_name} logo={homeClub?.logo_url} align="right" />
        <div className="w-24 text-center shrink-0">
          {confirmed && hasScore ? (
            <span className="text-white font-black text-base bg-slate-700/60 rounded-lg px-3 py-1">
              {m.home_score} - {m.away_score}
            </span>
          ) : (
            <span className="text-slate-500 text-sm font-medium bg-slate-800 rounded-lg px-3 py-1">vs</span>
          )}
        </div>
        <ClubBadge name={m.away_club_name} logo={awayClub?.logo_url} align="left" />
      </div>
      <div className="flex justify-center mt-2">
        <StatusBadge status={m.status} />
      </div>
    </div>
  );
}

// Vue groupée par poules pour un tournoi
function PoulesView({ tournamentMatches, clubMap, tournamentName, tournamentGroups }) {
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  // Construire un map groupName -> clubs depuis les données du tournoi si disponible
  const groupClubMap = useMemo(() => {
    if (!tournamentGroups || tournamentGroups.length === 0) return {};
    const m = {};
    tournamentGroups.forEach(g => { m[g.group_name] = g.club_names || []; });
    return m;
  }, [tournamentGroups]);

  // Grouper les matchs par journée pour chaque poule
  // On groupe par journée, puis on affiche tous les matchs de cette journée
  const byJournee = groupByJournee(tournamentMatches);

  // Trouver les poules distinctes (via les groupes du tournoi ou par inference)
  const groupNames = tournamentGroups?.map(g => g.group_name) || [];

  const toggleGroup = (key) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const totalConfirmed = tournamentMatches.filter(m => m.status === 'confirmed').length;

  return (
    <div className="space-y-3">
      {/* Header tournoi */}
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            <span className="text-purple-300 font-semibold text-sm">{tournamentName}</span>
          </div>
          <span className="text-slate-500 text-xs">{totalConfirmed}/{tournamentMatches.length} joués</span>
        </div>

        {/* Compositions des poules */}
        {groupNames.length > 0 && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {groupNames.map(gName => (
              <div key={gName} className="bg-slate-800/60 rounded-lg p-2">
                <p className="text-purple-400 text-xs font-bold mb-1">{gName}</p>
                {(groupClubMap[gName] || []).map(cn => (
                  <p key={cn} className="text-slate-300 text-xs py-0.5 truncate">• {cn}</p>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Journées du tournoi */}
      {byJournee.map(([journee, jMatches]) => {
        const key = `${tournamentName}_${journee}`;
        const isExpanded = expandedGroups.has(key);
        const confirmed = jMatches.filter(m => m.status === 'confirmed').length;
        const progress = jMatches.length > 0 ? (confirmed / jMatches.length) * 100 : 0;

        return (
          <div key={key} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
            <button
              onClick={() => toggleGroup(key)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg px-3 py-1 text-sm font-bold">
                  J{journee}
                </span>
                <span className="text-slate-400 text-sm">{jMatches.length} match{jMatches.length > 1 ? 's' : ''}</span>
                <div className="hidden sm:flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-purple-500 text-xs">{confirmed}/{jMatches.length}</span>
                </div>
              </div>
              {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {isExpanded && (
              <div className="border-t border-slate-700/50 divide-y divide-slate-700/30">
                {jMatches.map(m => (
                  <MatchRow key={m.id} m={m} clubMap={clubMap} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function CalendrierTab() {
  const [expandedJournees, setExpandedJournees] = useState(new Set());
  const [filterChamp, setFilterChamp] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('championnat'); // 'championnat' | 'poules'

  const { data: allMatches = [], isLoading: loadingMatches } = useQuery({
    queryKey: ['all-matches-calendar-v2'],
    queryFn: () => base44.entities.Match.list('-journee', 500),
    staleTime: 30000,
  });

  const { data: clubs = [] } = useQuery({
    queryKey: ['clubs-light'],
    queryFn: () => base44.entities.Club.list('name', 200),
    staleTime: 60000,
  });

  const { data: championships = [] } = useQuery({
    queryKey: ['championships'],
    queryFn: () => base44.entities.Championship.list('order', 50),
    staleTime: 60000,
  });

  const { data: tournaments = [] } = useQuery({
    queryKey: ['tournaments-calendar'],
    queryFn: () => base44.entities.Tournament.list('name', 100),
    staleTime: 60000,
  });

  const clubMap = useMemo(() => {
    const m = {};
    clubs.forEach(c => { m[c.id] = c; });
    return m;
  }, [clubs]);

  // Matchs de championnat (non-tournoi)
  const champMatches = useMemo(() => allMatches.filter(m => m.match_type !== 'tournoi'), [allMatches]);

  // Matchs de poules (tournoi)
  const pouleMatches = useMemo(() => allMatches.filter(m => m.match_type === 'tournoi'), [allMatches]);

  // Grouper les matchs de poules par tournoi
  const matchesByTournament = useMemo(() => {
    const map = {};
    pouleMatches.forEach(m => {
      const key = m.tournament_id || m.tournament_name || 'Tournoi';
      if (!map[key]) map[key] = { name: m.tournament_name || 'Tournoi', matches: [] };
      map[key].matches.push(m);
    });
    return Object.entries(map);
  }, [pouleMatches]);

  // Infer championship from club memberships
  const getMatchChamp = (match) => {
    const homeClub = clubMap[match.home_club_id];
    if (!homeClub) return null;
    if (homeClub.championships?.length > 0) return homeClub.championships[0];
    return homeClub.championship || null;
  };

  const filteredChampMatches = champMatches.filter(m => {
    if (filterStatus !== 'all') {
      if (filterStatus === 'confirmed' && m.status !== 'confirmed') return false;
      if (filterStatus === 'pending' && m.status === 'confirmed') return false;
    }
    if (filterChamp !== 'all') {
      const champ = getMatchChamp(m);
      if (champ !== filterChamp) return false;
    }
    return true;
  });

  const grouped = groupByJournee(filteredChampMatches);

  const toggleJournee = (j) => {
    setExpandedJournees(prev => {
      const next = new Set(prev);
      if (next.has(j)) next.delete(j); else next.add(j);
      return next;
    });
  };

  const expandAll = () => setExpandedJournees(new Set(grouped.map(([j]) => j)));
  const collapseAll = () => setExpandedJournees(new Set());

  if (loadingMatches) return (
    <div className="flex justify-center py-16">
      <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
    </div>
  );

  const totalConfirmed = filteredChampMatches.filter(m => m.status === 'confirmed').length;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-xl flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-400" />
          Calendrier
        </h2>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('championnat')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${viewMode === 'championnat' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'text-slate-400 border-slate-700 hover:text-white'}`}
        >
          <Trophy className="w-4 h-4" /> Championnat
          {champMatches.length > 0 && (
            <span className="bg-slate-700 text-slate-300 text-xs px-1.5 py-0.5 rounded-full">{champMatches.length}</span>
          )}
        </button>
        <button
          onClick={() => setViewMode('poules')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${viewMode === 'poules' ? 'bg-purple-500/20 text-purple-400 border-purple-500/40' : 'text-slate-400 border-slate-700 hover:text-white'}`}
        >
          <Users className="w-4 h-4" /> Poules / Tournois
          {pouleMatches.length > 0 && (
            <span className="bg-slate-700 text-slate-300 text-xs px-1.5 py-0.5 rounded-full">{pouleMatches.length}</span>
          )}
        </button>
      </div>

      {/* ── VUE CHAMPIONNAT ── */}
      {viewMode === 'championnat' && (
        <>
          {/* Filters */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 flex flex-wrap gap-3 items-center">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={filterChamp}
              onChange={e => setFilterChamp(e.target.value)}
              className="bg-slate-700 text-white text-xs rounded-lg px-3 py-1.5 border border-slate-600 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Tous les championnats</option>
              {championships.map(c => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-slate-700 text-white text-xs rounded-lg px-3 py-1.5 border border-slate-600 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="confirmed">Joués</option>
              <option value="pending">À jouer</option>
            </select>
            <div className="ml-auto flex gap-2 items-center">
              <span className="text-slate-500 text-xs">{totalConfirmed}/{filteredChampMatches.length} joués</span>
              <button onClick={expandAll} className="text-xs text-slate-400 hover:text-white transition-colors">Tout ouvrir</button>
              <button onClick={collapseAll} className="text-xs text-slate-400 hover:text-white transition-colors">Tout fermer</button>
            </div>
          </div>

          {grouped.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucun match de championnat trouvé.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {grouped.map(([journee, jMatches]) => {
                const isExpanded = expandedJournees.has(journee);
                const confirmed = jMatches.filter(m => m.status === 'confirmed').length;
                const progress = jMatches.length > 0 ? (confirmed / jMatches.length) * 100 : 0;

                return (
                  <div key={journee} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => toggleJournee(journee)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg px-3 py-1 text-sm font-bold">
                          J{journee}
                        </span>
                        <span className="text-slate-400 text-sm">{jMatches.length} match{jMatches.length > 1 ? 's' : ''}</span>
                        <div className="hidden sm:flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-emerald-500 text-xs">{confirmed}/{jMatches.length}</span>
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>

                    {isExpanded && (
                      <div className="border-t border-slate-700/50 divide-y divide-slate-700/30">
                        {jMatches.map(m => (
                          <MatchRow key={m.id} m={m} clubMap={clubMap} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── VUE POULES / TOURNOIS ── */}
      {viewMode === 'poules' && (
        <>
          {matchesByTournament.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucun match de poules / tournoi trouvé.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {matchesByTournament.map(([tournamentKey, { name, matches }]) => {
                // Trouver le tournoi correspondant pour avoir les groupes
                const tournament = tournaments.find(t => t.id === tournamentKey || t.name === name);
                return (
                  <PoulesView
                    key={tournamentKey}
                    tournamentMatches={matches}
                    clubMap={clubMap}
                    tournamentName={name}
                    tournamentGroups={tournament?.groups || []}
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}