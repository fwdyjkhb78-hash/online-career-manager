import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Globe, Edit, Loader2, Users, ChevronDown, ChevronUp, Plus, Trash2, Trophy } from 'lucide-react';
import { toast } from 'sonner';

const NATIONAL_TEAMS = [
  { country: 'France', flag: '🇫🇷', nationality_key: 'Français' },
  { country: 'Espagne', flag: '🇪🇸', nationality_key: 'Espagnol' },
  { country: 'Argentine', flag: '🇦🇷', nationality_key: 'Argentin' },
  { country: 'Angleterre', flag: '🏴', nationality_key: 'Anglais' },
  { country: 'Portugal', flag: '🇵🇹', nationality_key: 'Portugais' },
  { country: 'Norvège', flag: '🇳🇴', nationality_key: 'Norvégien' },
  { country: 'Pays-Bas', flag: '🇳🇱', nationality_key: 'Néerlandais' },
  { country: 'Maroc', flag: '🇲🇦', nationality_key: 'Marocain' },
  { country: 'Belgique', flag: '🇧🇪', nationality_key: 'Belge' },
  { country: 'Allemagne', flag: '🇩🇪', nationality_key: 'Allemand' },
  { country: 'Croatie', flag: '🇭🇷', nationality_key: 'Croate' },
  { country: 'Italie', flag: '🇮🇹', nationality_key: 'Italien' },
  { country: 'Colombie', flag: '🇨🇴', nationality_key: 'Colombien' },
  { country: 'Suède', flag: '🇸🇪', nationality_key: 'Suédois' },
  { country: 'Mexique', flag: '🇲🇽', nationality_key: 'Mexicain' },
  { country: 'États-Unis', flag: '🇺🇸', nationality_key: 'Américain' },
  { country: 'Uruguay', flag: '🇺🇾', nationality_key: 'Uruguayen' },
  { country: 'Ghana', flag: '🇬🇭', nationality_key: 'Ghanéen' },
  { country: 'Qatar', flag: '🇶🇦', nationality_key: 'Qatarien' },
  { country: 'Danemark', flag: '🇩🇰', nationality_key: 'Danois' },
];

