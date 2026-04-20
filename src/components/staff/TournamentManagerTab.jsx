import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trophy, Plus, ChevronDown, ChevronUp, Trash2, Gift, Users, Layers } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';

const STATUS_LABELS = {
  upcoming: { label: 'À venir', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  ongoing: { label: 'En cours', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  finished: { label: 'Terminé', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
};

const TYPE_LABELS = {
  championnat: { label: 'Championnat', icon: '🏆', color: 'text-yellow-400' },
  tableau: { label: 'Tableau éliminatoire', icon: '⚔️', color: 'text-red-400' },
  poules: { label: 'Phase de poules', icon: '📋', color: 'text-blue-400' },
  coupe: { label: 'Coupe', icon: '🥤', color: 'text-purple-400' },
  poules_tableau: { label: 'Poules + Tableau', icon: '🔀', color: 'text-cyan-400' },
};

function formatEuros(amount) {
  if (!amount) return '0 €';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

const GROUP_NAMES = ['Groupe A','Groupe B','Groupe C','Groupe D','Groupe E','Groupe F','Groupe G','Groupe H'];

const EMPTY_FORM = {
  name: '', description: '', status: 'upcoming',
  tournament_type: 'tableau', team_count: '8',
  participating_club_ids: [],
  group_count: 2,
  groups: [],
};

export default function TournamentManagerTab({ currentUser }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editResults, setEditResults] = useState({});

  const { data: tournaments = [] } = useQuery({
    queryKey: ['tournaments-staff'],
    queryFn: () => base44.entities.Tournament.list('-created_date', 100),
  });

  const { data: clubs = [] } = useQuery({
    queryKey: ['clubs-all'],
    queryFn: () => base44.entities.Club.list('name', 100),
  });

  const generateTableauMatches = async (tournament, clubIds, clubNames, startRound = 1) => {
    // Handle odd number: last team gets bye (auto-win)
    const toProcess = [...clubIds.map((id, i) => ({ id, name: clubNames[i] }))];
    const byes = [];
    if (toProcess.length % 2 !== 0) {
      byes.push(toProcess.pop()); // last team gets bye
    }
    for (let i = 0; i + 1 < toProcess.length; i += 2) {
      await base44.entities.Match.create({
        journee: startRound, match_type: 'tournoi',
        tournament_id: tournament.id, tournament_name: tournament.name,
        home_club_id: toProcess[i].id, home_club_name: toProcess[i].name,
        away_club_id: toProcess[i + 1].id, away_club_name: toProcess[i + 1].name,
        status: 'pending',
      });
    }
    // Auto-qualify bye teams (confirmed with 1-0)
    for (const bye of byes) {
      await base44.entities.Match.create({
        journee: startRound, match_type: 'tournoi',
        tournament_id: tournament.id, tournament_name: tournament.name,
        home_club_id: bye.id, home_club_name: bye.name,
        away_club_id: 'bye', away_club_name: 'BYE (exempt)',
        status: 'confirmed', home_score: 1, away_score: 0,
      });
    }
  };

  const generateMatches = async (tournament) => {
    const clubIds = tournament.participating_club_ids || [];
    const clubNames = tournament.participating_club_names || [];

    if (tournament.tournament_type === 'poules' || tournament.tournament_type === 'poules_tableau') {
      // Generate group phase (round-robin per group)
      for (const group of (tournament.groups || [])) {
        const gIds = group.club_ids || [];
        const gNames = group.club_names || [];
        for (let i = 0; i < gIds.length; i++) {
          for (let j = i + 1; j < gIds.length; j++) {
            await base44.entities.Match.create({
              journee: 1, match_type: 'tournoi',
              tournament_id: tournament.id, tournament_name: tournament.name,
              home_club_id: gIds[i], home_club_name: gNames[i],
              away_club_id: gIds[j], away_club_name: gNames[j],
              status: 'pending',
            });
          }
        }
      }
      // For poules_tableau, knockout matches will be generated later by staff
    } else if (tournament.tournament_type === 'championnat') {
      for (let i = 0; i < clubIds.length; i++) {
        for (let j = i + 1; j < clubIds.length; j++) {
          await base44.entities.Match.create({
            journee: 1, match_type: 'tournoi',
            tournament_id: tournament.id, tournament_name: tournament.name,
            home_club_id: clubIds[i], home_club_name: clubNames[i],
            away_club_id: clubIds[j], away_club_name: clubNames[j],
            status: 'pending',
          });
        }
      }
    } else {
      // tableau / coupe — handle odd teams
      await generateTableauMatches(tournament, clubIds, clubNames, 1);
    }
  };

  const generateKnockoutFromGroups = async (tournament, qualifiersPerGroup) => {
    const groups = tournament.groups || [];
    const qualified = [];
    // Get top N from each group based on match results
    for (const group of groups) {
      const gIds = group.club_ids || [];
      const gNames = group.club_names || [];
      const groupMatches = await base44.entities.Match.filter({
        tournament_id: tournament.id, journee: 1,
      });
      const stats = {};
      gIds.forEach((id, i) => { stats[id] = { id, name: gNames[i], pts: 0, gd: 0 }; });
      groupMatches.forEach(m => {
        if (!stats[m.home_club_id] || !stats[m.away_club_id] || m.status !== 'confirmed') return;
        const hs = m.home_score || 0, as_ = m.away_score || 0;
        if (hs > as_) { stats[m.home_club_id].pts += 3; }
        else if (as_ > hs) { stats[m.away_club_id].pts += 3; }
        else { stats[m.home_club_id].pts += 1; stats[m.away_club_id].pts += 1; }
        stats[m.home_club_id].gd += (hs - as_);
        stats[m.away_club_id].gd += (as_ - hs);
      });
      const sorted = Object.values(stats).sort((a, b) => b.pts - a.pts || b.gd - a.gd);
      sorted.slice(0, qualifiersPerGroup).forEach(c => qualified.push(c));
    }
    const ids = qualified.map(c => c.id);
    const names = qualified.map(c => c.name);
    const round = 2;
    await generateTableauMatches(tournament, ids, names, round);
    await base44.entities.Tournament.update(tournament.id, { knockout_generated: true });
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Tournament.create(data),
    onSuccess: async (created) => {
      await generateMatches(created);
      queryClient.invalidateQueries({ queryKey: ['tournaments-staff'] });
      queryClient.invalidateQueries({ queryKey: ['tournaments-public'] });
      setForm(EMPTY_FORM);
      setShowForm(false);
      toast.success('Tournoi créé et matchs générés ! 🏆');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Tournament.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments-staff'] });
      queryClient.invalidateQueries({ queryKey: ['tournaments-public'] });
      toast.success('Mis à jour !');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Tournament.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments-staff'] });
      queryClient.invalidateQueries({ queryKey: ['tournaments-public'] });
      toast.success('Tournoi supprimé');
    },
  });

  const toggleClub = (clubId) => {
    setForm(p => {
      const ids = p.participating_club_ids || [];
      return { ...p, participating_club_ids: ids.includes(clubId) ? ids.filter(id => id !== clubId) : [...ids, clubId] };
    });
  };

  const buildGroups = (clubIds, groupCount) => {
    const gc = Number(groupCount) || 2;
    const groups = Array.from({ length: gc }, (_, i) => ({
      group_name: GROUP_NAMES[i] || `Groupe ${i + 1}`,
      club_ids: [],
      club_names: [],
    }));
    clubIds.forEach((id, idx) => {
      const g = idx % gc;
      const club = clubs.find(c => c.id === id);
      if (club) { groups[g].club_ids.push(id); groups[g].club_names.push(club.name); }
    });
    return groups;
  };

  const handleCreate = () => {
    if (!form.name.trim()) return toast.error('Nom requis');
    const selectedClubs = clubs.filter(c => (form.participating_club_ids || []).includes(c.id));
    const isPoules = form.tournament_type === 'poules' || form.tournament_type === 'poules_tableau';
    createMutation.mutate({
      ...form,
      team_count: form.participating_club_ids?.length || Number(form.team_count) || 8,
      participating_club_names: selectedClubs.map(c => c.name),
      group_count: isPoules ? Number(form.group_count) || 2 : undefined,
      groups: isPoules ? buildGroups(form.participating_club_ids || [], form.group_count) : [],
      prize_1st: 0, prize_2nd: 0, prize_3rd: 0,
      created_by_name: currentUser?.full_name,
    });
  };

  const handleDistributeRewards = async (tournament) => {
    const ed = editResults[tournament.id] || {};
    const merged = { ...tournament, ...ed };
    const updates = [];

    const addPrize = (clubId, prize) => {
      const club = clubs.find(c => c.id === clubId);
      if (club && prize > 0) updates.push(base44.entities.Club.update(club.id, { budget: (club.budget || 0) + prize }));
    };

    addPrize(merged.winner_club_id, merged.prize_1st);
    addPrize(merged.second_club_id, merged.prize_2nd);
    addPrize(merged.third_club_id, merged.prize_3rd);

    await Promise.all(updates);
    await base44.entities.Tournament.update(tournament.id, {
      rewards_distributed: true,
      winner_club_id: merged.winner_club_id,
      winner_club_name: merged.winner_club_name,
      second_club_id: merged.second_club_id,
      second_club_name: merged.second_club_name,
      third_club_id: merged.third_club_id,
      third_club_name: merged.third_club_name,
      prize_1st: merged.prize_1st,
      prize_2nd: merged.prize_2nd,
      prize_3rd: merged.prize_3rd,
      results_text: merged.results_text,
    });
    queryClient.invalidateQueries({ queryKey: ['tournaments-staff'] });
    queryClient.invalidateQueries({ queryKey: ['tournaments-public'] });
    toast.success('Récompenses distribuées ! 🏆');
  };

  const handleSaveResults = (tournament) => {
    const data = editResults[tournament.id] || {};
    if (!Object.keys(data).length) return;
    updateMutation.mutate({ id: tournament.id, data });
  };

  const setEditField = (id, field, value) => {
    setEditResults(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: value } }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-white font-bold text-lg flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" /> Gestion des Tournois
        </h2>
        <Button onClick={() => setShowForm(!showForm)} className="bg-emerald-500 hover:bg-emerald-600" size="sm">
          <Plus className="w-4 h-4 mr-1" /> Nouveau tournoi
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader><CardTitle className="text-white text-base">Créer un tournoi</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Nom du tournoi *"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="bg-slate-700 border-slate-600 text-white"
            />
            <Textarea
              placeholder="Description (optionnel)"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="bg-slate-700 border-slate-600 text-white min-h-[70px]"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Format du tournoi</label>
                <Select value={form.tournament_type} onValueChange={v => setForm(p => ({ ...p, tournament_type: v }))}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                   <SelectItem value="championnat">🏆 Championnat (round-robin)</SelectItem>
                   <SelectItem value="tableau">⚔️ Tableau éliminatoire</SelectItem>
                   <SelectItem value="poules">📋 Phase de poules uniquement</SelectItem>
                   <SelectItem value="coupe">🥤 Coupe</SelectItem>
                   <SelectItem value="poules_tableau">🔀 Poules + Tableau éliminatoire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Nombre d'équipes</label>
                <Input type="number" min="2" placeholder="8" value={form.participating_club_ids?.length || form.team_count} disabled className="bg-slate-700 border-slate-600 text-white opacity-60" />
              </div>
              {(form.tournament_type === 'poules' || form.tournament_type === 'poules_tableau') && (
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-slate-400 text-xs mb-1 block">Nombre de groupes</label>
                  <Select value={String(form.group_count || 2)} onValueChange={v => setForm(p => ({ ...p, group_count: Number(v) }))}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                      {[2,3,4,5,6,7,8].map(n => <SelectItem key={n} value={String(n)}>{n} groupes</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Club selection */}
            <div>
              <label className="text-slate-400 text-xs mb-2 block">Clubs participants ({(form.participating_club_ids || []).length} sélectionnés)</label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {clubs.map(club => {
                  const selected = (form.participating_club_ids || []).includes(club.id);
                  return (
                    <button
                      key={club.id}
                      type="button"
                      onClick={() => toggleClub(club.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors text-left ${
                        selected
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                          : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full border-2 shrink-0 ${selected ? 'bg-emerald-400 border-emerald-400' : 'border-slate-500'}`} />
                      {club.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {(form.tournament_type === 'poules' || form.tournament_type === 'poules_tableau') && (form.participating_club_ids || []).length > 0 && (
              <div className="border border-blue-500/30 rounded-xl p-3 bg-blue-500/5">
                <p className="text-blue-300 text-xs font-semibold mb-2">📋 Aperçu des groupes ({form.group_count || 2} groupes)</p>
                <div className="grid grid-cols-2 gap-2">
                  {buildGroups(form.participating_club_ids, form.group_count).map((g, i) => (
                    <div key={i} className="bg-slate-800 rounded-lg p-2">
                      <p className="text-blue-300 text-xs font-bold mb-1">{g.group_name}</p>
                      {g.club_names.length === 0 ? (
                        <p className="text-slate-600 text-xs italic">Vide</p>
                      ) : g.club_names.map((n, j) => (
                        <p key={j} className="text-slate-300 text-xs">• {n}</p>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="text-slate-500 text-xs">💡 Les récompenses seront définies une fois le tournoi terminé.</p>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setShowForm(false)} className="text-slate-400">Annuler</Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending} className="bg-emerald-500 hover:bg-emerald-600">
                Créer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tournaments list */}
      {tournaments.length === 0 ? (
        <div className="text-center py-12">
          <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Aucun tournoi créé</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tournaments.map(t => {
            const statusInfo = STATUS_LABELS[t.status] || STATUS_LABELS.upcoming;
            const typeInfo = TYPE_LABELS[t.tournament_type] || TYPE_LABELS.tableau;
            const isExpanded = expandedId === t.id;
            const ed = editResults[t.id] || {};

            return (
              <Card key={t.id} className="bg-slate-900 border-slate-800">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Trophy className="w-5 h-5 text-yellow-400 shrink-0" />
                      <div>
                        <CardTitle className="text-white text-base">{t.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs ${typeInfo.color}`}>{typeInfo.icon} {typeInfo.label}</span>
                          {t.team_count && (
                                   <span className="text-slate-500 text-xs flex items-center gap-1">
                              <Users className="w-3 h-3" />{t.participating_club_ids?.length || t.team_count} équipes
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-400 w-8 h-8"
                        onClick={() => deleteMutation.mutate(t.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-slate-400 w-8 h-8"
                        onClick={() => setExpandedId(isExpanded ? null : t.id)}>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="space-y-5 pt-0">
                    {/* Groups editor for poules */}
                    {(t.tournament_type === 'poules' || t.tournament_type === 'poules_tableau') && (
                      <div className="border border-blue-500/30 rounded-xl p-4 bg-blue-500/5 space-y-3">
                        <h4 className="text-blue-300 font-semibold text-sm flex items-center gap-2">
                          <Layers className="w-4 h-4" /> Groupes
                        </h4>
                        <div className="flex items-center gap-3">
                          <label className="text-slate-400 text-xs">Nombre de groupes</label>
                          <Select
                            value={String(ed.group_count ?? t.group_count ?? 2)}
                            onValueChange={v => setEditField(t.id, 'group_count', Number(v))}
                          >
                            <SelectTrigger className="bg-slate-800 border-slate-700 text-white w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700 text-white">
                              {[2,3,4,5,6,7,8].map(n => <SelectItem key={n} value={String(n)}>{n} groupes</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            className="bg-blue-500 hover:bg-blue-600 text-white"
                            onClick={() => {
                              const gc = Number(ed.group_count ?? t.group_count ?? 2);
                              const ids = t.participating_club_ids || [];
                              const newGroups = buildGroups(ids, gc);
                              updateMutation.mutate({ id: t.id, data: { group_count: gc, groups: newGroups } });
                            }}
                          >
                            Générer les groupes
                          </Button>
                        </div>
                        {(t.groups && t.groups.length > 0) && (
                          <div className="grid grid-cols-2 gap-2">
                            {t.groups.map((g, i) => (
                              <div key={i} className="bg-slate-800 rounded-lg p-2">
                                <p className="text-blue-300 text-xs font-bold mb-1">{g.group_name}</p>
                                {(g.club_names || []).map((n, j) => (
                                  <p key={j} className="text-slate-300 text-xs">• {n}</p>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                        {(!t.groups || t.groups.length === 0) && (
                          <p className="text-slate-500 text-xs italic">Aucun groupe défini. Cliquez sur "Générer les groupes" pour créer la répartition automatique.</p>
                        )}
                        {t.tournament_type === 'poules_tableau' && (
                          <div className="border-t border-blue-500/20 pt-3">
                            <p className="text-blue-200 text-xs font-semibold mb-2">🔀 Phase éliminatoire</p>
                            {t.knockout_generated ? (
                              <span className="text-emerald-400 text-xs">✅ Matchs éliminatoires générés</span>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-slate-400 text-xs">Quand la phase de poules est terminée, générez les matchs éliminatoires :</p>
                                <div className="flex items-center gap-2">
                                  <select
                                    value={ed.qualifiersPerGroup || 2}
                                    onChange={e => setEditField(t.id, 'qualifiersPerGroup', Number(e.target.value))}
                                    className="bg-slate-800 border border-slate-700 text-white text-xs rounded px-2 py-1"
                                  >
                                    {[1,2,3,4].map(n => <option key={n} value={n}>{n} qualifié{n>1?'s':''}/groupe</option>)}
                                  </select>
                                  <Button
                                    size="sm"
                                    className="bg-red-500 hover:bg-red-600 text-white text-xs"
                                    onClick={async () => {
                                      await generateKnockoutFromGroups(t, ed.qualifiersPerGroup || 2);
                                      queryClient.invalidateQueries({ queryKey: ['tournaments-staff'] });
                                      toast.success('Phase éliminatoire générée !');
                                    }}
                                  >
                                    ⚔️ Générer les éliminatoires
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Status */}
                    <div>
                      <label className="text-slate-400 text-xs mb-1 block">Statut</label>
                      <Select value={ed.status || t.status} onValueChange={v => {
                        setEditField(t.id, 'status', v);
                        updateMutation.mutate({ id: t.id, data: { status: v } });
                      }}>
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700 text-white">
                          <SelectItem value="upcoming">À venir</SelectItem>
                          <SelectItem value="ongoing">En cours</SelectItem>
                          <SelectItem value="finished">Terminé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Results text */}
                    <div>
                      <label className="text-slate-400 text-xs mb-1 block">Résultats / Description</label>
                      <Textarea
                        placeholder="Décrivez les résultats, le déroulement..."
                        value={ed.results_text !== undefined ? ed.results_text : (t.results_text || '')}
                        onChange={e => setEditField(t.id, 'results_text', e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white min-h-[80px]"
                      />
                    </div>

                    {/* Prizes & winners — only at end */}
                    <div className="border border-slate-700 rounded-xl p-4 space-y-4">
                      <h4 className="text-white font-medium text-sm flex items-center gap-2">
                        <Gift className="w-4 h-4 text-yellow-400" /> Clôture & Récompenses
                      </h4>

                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: '🥇 1ère place', prizeField: 'prize_1st' },
                          { label: '🥈 2ème place', prizeField: 'prize_2nd' },
                          { label: '🥉 3ème place', prizeField: 'prize_3rd' },
                        ].map(({ label, prizeField }) => (
                          <div key={prizeField}>
                            <label className="text-slate-400 text-xs mb-1 block">{label} (€)</label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={ed[prizeField] !== undefined ? ed[prizeField] : (t[prizeField] || '')}
                              onChange={e => setEditField(t.id, prizeField, Number(e.target.value) || 0)}
                              className="bg-slate-800 border-slate-700 text-white"
                              disabled={t.rewards_distributed}
                            />
                          </div>
                        ))}
                      </div>

                      <div className="space-y-3">
                        <label className="text-slate-400 text-xs block">Classement final</label>
                        {[
                          { label: '🥇 1ère place', idField: 'winner_club_id', nameField: 'winner_club_name' },
                          { label: '🥈 2ème place', idField: 'second_club_id', nameField: 'second_club_name' },
                          { label: '🥉 3ème place', idField: 'third_club_id', nameField: 'third_club_name' },
                        ].map(({ label, idField, nameField }) => (
                          <div key={idField} className="flex items-center gap-3">
                            <span className="text-slate-300 text-sm w-28 shrink-0">{label}</span>
                            <Select
                              value={ed[idField] || t[idField] || ''}
                              onValueChange={v => {
                                const club = clubs.find(c => c.id === v);
                                setEditField(t.id, idField, v);
                                setEditField(t.id, nameField, club?.name || '');
                              }}
                              disabled={t.rewards_distributed}
                            >
                              <SelectTrigger className="bg-slate-800 border-slate-700 text-white flex-1">
                                <SelectValue placeholder="Choisir un club" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                {clubs.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-3 justify-between items-center pt-1">
                        {!t.rewards_distributed ? (
                          <Button
                            onClick={() => handleDistributeRewards({ ...t, ...(editResults[t.id] || {}) })}
                            className="bg-yellow-500 hover:bg-yellow-600 text-black"
                            size="sm"
                            disabled={!(ed.winner_club_id || t.winner_club_id)}
                          >
                            <Gift className="w-4 h-4 mr-1" /> Distribuer les récompenses
                          </Button>
                        ) : (
                          <span className="text-emerald-400 text-sm">✅ Récompenses distribuées</span>
                        )}
                        <Button onClick={() => handleSaveResults(t)} size="sm" className="bg-slate-700 hover:bg-slate-600">
                          Sauvegarder
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}