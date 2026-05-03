import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, Plus, Edit, Loader2, Trash2, Trophy, Users, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY_CLUB = { name: '', stadium: '', championship: '', budget: 100000000 };

export default function ClubManagerTab() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editClub, setEditClub] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [form, setForm] = useState(EMPTY_CLUB);
  const [assignChamp, setAssignChamp] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogoUpload = async (file, setter) => {
    if (!file) return;
    setUploadingLogo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setter(file_url);
    setUploadingLogo(false);
  }; // { slug, name } de la ligue en cours d'assignation

  // Gestion des championnats
  const [createChampOpen, setCreateChampOpen] = useState(false);
  const [deleteChampConfirm, setDeleteChampConfirm] = useState(null);
  const [newChampName, setNewChampName] = useState('');

  const { data: championships = [], isLoading: loadingChamps } = useQuery({
    queryKey: ['championships'],
    queryFn: () => base44.entities.Championship.list('order', 50),
  });

  const { data: clubs = [], isLoading } = useQuery({
    queryKey: ['clubs-staff'],
    queryFn: () => base44.entities.Club.list(),
  });

  const createChampMutation = useMutation({
    mutationFn: () => {
      const slug = newChampName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      return base44.entities.Championship.create({ name: newChampName, slug, order: championships.length + 1 });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['championships'] });
      toast.success('Championnat créé !');
      setNewChampName('');
      setCreateChampOpen(false);
    },
  });

  const deleteChampMutation = useMutation({
    mutationFn: (id) => base44.entities.Championship.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['championships'] });
      toast.success('Championnat supprimé !');
      setDeleteChampConfirm(null);
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Club.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs-staff'] });
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
      toast.success('Club créé avec succès !');
      setCreateOpen(false);
      setForm(EMPTY_CLUB);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Club.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs-staff'] });
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
      toast.success('Club mis à jour !');
      setEditClub(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Club.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs-staff'] });
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
      toast.success('Club supprimé !');
      setDeleteConfirm(null);
    },
  });

  const toggleChamp = (slug, arr, setFn, key) => {
    const current = arr || [];
    const updated = current.includes(slug) ? current.filter(s => s !== slug) : [...current, slug];
    setFn(prev => ({ ...prev, [key]: updated }));
  };

  const handleCreate = () => {
    if (!form.name.trim()) return toast.error('Le nom est requis');
    if (!form.championships || form.championships.length === 0) return toast.error('Choisissez au moins un championnat');
    createMutation.mutate({ ...form, championship: form.championships[0] });
  };

  const handleUpdate = () => {
    if (!editClub.name.trim()) return toast.error('Le nom est requis');
    const champArr = editClub.championships && editClub.championships.length > 0
      ? editClub.championships
      : (editClub.championship ? [editClub.championship] : []);
    updateMutation.mutate({ id: editClub.id, data: {
      name: editClub.name,
      logo_url: editClub.logo_url || '',
      stadium: editClub.stadium,
      championship: champArr[0] || '',
      championships: champArr,
      points: Number(editClub.points) || 0,
      wins: Number(editClub.wins) || 0,
      draws: Number(editClub.draws) || 0,
      losses: Number(editClub.losses) || 0,
      goals_for: Number(editClub.goals_for) || 0,
      goals_against: Number(editClub.goals_against) || 0,
    }});
  };

  const assignMutation = useMutation({
    mutationFn: ({ club, slug, add }) => {
      const current = club.championships && club.championships.length > 0
        ? club.championships : (club.championship ? [club.championship] : []);
      const updated = add ? [...new Set([...current, slug])] : current.filter(s => s !== slug);
      return base44.entities.Club.update(club.id, { championships: updated, championship: updated[0] || '' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs-staff'] });
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
    },
  });

  // Un club appartient à une ligue si son array championships contient le slug,
  // ou (rétrocompat) si son champ championship string est égal au slug.
  const clubsByChamp = (slug) => clubs.filter(c => {
    const arr = c.championships && c.championships.length > 0 ? c.championships : (c.championship ? [c.championship] : []);
    return arr.includes(slug);
  });

  const displayedChamps = championships;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-white font-bold text-lg">Gestion des Clubs</h2>
          <p className="text-slate-400 text-sm">{clubs.length} club(s) au total</p>
        </div>
        <div className="flex gap-2">
          <Button className="bg-blue-500 hover:bg-blue-600" onClick={() => setCreateChampOpen(true)}>
            <Trophy className="w-4 h-4 mr-2" />
            + Championnat
          </Button>
          <Button className="bg-emerald-500 hover:bg-emerald-600"
            onClick={() => { setForm({ ...EMPTY_CLUB, championship: championships[0]?.slug || '' }); setCreateOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Créer un club
          </Button>
        </div>
      </div>

      {/* Liste des championnats */}
      {loadingChamps ? (
        <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-slate-500 animate-spin" /></div>
      ) : displayedChamps.map(champ => (
        <Card key={champ.slug} className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                {champ.name}
                <Badge className="bg-slate-700 text-slate-300">{clubsByChamp(champ.slug).length} clubs</Badge>
              </div>
              {championships.length > 0 && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 h-7"
                    onClick={() => setAssignChamp(champ)}>
                    <Users className="w-3 h-3 mr-1" />Clubs
                  </Button>
                  <Button size="sm" variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10 h-7"
                    onClick={() => setDeleteChampConfirm(champ)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-slate-500 animate-spin" /></div>
            ) : clubsByChamp(champ.slug).length === 0 ? (
              <p className="text-slate-500 text-sm py-2">Aucun club dans cette ligue</p>
            ) : (
              <div className="space-y-2">
                {clubsByChamp(champ.slug).map(club => (
                  <div key={club.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                    <div>
                      <p className="text-white font-medium">{club.name}</p>
                      <p className="text-slate-400 text-xs">
                        {club.stadium ? `🏟 ${club.stadium} · ` : ''}
                        {club.manager_name ? `👤 ${club.manager_name}` : 'Aucun manager'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 text-sm"><span className="text-white font-bold">{club.points ?? 0}</span> pts</span>
                      <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:text-white"
                        onClick={() => setEditClub({ ...club })}>
                        <Edit className="w-3 h-3 mr-1" />Modifier
                      </Button>
                      <Button size="sm" variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                        onClick={() => setDeleteConfirm(club)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Dialog Créer championnat */}
      <Dialog open={createChampOpen} onOpenChange={setCreateChampOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Trophy className="w-5 h-5 text-blue-400" />Créer un championnat</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input value={newChampName} onChange={e => setNewChampName(e.target.value)}
              placeholder="Ex: Ligue 1, Premier League..." className="bg-slate-800 border-slate-700 text-white" />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-slate-600" onClick={() => setCreateChampOpen(false)}>Annuler</Button>
              <Button className="flex-1 bg-blue-500 hover:bg-blue-600" onClick={() => createChampMutation.mutate()}
                disabled={!newChampName.trim() || createChampMutation.isPending}>
                {createChampMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Supprimer championnat */}
      <Dialog open={!!deleteChampConfirm} onOpenChange={() => setDeleteChampConfirm(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-sm">
          <DialogHeader><DialogTitle className="text-red-400 flex items-center gap-2"><Trash2 className="w-5 h-5" />Supprimer "{deleteChampConfirm?.name}" ?</DialogTitle></DialogHeader>
          <p className="text-slate-400 text-sm">Les clubs de ce championnat ne seront pas supprimés mais n'auront plus de championnat assigné.</p>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" className="flex-1 border-slate-600" onClick={() => setDeleteChampConfirm(null)}>Annuler</Button>
            <Button className="flex-1 bg-red-500 hover:bg-red-600"
              onClick={() => deleteChampMutation.mutate(deleteChampConfirm.id)}
              disabled={deleteChampMutation.isPending}>
              {deleteChampMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Supprimer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Créer un club */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="w-5 h-5 text-emerald-400" />Créer un nouveau club</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Nom du club *</label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Olympique de Lyon" className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Stade</label>
              <Input value={form.stadium} onChange={e => setForm({ ...form, stadium: e.target.value })}
                placeholder="Ex: Groupama Stadium" className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-2 block">Championnats * (plusieurs possibles)</label>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {championships.map(c => {
                  const selected = (form.championships || []).includes(c.slug);
                  return (
                    <button key={c.slug} type="button"
                      onClick={() => toggleChamp(c.slug, form.championships, setForm, 'championships')}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${selected ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'border-slate-600 text-slate-400 hover:border-slate-500'}`}>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500'}`}>
                        {selected && <span className="text-white text-xs">✓</span>}
                      </div>
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-slate-600" onClick={() => setCreateOpen(false)}>Annuler</Button>
              <Button className="flex-1 bg-emerald-500 hover:bg-emerald-600" onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Supprimer club */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-red-400"><Trash2 className="w-5 h-5" />Supprimer {deleteConfirm?.name} ?</DialogTitle></DialogHeader>
          <p className="text-slate-400 text-sm">Cette action est irréversible.</p>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" className="flex-1 border-slate-600" onClick={() => setDeleteConfirm(null)}>Annuler</Button>
            <Button className="flex-1 bg-red-500 hover:bg-red-600" onClick={() => deleteMutation.mutate(deleteConfirm.id)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Supprimer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Assigner clubs à un championnat */}
      <Dialog open={!!assignChamp} onOpenChange={() => setAssignChamp(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              Clubs dans "{assignChamp?.name}"
            </DialogTitle>
          </DialogHeader>
          {assignChamp && (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {clubs.length === 0 && <p className="text-slate-500 text-sm">Aucun club créé.</p>}
              {clubs.map(club => {
                const arr = club.championships && club.championships.length > 0
                  ? club.championships : (club.championship ? [club.championship] : []);
                const inLeague = arr.includes(assignChamp.slug);
                return (
                  <button key={club.id} type="button"
                    onClick={() => assignMutation.mutate({ club, slug: assignChamp.slug, add: !inLeague })}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-colors ${inLeague ? 'bg-emerald-500/15 border-emerald-500/50' : 'border-slate-700 hover:border-slate-500'}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${inLeague ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500'}`}>
                        {inLeague && <span className="text-white text-xs">✓</span>}
                      </div>
                      <span className={inLeague ? 'text-emerald-300' : 'text-slate-300'}>{club.name}</span>
                    </div>
                    <span className="text-slate-500 text-xs">{club.manager_name || 'Sans manager'}</span>
                  </button>
                );
              })}
            </div>
          )}
          <Button variant="outline" className="border-slate-600 w-full mt-2" onClick={() => setAssignChamp(null)}>Fermer</Button>
        </DialogContent>
      </Dialog>

      {/* Dialog Modifier club */}
      <Dialog open={!!editClub} onOpenChange={() => setEditClub(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Edit className="w-5 h-5 text-blue-400" />Modifier {editClub?.name}</DialogTitle></DialogHeader>
          {editClub && (
            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Nom *</label>
                <Input value={editClub.name} onChange={e => setEditClub({ ...editClub, name: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Logo du club</label>
                <div className="flex gap-3 items-center">
                  {editClub.logo_url ? (
                    <div className="relative shrink-0">
                      <img src={editClub.logo_url} alt="logo" className="w-12 h-12 rounded-lg object-cover border border-slate-600" />
                      <button onClick={() => setEditClub({ ...editClub, logo_url: '' })}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                        <X className="w-2.5 h-2.5 text-white" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-700 border border-slate-600 flex items-center justify-center shrink-0">
                      <Shield className="w-5 h-5 text-slate-500" />
                    </div>
                  )}
                  <label className="flex-1 cursor-pointer">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed transition-colors ${uploadingLogo ? 'border-blue-500/50 bg-blue-500/10' : 'border-slate-600 hover:border-slate-400 bg-slate-800'}`}>
                      {uploadingLogo ? <Loader2 className="w-4 h-4 text-blue-400 animate-spin" /> : <Upload className="w-4 h-4 text-slate-400" />}
                      <span className="text-slate-400 text-xs">{uploadingLogo ? 'Upload en cours...' : 'Importer une image'}</span>
                    </div>
                    <input type="file" accept="image/*" className="hidden" disabled={uploadingLogo}
                      onChange={e => e.target.files?.[0] && handleLogoUpload(e.target.files[0], (url) => setEditClub({ ...editClub, logo_url: url }))} />
                  </label>
                </div>
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Stade</label>
                <Input value={editClub.stadium || ''} onChange={e => setEditClub({ ...editClub, stadium: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-2 block">Championnats (plusieurs possibles)</label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {championships.map(c => {
                    const currentArr = editClub.championships && editClub.championships.length > 0
                      ? editClub.championships : (editClub.championship ? [editClub.championship] : []);
                    const selected = currentArr.includes(c.slug);
                    return (
                      <button key={c.slug} type="button"
                        onClick={() => {
                          const arr = editClub.championships && editClub.championships.length > 0
                            ? editClub.championships : (editClub.championship ? [editClub.championship] : []);
                          const updated = arr.includes(c.slug) ? arr.filter(s => s !== c.slug) : [...arr, c.slug];
                          setEditClub({ ...editClub, championships: updated });
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${selected ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' : 'border-slate-600 text-slate-400 hover:border-slate-500'}`}>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selected ? 'bg-blue-500 border-blue-500' : 'border-slate-500'}`}>
                          {selected && <span className="text-white text-xs">✓</span>}
                        </div>
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Points', field: 'points' }, { label: 'V', field: 'wins' }, { label: 'N', field: 'draws' },
                  { label: 'D', field: 'losses' }, { label: 'BP', field: 'goals_for' }, { label: 'BC', field: 'goals_against' },
                ].map(({ label, field }) => (
                  <div key={field}>
                    <label className="text-slate-400 text-xs mb-1 block">{label}</label>
                    <Input type="number" value={editClub[field] ?? 0}
                      onChange={e => setEditClub({ ...editClub, [field]: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white h-8 text-sm" />
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 border-slate-600" onClick={() => setEditClub(null)}>Annuler</Button>
                <Button className="flex-1 bg-blue-500 hover:bg-blue-600" onClick={handleUpdate} disabled={updateMutation.isPending}>
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