export default function NationalTeamsTab() {
  const queryClient = useQueryClient();
  const [editTeam, setEditTeam] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTeam, setNewTeam] = useState({ country: '', flag: '', nationality_key: '' });

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['national-teams'],
    queryFn: () => base44.entities.NationalTeam.list('country', 50),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['all-users-nt'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: championships = [] } = useQuery({
    queryKey: ['championships-nt'],
    queryFn: () => base44.entities.Championship.list('order'),
  });

  const initMutation = useMutation({
    mutationFn: async () => {
      const existing = await base44.entities.NationalTeam.list('country', 50);
      const existingCountries = existing.map(t => t.country);
      const toCreate = NATIONAL_TEAMS.filter(t => !existingCountries.includes(t.country));
      for (const t of toCreate) {
        await base44.entities.NationalTeam.create(t);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['national-teams'] });
      toast.success('Sélections initialisées !');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.NationalTeam.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['national-teams'] });
      toast.success('Sélection mise à jour !');
      setEditTeam(null);
    },
  });

  const createMutation = useMutation({
    mutationFn: () => base44.entities.NationalTeam.create({
      country: newTeam.country.trim(),
      flag: newTeam.flag.trim() || '🌍',
      nationality_key: newTeam.nationality_key.trim(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['national-teams'] });
      toast.success('Sélection créée !');
      setNewTeam({ country: '', flag: '', nationality_key: '' });
      setShowAddForm(false);
    },
    onError: () => toast.error('Erreur lors de la création'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.NationalTeam.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['national-teams'] });
      toast.success('Sélection supprimée');
    },
  });

  const managersWithClub = users.filter(u => u.has_selected_club || u.club_id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-lg flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-400" />
          Sélections Nationales
        </h2>
        <div className="flex gap-2">
          {teams.length === 0 && (
            <Button onClick={() => initMutation.mutate()} disabled={initMutation.isPending} className="bg-blue-500 hover:bg-blue-600">
              {initMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Initialiser les sélections
            </Button>
          )}
          <Button onClick={() => setShowAddForm(v => !v)} variant="outline" className="border-slate-600 text-slate-300">
            <Plus className="w-4 h-4 mr-1" /> Ajouter
          </Button>
        </div>
      </div>

      {/* Formulaire ajout */}
      {showAddForm && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-3">
          <h3 className="text-white font-semibold text-sm">Nouvelle sélection</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Pays *</label>
              <Input value={newTeam.country} onChange={e => setNewTeam(p => ({ ...p, country: e.target.value }))}
                placeholder="Ex: Brésil" className="bg-slate-700 border-slate-600 text-white h-9" />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Emoji drapeau</label>
              <Input value={newTeam.flag} onChange={e => setNewTeam(p => ({ ...p, flag: e.target.value }))}
                placeholder="Ex: 🇧🇷" className="bg-slate-700 border-slate-600 text-white h-9" />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Nationalité des joueurs *</label>
              <Input value={newTeam.nationality_key} onChange={e => setNewTeam(p => ({ ...p, nationality_key: e.target.value }))}
                placeholder="Ex: Brésilien" className="bg-slate-700 border-slate-600 text-white h-9" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" className="border-slate-600" onClick={() => setShowAddForm(false)}>Annuler</Button>
            <Button size="sm" className="bg-blue-500 hover:bg-blue-600"
              disabled={!newTeam.country.trim() || !newTeam.nationality_key.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer'}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-slate-500 animate-spin" /></div>
      ) : teams.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Globe className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Cliquez sur "Initialiser les sélections" pour créer les 20 sélections nationales</p>
        </div>
      ) : (
        <div className="space-y-2">
          {teams.map(team => {
            const info = NATIONAL_TEAMS.find(t => t.country === team.country);
            const isExpanded = expandedId === team.id;
            const assignedManager = users.find(u => u.id === team.manager_id);
            return (
              <Card key={team.id} className="bg-slate-900 border-slate-800">
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{info?.flag || '🌍'}</span>
                      <div>
                        <p className="text-white font-semibold">{team.country}</p>
                        <p className="text-slate-500 text-xs">
                          {assignedManager ? `👤 ${assignedManager.full_name}` : 'Aucun manager assigné'}
                          {' · '}{team.player_ids?.length || 0} joueur(s)
                          {team.championship_name && <span className="ml-1 text-amber-400">· 🏆 {team.championship_name}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 h-7"
                        onClick={() => setEditTeam({ ...team })}>
                        <Edit className="w-3 h-3 mr-1" /> Assigner manager
                      </Button>
                      <button onClick={() => { if (confirm(`Supprimer la sélection "${team.country}" ?`)) deleteMutation.mutate(team.id); }}
                        className="text-slate-500 hover:text-red-400 transition-colors p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setExpandedId(isExpanded ? null : team.id)} className="text-slate-400 hover:text-white">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0 px-4 pb-4">
                    <div className="bg-slate-800 rounded-lg p-3">
                      <p className="text-slate-400 text-xs mb-2 font-semibold uppercase">Joueurs sélectionnés</p>
                      {(team.player_names || []).length === 0 ? (
                        <p className="text-slate-600 text-sm italic">Aucun joueur sélectionné</p>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {(team.player_names || []).map((name, i) => (
                            <Badge key={i} className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">{name}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-800 rounded-lg p-2">
                        <p className="text-white font-bold">{team.points ?? 0}</p>
                        <p className="text-slate-500 text-xs">Points</p>
                      </div>
                      <div className="bg-slate-800 rounded-lg p-2">
                        <p className="text-white font-bold">{team.wins ?? 0}V {team.draws ?? 0}N {team.losses ?? 0}D</p>
                        <p className="text-slate-500 text-xs">Bilan</p>
                      </div>
                      <div className="bg-slate-800 rounded-lg p-2">
                        <p className="text-white font-bold">{team.goals_for ?? 0} - {team.goals_against ?? 0}</p>
                        <p className="text-slate-500 text-xs">Buts</p>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog assign manager */}
      <Dialog open={!!editTeam} onOpenChange={() => setEditTeam(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>Assigner un manager — {editTeam?.country}</DialogTitle>
          </DialogHeader>
          {editTeam && (
            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Manager</label>
                <Select value={editTeam.manager_id || 'none'} onValueChange={v => setEditTeam({ ...editTeam, manager_id: v === 'none' ? null : v, manager_name: v === 'none' ? null : users.find(u => u.id === v)?.full_name })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Choisir un manager" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="none" className="text-white">Aucun</SelectItem>
                    {managersWithClub.map(u => (
                      <SelectItem key={u.id} value={u.id} className="text-white">{u.full_name} ({u.club_name})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block flex items-center gap-1"><Trophy className="w-3 h-3" /> Ligue / Championnat</label>
                <Select
                  value={editTeam.championship || 'none'}
                  onValueChange={v => {
                    const champ = championships.find(c => c.slug === v);
                    setEditTeam({ ...editTeam, championship: v === 'none' ? null : v, championship_name: v === 'none' ? null : champ?.name });
                  }}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Aucune ligue" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="none" className="text-white">Aucune ligue</SelectItem>
                    {championships.map(c => (
                      <SelectItem key={c.id} value={c.slug} className="text-white">{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 border-slate-600" onClick={() => setEditTeam(null)}>Annuler</Button>
                <Button className="flex-1 bg-blue-500 hover:bg-blue-600"
                  onClick={() => updateMutation.mutate({ id: editTeam.id, data: { manager_id: editTeam.manager_id, manager_name: editTeam.manager_name, championship: editTeam.championship, championship_name: editTeam.championship_name } })}
                  disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}