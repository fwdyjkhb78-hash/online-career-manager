import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, Plus, Calendar, Loader2, Check, X, Settings, Trash2, Pencil, UserPlus, UserMinus } from 'lucide-react';
import { toast } from 'sonner';
import LeagueFormatManager from '@/components/shared/LeagueFormatManager';

const FLAG_MAP = {
  'France': '🇫🇷', 'Espagne': '🇪🇸', 'Argentine': '🇦🇷', 'Angleterre': '🏴',
  'Portugal': '🇵🇹', 'Norvège': '🇳🇴', 'Pays-Bas': '🇳🇱', 'Maroc': '🇲🇦',
  'Belgique': '🇧🇪', 'Allemagne': '🇩🇪', 'Croatie': '🇭🇷', 'Italie': '🇮🇹',
  'Colombie': '🇨🇴', 'Suède': '🇸🇪', 'Mexique': '🇲🇽', 'États-Unis': '🇺🇸',
  'Uruguay': '🇺🇾', 'Ghana': '🇬🇭', 'Qatar': '🇶🇦', 'Danemark': '🇩🇰',
};

// ── Classement ──
function Standings({ teams, matches }) {
  const stats = {};
  teams.forEach(t => { stats[t.id] = { team: t, pts: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, played: 0 }; });
  matches.filter(m => m.status === 'confirmed').forEach(m => {
    const h = stats[m.home_club_id], a = stats[m.away_club_id];
    if (!h || !a) return;
    h.gf += m.home_score ?? 0; h.ga += m.away_score ?? 0; h.played++;
    a.gf += m.away_score ?? 0; a.ga += m.home_score ?? 0; a.played++;
    if (m.home_score > m.away_score) { h.pts += 3; h.w++; a.l++; }
    else if (m.home_score < m.away_score) { a.pts += 3; a.w++; h.l++; }
    else { h.pts++; h.d++; a.pts++; a.d++; }
  });
  const sorted = Object.values(stats).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-400 text-xs border-b border-slate-800">
            <th className="text-left py-2 px-2">#</th>
            <th className="text-left py-2 px-2">Équipe</th>
            <th className="py-2 px-2">J</th><th className="py-2 px-2">V</th>
            <th className="py-2 px-2">N</th><th className="py-2 px-2">D</th>
            <th className="py-2 px-2">Buts</th>
            <th className="py-2 px-2 font-bold text-white">Pts</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s, i) => (
            <tr key={s.team.id} className={`border-b border-slate-800/50 ${i === 0 ? 'bg-amber-500/5' : ''}`}>
              <td className="py-2 px-2 text-slate-400">{i + 1}</td>
              <td className="py-2 px-2">
                <div className="flex items-center gap-2">
                  <span>{FLAG_MAP[s.team.country] || s.team.flag || '🌍'}</span>
                  <span className="text-white font-medium">{s.team.country}</span>
                  {i === 0 && <Trophy className="w-3 h-3 text-amber-400" />}
                </div>
              </td>
              <td className="py-2 px-2 text-center text-slate-300">{s.played}</td>
              <td className="py-2 px-2 text-center text-emerald-400">{s.w}</td>
              <td className="py-2 px-2 text-center text-slate-400">{s.d}</td>
              <td className="py-2 px-2 text-center text-red-400">{s.l}</td>
              <td className="py-2 px-2 text-center text-slate-300">{s.gf}-{s.ga}</td>
              <td className="py-2 px-2 text-center font-bold text-white">{s.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Ligne match ──
function MatchRow({ match, teams, isStaff }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [hs, setHs] = useState(match.home_score ?? '');
  const [as_, setAs] = useState(match.away_score ?? '');
  const home = teams.find(t => t.id === match.home_club_id);
  const away = teams.find(t => t.id === match.away_club_id);
  const saveMutation = useMutation({
    mutationFn: () => base44.entities.Match.update(match.id, { home_score: parseInt(hs), away_score: parseInt(as_), status: 'confirmed' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['national-league-matches'] }); setEditing(false); toast.success('Résultat enregistré'); },
  });
  const isConfirmed = match.status === 'confirmed';
  return (
    <div className="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-lg gap-2">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span>{FLAG_MAP[home?.country] || '🌍'}</span>
        <span className="text-white text-sm truncate font-medium">{home?.country || '?'}</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {editing ? (
          <>
            <Input value={hs} onChange={e => setHs(e.target.value)} className="w-12 h-7 text-center bg-slate-700 border-slate-600 text-white text-sm p-1" />
            <span className="text-slate-400">-</span>
            <Input value={as_} onChange={e => setAs(e.target.value)} className="w-12 h-7 text-center bg-slate-700 border-slate-600 text-white text-sm p-1" />
            <button onClick={() => saveMutation.mutate()} className="text-emerald-400 hover:text-emerald-300">
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>
            <button onClick={() => setEditing(false)} className="text-slate-500 hover:text-red-400"><X className="w-4 h-4" /></button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            {isConfirmed
              ? <span className="text-white font-bold text-sm bg-slate-700 px-3 py-1 rounded">{match.home_score} - {match.away_score}</span>
              : <span className="text-slate-500 text-xs">vs</span>}
            {isStaff && (
              <button onClick={() => setEditing(true)} className="text-slate-500 hover:text-blue-400 text-xs underline">
                {isConfirmed ? 'Modifier' : 'Saisir'}
              </button>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
        <span className="text-white text-sm truncate font-medium">{away?.country || '?'}</span>
        <span>{FLAG_MAP[away?.country] || '🌍'}</span>
      </div>
    </div>
  );
}

// ── Vue d'une ligue ──
function LeagueView({ league, leagueTeams, isStaff, onBack, nationalTeams, onLeagueUpdated }) {
  const queryClient = useQueryClient();
  const [showFormatManager, setShowFormatManager] = useState(false);
  const [showTeamManager, setShowTeamManager] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(league.name);

  // Renommer la ligue
  const renameMutation = useMutation({
    mutationFn: () => base44.entities.Tournament.update(league.id, { name: newName.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['national-leagues'] });
      setEditingName(false);
      toast.success('Ligue renommée');
      onLeagueUpdated?.();
    },
    onError: () => toast.error('Erreur lors du renommage'),
  });

  // Supprimer la ligue
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const matches = await base44.entities.Match.filter({ tournament_id: league.id });
      await Promise.all(matches.map(m => base44.entities.Match.delete(m.id)));
      await base44.entities.Tournament.delete(league.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['national-leagues'] });
      toast.success('Ligue supprimée');
      onBack();
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  // Modifier les équipes participantes
  const updateTeamsMutation = useMutation({
    mutationFn: async (teamIds) => {
      const teams = nationalTeams.filter(t => teamIds.includes(t.id));
      await base44.entities.Tournament.update(league.id, {
        participating_club_ids: teams.map(t => t.id),
        participating_club_names: teams.map(t => t.country),
        team_count: teams.length,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['national-leagues'] });
      setShowTeamManager(false);
      toast.success('Équipes mises à jour');
      onLeagueUpdated?.();
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const [editTeamIds, setEditTeamIds] = useState(league.participating_club_ids || []);
  const toggleEditTeam = (id) => setEditTeamIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const { data: leagueMatches = [] } = useQuery({
    queryKey: ['national-league-matches', league.id],
    queryFn: () => base44.entities.Match.filter({ tournament_id: league.id, match_type: 'tournoi' }),
  });

  const matchesByRound = leagueMatches.reduce((acc, m) => {
    const j = m.journee || 1;
    if (!acc[j]) acc[j] = [];
    acc[j].push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-slate-400 hover:text-white text-sm flex items-center gap-1">← Retour aux ligues</button>

      {/* Header ligue avec actions */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          {editingName ? (
            <div className="flex items-center gap-2">
              <Input value={newName} onChange={e => setNewName(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white font-bold text-xl h-10" />
              <Button size="sm" onClick={() => renameMutation.mutate()} disabled={!newName.trim() || renameMutation.isPending} className="bg-emerald-500 hover:bg-emerald-600">
                {renameMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditingName(false); setNewName(league.name); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h3 className="text-white font-bold text-2xl">{league.name}</h3>
              {isStaff && <button onClick={() => setEditingName(true)} className="text-slate-500 hover:text-white"><Pencil className="w-4 h-4" /></button>}
            </div>
          )}
          <p className="text-slate-400 text-sm mt-1">{leagueTeams.length} équipes participantes</p>
        </div>
        {isStaff && (
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 h-8 text-xs"
              onClick={() => { setEditTeamIds(league.participating_club_ids || []); setShowTeamManager(!showTeamManager); }}>
              <UserPlus className="w-3 h-3 mr-1" /> Gérer les équipes
            </Button>
            <Button size="sm" variant="outline" className="border-red-500/40 text-red-400 hover:bg-red-500/10 h-8 text-xs"
              onClick={() => { if (confirm('Supprimer cette ligue et tous ses matchs ?')) deleteMutation.mutate(); }}
              disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3 mr-1" />}
              Supprimer la ligue
            </Button>
          </div>
        )}
      </div>

      {/* Gestion des équipes */}
      {showTeamManager && isStaff && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3">
          <p className="text-slate-300 text-sm font-semibold">Équipes participantes ({editTeamIds.length} sélectionnées)</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
            {nationalTeams.map(t => {
              const selected = editTeamIds.includes(t.id);
              return (
                <button key={t.id} onClick={() => toggleEditTeam(t.id)}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all text-sm ${selected ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'}`}>
                  <span>{FLAG_MAP[t.country] || t.flag || '🌍'}</span>
                  <span className="truncate">{t.country}</span>
                  {selected && <Check className="w-3 h-3 text-blue-400 ml-auto shrink-0" />}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => updateTeamsMutation.mutate(editTeamIds)}
              disabled={editTeamIds.length < 2 || updateTeamsMutation.isPending} className="bg-emerald-500 hover:bg-emerald-600">
              {updateTeamsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
              Enregistrer
            </Button>
            <Button size="sm" variant="ghost" className="text-slate-400" onClick={() => setShowTeamManager(false)}>Annuler</Button>
          </div>
        </div>
      )}

      {/* Classement ou Poules */}
      {league.tournament_type === 'championnat' && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader><CardTitle className="text-white text-base">Classement</CardTitle></CardHeader>
          <CardContent><Standings teams={leagueTeams} matches={leagueMatches} /></CardContent>
        </Card>
      )}

      {/* Afficher les groupes pour les tournois avec poules */}
      {league.tournament_type === 'poules_tableau' && league.groups?.length > 0 && (
        <div className="space-y-6">
          {league.groups.map((group) => {
            const groupTeams = leagueTeams.filter(t => group.club_ids?.includes(t.id));
            const groupMatches = leagueMatches.filter(m => 
              (group.club_ids?.includes(m.home_club_id) && group.club_ids?.includes(m.away_club_id))
            );
            return (
              <Card key={group.group_name} className="bg-slate-900 border-slate-800">
                <CardHeader><CardTitle className="text-white text-base">{group.group_name}</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <p className="text-slate-400 text-sm font-semibold mb-3">Classement</p>
                    <Standings teams={groupTeams} matches={groupMatches} />
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm font-semibold mb-3">Matchs</p>
                    <div className="space-y-1.5">
                      {groupMatches.map(m => <MatchRow key={m.id} match={m} teams={groupTeams} isStaff={isStaff} />)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Format ou Calendrier */}
      {showFormatManager && isStaff && leagueTeams.length >= 2 ? (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-400" /> Format de compétition
              </CardTitle>
              <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 h-7 text-xs" onClick={() => setShowFormatManager(false)}>
                <X className="w-3 h-3 mr-1" /> Masquer
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <LeagueFormatManager
              teams={leagueTeams}
              mode="national"
              tournamentId={league.id}
              tournamentName={league.name}
              queryKeyToInvalidate={[['national-league-matches', league.id]]}
              onDone={() => {
                setShowFormatManager(false);
                queryClient.invalidateQueries({ queryKey: ['national-league-matches', league.id] });
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" /> Calendrier
              </CardTitle>
              {isStaff && (
                <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 h-7 text-xs" onClick={() => setShowFormatManager(true)}>
                  <Settings className="w-3 h-3 mr-1" /> Configurer le format
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Matchs */}
            <div className="space-y-4">
              {Object.keys(matchesByRound).length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-6">Aucun match programmé — {isStaff ? 'configurez le format' : 'en attente de la génération du calendrier'}</p>
              ) : Object.entries(matchesByRound).sort((a, b) => +a[0] - +b[0]).map(([journee, matches]) => (
                <div key={journee}>
                  <p className="text-slate-400 text-xs font-semibold uppercase mb-2">Journée {journee}</p>
                  <div className="space-y-1.5">
                    {matches.map(m => <MatchRow key={m.id} match={m} teams={leagueTeams} isStaff={isStaff} />)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Composant principal ──
export default function NationalLeagueTab({ user, nationalTeams, isStaff }) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedLeagueId, setSelectedLeagueId] = useState(null);
  const [newName, setNewName] = useState('');
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);

  const { data: leagues = [], isLoading } = useQuery({
    queryKey: ['national-leagues'],
    queryFn: async () => {
      const all = await base44.entities.Tournament.list();
      return all.filter(t => t.created_by_name === 'national' && (t.tournament_type === 'championnat' || t.tournament_type === 'poules_tableau'));
    },
  });

  const selectedLeague = leagues.find(l => l.id === selectedLeagueId);
  const leagueTeams = nationalTeams.filter(t => (selectedLeague?.participating_club_ids || []).includes(t.id));

  const [createdLeague, setCreatedLeague] = useState(null); // étape 2 : format
  const [createStep, setCreateStep] = useState(1); // 1 = nom + équipes, 2 = format

  const createLeagueMutation = useMutation({
    mutationFn: async () => {
      if (!newName.trim() || selectedTeamIds.length < 2) throw new Error('invalid');
      const teams = nationalTeams.filter(t => selectedTeamIds.includes(t.id));
      return base44.entities.Tournament.create({
        name: newName.trim(),
        tournament_type: 'championnat',
        team_count: teams.length,
        participating_club_ids: teams.map(t => t.id),
        participating_club_names: teams.map(t => t.country),
        status: 'ongoing',
        created_by_name: 'national',
      });
    },
    onSuccess: (league) => {
      queryClient.invalidateQueries({ queryKey: ['national-leagues'] });
      setCreatedLeague(league);
      setCreateStep(2);
      toast.success('Ligue créée ! Configure maintenant le format.');
    },
    onError: (e) => toast.error(e.message === 'invalid' ? 'Nom et au moins 2 équipes requis' : 'Erreur création'),
  });

  const toggleTeam = (id) => setSelectedTeamIds(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );

  const handleCloseCreate = () => {
    setShowCreate(false);
    setNewName('');
    setSelectedTeamIds([]);
    setCreateStep(1);
    setCreatedLeague(null);
  };

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-xl flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" /> Ligues de Sélections
        </h2>
        {isStaff && !selectedLeagueId && (
          <Button size="sm" onClick={() => { setCreateStep(1); setCreatedLeague(null); setShowCreate(true); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-1" /> Créer une ligue
          </Button>
        )}
      </div>

      {!selectedLeagueId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {leagues.length === 0 ? (
            <p className="text-slate-500 col-span-2 text-center py-12">Aucune ligue de sélections créée</p>
          ) : leagues.map(league => (
            <div key={league.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-blue-500/30 transition-all">
              <div className="flex items-start justify-between gap-2">
                <button className="text-left flex-1" onClick={() => setSelectedLeagueId(league.id)}>
                  <p className="text-white font-bold text-lg">{league.name}</p>
                  <p className="text-slate-400 text-sm">{league.team_count} équipes</p>
                  <Badge className={`mt-2 ${league.status === 'finished' ? 'bg-slate-700 text-slate-300' : 'bg-blue-500/20 text-blue-400'}`}>
                    {league.status === 'finished' ? 'Terminée' : 'En cours'}
                  </Badge>
                </button>
                {isStaff && (
                  <button
                    onClick={async (e) => { e.stopPropagation(); if (confirm(`Supprimer "${league.name}" ?`)) { const matches = await base44.entities.Match.filter({ tournament_id: league.id }); await Promise.all(matches.map(m => base44.entities.Match.delete(m.id))); await base44.entities.Tournament.delete(league.id); queryClient.invalidateQueries({ queryKey: ['national-leagues'] }); toast.success('Ligue supprimée'); } }}
                    className="text-slate-600 hover:text-red-400 transition-colors p-1 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedLeagueId && selectedLeague && (
        <LeagueView
          league={selectedLeague}
          leagueTeams={leagueTeams}
          isStaff={isStaff}
          nationalTeams={nationalTeams}
          onBack={() => setSelectedLeagueId(null)}
          onLeagueUpdated={() => queryClient.invalidateQueries({ queryKey: ['national-leagues'] })}
        />
      )}

      {/* Dialog création */}
      <Dialog open={showCreate} onOpenChange={handleCloseCreate}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {createStep === 1 ? 'Créer une ligue de sélections' : `Format — ${createdLeague?.name}`}
              {createStep === 2 && <span className="text-xs text-emerald-400 font-normal bg-emerald-500/10 px-2 py-0.5 rounded-full">Ligue créée ✓</span>}
            </DialogTitle>
          </DialogHeader>

          {/* Étape 1 : nom + équipes */}
          {createStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-slate-300 text-sm mb-1 block">Nom de la ligue</label>
                <Input value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="Ex: Coupe des Nations Saison 1"
                  className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div>
                <label className="text-slate-300 text-sm mb-2 block">Équipes participantes ({selectedTeamIds.length} sélectionnées)</label>
                <div className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto">
                  {nationalTeams.map(t => {
                    const selected = selectedTeamIds.includes(t.id);
                    return (
                      <button key={t.id} onClick={() => toggleTeam(t.id)}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all text-sm ${
                          selected ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600'
                        }`}>
                        <span>{FLAG_MAP[t.country] || t.flag || '🌍'}</span>
                        <span className="truncate">{t.country}</span>
                        {selected && <Check className="w-3 h-3 text-blue-400 ml-auto shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Button onClick={() => createLeagueMutation.mutate()} disabled={createLeagueMutation.isPending || !newName.trim() || selectedTeamIds.length < 2}
                className="w-full bg-blue-600 hover:bg-blue-700">
                {createLeagueMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Suivant — Configurer le format →
              </Button>
            </div>
          )}

          {/* Étape 2 : format de compétition */}
          {createStep === 2 && createdLeague && (
            <div className="space-y-4">
              <LeagueFormatManager
                teams={nationalTeams.filter(t => (createdLeague.participating_club_ids || []).includes(t.id))}
                mode="national"
                tournamentId={createdLeague.id}
                tournamentName={createdLeague.name}
                queryKeyToInvalidate={[['national-leagues'], ['national-league-matches', createdLeague.id]]}
                onDone={() => {
                  handleCloseCreate();
                  setSelectedLeagueId(createdLeague.id);
                }}
              />
              <Button variant="ghost" className="w-full text-slate-400 text-sm"
                onClick={() => { handleCloseCreate(); setSelectedLeagueId(createdLeague.id); }}>
                Passer — configurer plus tard
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}