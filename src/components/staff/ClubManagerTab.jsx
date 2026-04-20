import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, Plus, Edit, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const CHAMPIONSHIPS = [
  { id: 'ligue1_serie_a', label: 'Ligue 1' },
  { id: 'bundesliga_liga_pl', label: 'Ligue 2' },
];

const EMPTY_CLUB = { name: '', stadium: '', championship: 'ligue1_serie_a', budget: 100000000 };

export default function ClubManagerTab() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editClub, setEditClub] = useState(null);
  const [form, setForm] = useState(EMPTY_CLUB);

  const { data: clubs = [], isLoading } = useQuery({
    queryKey: ['clubs-staff'],
    queryFn: () => base44.entities.Club.list(),
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
    onError: () => toast.error('Erreur lors de la création'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Club.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs-staff'] });
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
      toast.success('Club mis à jour !');
      setEditClub(null);
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const handleCreate = () => {
    if (!form.name.trim()) return toast.error('Le nom est requis');
    createMutation.mutate(form);
  };

  const handleUpdate = () => {
    if (!editClub.name.trim()) return toast.error('Le nom est requis');
    updateMutation.mutate({ id: editClub.id, data: { name: editClub.name, stadium: editClub.stadium, championship: editClub.championship } });
  };

  const clubsByChamp = (champId) => clubs.filter(c => (c.championship || 'ligue1_serie_a') === champId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-white font-bold text-lg">Gestion des Clubs</h2>
          <p className="text-slate-400 text-sm">{clubs.length} club(s) au total</p>
        </div>
        <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={() => { setForm(EMPTY_CLUB); setCreateOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Créer un club
        </Button>
      </div>

      {CHAMPIONSHIPS.map(champ => (
        <Card key={champ.id} className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Shield className="w-4 h-4 text-amber-400" />
              {champ.label}
              <Badge className="bg-slate-700 text-slate-300">{clubsByChamp(champ.id).length} clubs</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-slate-500 animate-spin" /></div>
            ) : clubsByChamp(champ.id).length === 0 ? (
              <p className="text-slate-500 text-sm py-2">Aucun club dans cette ligue</p>
            ) : (
              <div className="space-y-2">
                {clubsByChamp(champ.id).map(club => (
                  <div key={club.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                    <div>
                      <p className="text-white font-medium">{club.name}</p>
                      <p className="text-slate-400 text-xs">
                        {club.stadium ? `🏟 ${club.stadium} · ` : ''}
                        {club.manager_name ? `👤 ${club.manager_name}` : 'Aucun manager'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-slate-400 text-sm text-right">
                        <span className="text-white font-bold">{club.points ?? 0}</span> pts
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-600 text-slate-300 hover:text-white"
                        onClick={() => setEditClub({ ...club })}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Modifier
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Dialog Créer un club */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-400" />
              Créer un nouveau club
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Nom du club *</label>
              <Input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Olympique de Lyon"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Stade</label>
              <Input
                value={form.stadium}
                onChange={e => setForm({ ...form, stadium: e.target.value })}
                placeholder="Ex: Groupama Stadium"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Ligue</label>
              <Select value={form.championship} onValueChange={v => setForm({ ...form, championship: v })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {CHAMPIONSHIPS.map(c => (
                    <SelectItem key={c.id} value={c.id} className="text-white">{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-slate-600" onClick={() => setCreateOpen(false)}>
                Annuler
              </Button>
              <Button
                className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Modifier un club */}
      <Dialog open={!!editClub} onOpenChange={() => setEditClub(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-400" />
              Modifier {editClub?.name}
            </DialogTitle>
          </DialogHeader>
          {editClub && (
            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Nom du club *</label>
                <Input
                  value={editClub.name}
                  onChange={e => setEditClub({ ...editClub, name: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Stade</label>
                <Input
                  value={editClub.stadium || ''}
                  onChange={e => setEditClub({ ...editClub, stadium: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Ligue</label>
                <Select value={editClub.championship || 'ligue1_serie_a'} onValueChange={v => setEditClub({ ...editClub, championship: v })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {CHAMPIONSHIPS.map(c => (
                      <SelectItem key={c.id} value={c.id} className="text-white">{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 border-slate-600" onClick={() => setEditClub(null)}>
                  Annuler
                </Button>
                <Button
                  className="flex-1 bg-blue-500 hover:bg-blue-600"
                  onClick={handleUpdate}
                  disabled={updateMutation.isPending}
                >
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