import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Globe, Users, Search, Plus, X, Loader2, ChevronLeft, Trophy, Swords } from 'lucide-react';
import { toast } from 'sonner';
import NationalLeagueTab from '@/components/national/NationalLeagueTab';
import NationalMatchTab from '@/components/national/NationalMatchTab';

const FLAG_MAP = {
  'France': '🇫🇷', 'Espagne': '🇪🇸', 'Argentine': '🇦🇷', 'Angleterre': '🏴',
  'Portugal': '🇵🇹', 'Norvège': '🇳🇴', 'Pays-Bas': '🇳🇱', 'Maroc': '🇲🇦',
  'Belgique': '🇧🇪', 'Allemagne': '🇩🇪', 'Croatie': '🇭🇷', 'Italie': '🇮🇹',
  'Colombie': '🇨🇴', 'Suède': '🇸🇪', 'Mexique': '🇲🇽', 'États-Unis': '🇺🇸',
  'Uruguay': '🇺🇾', 'Ghana': '🇬🇭', 'Qatar': '🇶🇦', 'Danemark': '🇩🇰',
};

const POSITION_ORDER = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];
const STAFF_ROLES = ['owner', 'admin', 'staff_mercato', 'staff_annonces', 'staff_championnat', 'staff_developpement', 'staff_formation'];
const TEAM_TABS = ['selection', 'matches'];
const TABS = ['selections', 'ligues'];

// ── Vue détaillée d'une équipe ──
function TeamDetail({ team: teamInit, user, onBack }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeTeamTab, setActiveTeamTab] = useState('selection');

  // Charger les données fraîches de l'équipe pour que les mises à jour soient reflétées
  const { data: teamFresh } = useQuery({
    queryKey: ['national-team', teamInit?.id],
    queryFn: () => base44.entities.NationalTeam.filter({ id: teamInit.id }).then(r => r[0] || teamInit),
    enabled: !!teamInit?.id,
    staleTime: 0,
  });
  const team = teamFresh || teamInit;

  const { data: eligiblePlayers = [], isLoading: loadingPlayers } = useQuery({
    queryKey: ['eligible-players', team?.nationality_key],
    queryFn: () => base44.entities.Player.filter({ nationality: team.nationality_key }),
    enabled: !!team?.nationality_key,
  });

  const isMyTeam = user && team && team.manager_id === user.id;
  const isStaff = user && STAFF_ROLES.includes(user.role);
  const canEdit = isMyTeam || isStaff;

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.NationalTeam.update(team.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['national-team', team.id] });
      queryClient.invalidateQueries({ queryKey: ['all-national-teams-list'] });
    },
  });

  const addPlayer = (player) => {
    const ids = [...(team.player_ids || [])];
    const names = [...(team.player_names || [])];
    if (ids.includes(player.id)) { toast.error('Joueur déjà sélectionné'); return; }
    if (ids.length >= 23) { toast.error('Maximum 23 joueurs par sélection'); return; }
    ids.push(player.id);
    names.push(player.name);
    updateMutation.mutate({ player_ids: ids, player_names: names });
    toast.success(`${player.name} ajouté à la sélection`);
  };

  const removePlayer = (playerId, playerName) => {
    const ids = (team.player_ids || []).filter(id => id !== playerId);
    const names = (team.player_names || []).filter(n => n !== playerName);
    updateMutation.mutate({ player_ids: ids, player_names: names });
    toast.success(`${playerName} retiré de la sélection`);
  };

  const selectedIds = team?.player_ids || [];
  const selectedPlayers = eligiblePlayers.filter(p => selectedIds.includes(p.id));
  const availablePlayers = eligiblePlayers.filter(p => !selectedIds.includes(p.id) &&
    (search === '' || p.name.toLowerCase().includes(search.toLowerCase()) || (p.club_name || '').toLowerCase().includes(search.toLowerCase()))
  ).sort((a, b) => b.overall - a.overall);

  const groupedSelected = POSITION_ORDER.reduce((acc, pos) => {
    const players = selectedPlayers.filter(p => p.position === pos);
    if (players.length) acc[pos] = players;
    return acc;
  }, {});

  return (
    <div>
      {/* Header équipe */}
      <div className="bg-gradient-to-r from-blue-600/20 to-indigo-600/10 border-b border-slate-800 mb-6 -mx-4 px-4 py-6">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-4 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Retour aux sélections
        </button>
        <div className="flex items-center gap-5">
          <span className="text-6xl">{FLAG_MAP[team.country] || team.flag || '🌍'}</span>
          <div>
            <h1 className="text-3xl font-black text-white">{team.country}</h1>
            <p className="text-slate-400 text-sm mt-1">
              {team.manager_name ? `Manager : ${team.manager_name}` : 'Aucun manager assigné'}
              {' · '}{selectedIds.length}/23 joueurs
            </p>
            <div className="flex gap-3 mt-3">
              <div className="bg-slate-800 rounded-lg px-3 py-1.5 text-center">
                <p className="text-white font-bold">{team.points ?? 0}</p>
                <p className="text-slate-500 text-xs">Pts</p>
              </div>
              <div className="bg-slate-800 rounded-lg px-3 py-1.5 text-center">
                <p className="text-white font-bold">{team.wins ?? 0}V {team.draws ?? 0}N {team.losses ?? 0}D</p>
                <p className="text-slate-500 text-xs">Bilan</p>
              </div>
              <div className="bg-slate-800 rounded-lg px-3 py-1.5 text-center">
                <p className="text-white font-bold">{team.goals_for ?? 0} - {team.goals_against ?? 0}</p>
                <p className="text-slate-500 text-xs">Buts</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Team Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-800">
        <button
          onClick={() => setActiveTeamTab('selection')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTeamTab === 'selection' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4 inline mr-1" /> Sélection
        </button>
        <button
          onClick={() => setActiveTeamTab('matches')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTeamTab === 'matches' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Swords className="w-4 h-4 inline mr-1" /> Matchs
        </button>
      </div>

      {activeTeamTab === 'selection' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           {/* Sélection actuelle */}
           <div>
          <h2 className="text-white font-bold text-base mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            Sélection ({selectedIds.length}/23)
          </h2>
          {selectedIds.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">
              <Globe className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucun joueur sélectionné</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(groupedSelected).map(([pos, players]) => (
                <div key={pos}>
                  <p className="text-slate-500 text-xs font-semibold uppercase mb-1.5">{pos}</p>
                  <div className="space-y-1.5">
                    {players.map(p => (
                      <div key={p.id} className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
                        <div className="flex items-center gap-3">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="w-8 h-8 rounded-full object-cover bg-slate-700" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs text-slate-400">{p.name[0]}</div>
                          )}
                          <div>
                            <p className="text-white text-sm font-medium">{p.name}</p>
                            <p className="text-slate-500 text-xs">{p.club_name || 'Sans club'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-slate-700 text-slate-300 text-xs">{p.overall}</Badge>
                          {canEdit && (
                            <button onClick={() => removePlayer(p.id, p.name)} className="text-slate-500 hover:text-red-400 transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>

          {/* Joueurs éligibles */}
          <div>
          <h2 className="text-white font-bold text-base mb-3 flex items-center gap-2">
            <Search className="w-4 h-4 text-emerald-400" />
            Joueurs éligibles ({eligiblePlayers.length})
          </h2>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Rechercher un joueur..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white pl-9"
            />
          </div>
          {loadingPlayers ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-slate-500 animate-spin" /></div>
          ) : availablePlayers.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              {search ? 'Aucun résultat' : 'Tous les joueurs éligibles sont déjà sélectionnés'}
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
              {availablePlayers.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 hover:border-slate-600 transition-all">
                  <div className="flex items-center gap-3">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-8 h-8 rounded-full object-cover bg-slate-700" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs text-slate-400">{p.name[0]}</div>
                    )}
                    <div>
                      <p className="text-white text-sm font-medium">{p.name}</p>
                      <p className="text-slate-500 text-xs">{p.position} · {p.club_name || 'Sans club'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-slate-700 text-slate-300 text-xs">{p.overall}</Badge>
                    {canEdit && (
                      <button onClick={() => addPlayer(p)} className="text-slate-500 hover:text-emerald-400 transition-colors">
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
          </div>
          ) : (
          <NationalMatchTab team={team} />
          )}
          </div>
          );
          }

// ── Liste de toutes les équipes ──
function TeamList({ user, onSelect }) {
  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['all-national-teams-list'],
    queryFn: () => base44.entities.NationalTeam.list(),
  });

  if (isLoading) return (
    <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
  );

  const myTeam = user ? teams.find(t => t.manager_id === user.id) : null;

  return (
    <div className="space-y-6">
      {myTeam && (
        <div>
          <h2 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" /> Ma Sélection
          </h2>
          <button onClick={() => onSelect(myTeam)} className="w-full text-left bg-blue-500/10 border border-blue-500/30 rounded-2xl p-5 hover:bg-blue-500/20 transition-all">
            <div className="flex items-center gap-4">
              <span className="text-5xl">{FLAG_MAP[myTeam.country] || myTeam.flag || '🌍'}</span>
              <div>
                <p className="text-white font-bold text-xl">{myTeam.country}</p>
                <p className="text-blue-300 text-sm">{(myTeam.player_ids || []).length}/23 joueurs · {myTeam.points ?? 0} pts</p>
              </div>
            </div>
          </button>
        </div>
      )}

      <div>
        <h2 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-400" /> Toutes les Sélections ({teams.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.sort((a, b) => (b.points ?? 0) - (a.points ?? 0)).map(team => (
            <button key={team.id} onClick={() => onSelect(team)} className="text-left bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-blue-500/50 hover:bg-slate-800 transition-all">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{FLAG_MAP[team.country] || team.flag || '🌍'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold truncate">{team.country}</p>
                  <p className="text-slate-400 text-xs truncate">{team.manager_name || 'Sans manager'}</p>
                </div>
                <span className="text-slate-400 text-xs shrink-0">{(team.player_ids || []).length}/23</span>
              </div>
              <div className="flex gap-2 text-xs">
                <span className="bg-slate-700/50 rounded px-2 py-0.5 text-slate-300">{team.points ?? 0} pts</span>
                <span className="bg-slate-700/50 rounded px-2 py-0.5 text-slate-300">{team.wins ?? 0}V {team.draws ?? 0}N {team.losses ?? 0}D</span>
              </div>
            </button>
          ))}
          {teams.length === 0 && (
            <p className="text-slate-500 col-span-3 text-center py-12">Aucune équipe nationale créée</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page principale ──
export default function NationalTeamSpace() {
  const [user, setUser] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [activeTab, setActiveTab] = useState('selections');

  // Support URL param pour rétro-compatibilité
  const urlParams = new URLSearchParams(window.location.search);
  const teamIdFromUrl = urlParams.get('team_id');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: teamFromUrl } = useQuery({
    queryKey: ['national-team-url', teamIdFromUrl],
    queryFn: () => base44.entities.NationalTeam.filter({ id: teamIdFromUrl }).then(r => r[0] || null),
    enabled: !!teamIdFromUrl,
  });

  const { data: allNationalTeams = [] } = useQuery({
    queryKey: ['all-national-teams-list'],
    queryFn: () => base44.entities.NationalTeam.list(),
  });

  const isStaff = user && STAFF_ROLES.includes(user.role);
  const activeTeam = selectedTeam || teamFromUrl || null;

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">Équipes Nationales</h1>
            <p className="text-slate-400 text-sm">Sélections internationales</p>
          </div>
        </div>

        {/* Onglets */}
        {!activeTeam && (
          <div className="flex gap-2 mb-6 border-b border-slate-800">
            <button
              onClick={() => setActiveTab('selections')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === 'selections' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white'
              }`}>
              <Users className="w-4 h-4 inline mr-1" /> Sélections
            </button>
            <button
              onClick={() => setActiveTab('ligues')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === 'ligues' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'
              }`}>
              <Trophy className="w-4 h-4 inline mr-1" /> Ligues
            </button>
          </div>
        )}

        {activeTeam ? (
          <TeamDetail
            team={activeTeam}
            user={user}
            onBack={() => {
              setSelectedTeam(null);
              if (teamIdFromUrl) window.history.replaceState({}, '', '/NationalTeamSpace');
            }}
          />
        ) : activeTab === 'ligues' ? (
          <NationalLeagueTab user={user} nationalTeams={allNationalTeams} isStaff={isStaff} />
        ) : (
          <TeamList user={user} onSelect={setSelectedTeam} />
        )}
      </div>
    </div>
  );
}