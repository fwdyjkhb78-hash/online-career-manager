import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];

const DEFAULT_PLAYER = {
  name: '',
  position: 'ST',
  overall: '',
  age: '',
  nationality: '',
  pace: '',
  shooting: '',
  passing: '',
  dribbling: '',
  defending: '',
  physical: '',
  value: '',
  image_url: '',
};

export default function CreatePlayerModal({ club, open, onClose }) {
  const [player, setPlayer] = useState({ ...DEFAULT_PLAYER });
  const queryClient = useQueryClient();

  const set = (field, val) => setPlayer(p => ({ ...p, [field]: val }));

  const createMutation = useMutation({
    mutationFn: () => base44.entities.Player.create({
      ...player,
      overall: parseInt(player.overall) || 0,
      age: parseInt(player.age) || 0,
      pace: parseInt(player.pace) || 0,
      shooting: parseInt(player.shooting) || 0,
      passing: parseInt(player.passing) || 0,
      dribbling: parseInt(player.dribbling) || 0,
      defending: parseInt(player.defending) || 0,
      physical: parseInt(player.physical) || 0,
      value: parseInt(player.value) || 0,
      club_id: club.id,
      club_name: club.name,
      is_academy: true,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-players', club.id] });
      toast.success(`${player.name} ajouté à l'effectif !`);
      setPlayer({ ...DEFAULT_PLAYER });
      onClose();
    },
  });

  const numField = (label, field) => (
    <div>
      <Label className="text-slate-300 text-xs">{label}</Label>
      <Input
        type="number"
        value={player[field]}
        onChange={e => set(field, e.target.value)}
        placeholder="0"
        className="bg-slate-800 border-slate-600 text-white mt-1"
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-400" />
            Ajouter un joueur à {club.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Infos principales */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-slate-300 text-xs">Nom du joueur *</Label>
              <Input
                value={player.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Lionel Messi"
                className="bg-slate-800 border-slate-600 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-xs">Position *</Label>
              <Select value={player.position} onValueChange={v => set('position', v)}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {POSITIONS.map(p => (
                    <SelectItem key={p} value={p} className="text-white">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300 text-xs">Note globale *</Label>
              <Input
                type="number" min="1" max="99"
                value={player.overall}
                onChange={e => set('overall', e.target.value)}
                placeholder="85"
                className="bg-slate-800 border-slate-600 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-xs">Âge</Label>
              <Input
                type="number"
                value={player.age}
                onChange={e => set('age', e.target.value)}
                placeholder="25"
                className="bg-slate-800 border-slate-600 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-xs">Nationalité</Label>
              <Input
                value={player.nationality}
                onChange={e => set('nationality', e.target.value)}
                placeholder="Français"
                className="bg-slate-800 border-slate-600 text-white mt-1"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-slate-300 text-xs">Valeur marchande (€)</Label>
              <Input
                type="number"
                value={player.value}
                onChange={e => set('value', e.target.value)}
                placeholder="50000000"
                className="bg-slate-800 border-slate-600 text-white mt-1"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-slate-300 text-xs">URL Photo (optionnel)</Label>
              <Input
                value={player.image_url}
                onChange={e => set('image_url', e.target.value)}
                placeholder="https://..."
                className="bg-slate-800 border-slate-600 text-white mt-1"
              />
            </div>
          </div>

          {/* Stats */}
          <div>
            <p className="text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wide">Stats (optionnel)</p>
            <div className="grid grid-cols-3 gap-2">
              {numField('Vitesse', 'pace')}
              {numField('Tir', 'shooting')}
              {numField('Passe', 'passing')}
              {numField('Dribble', 'dribbling')}
              {numField('Défense', 'defending')}
              {numField('Physique', 'physical')}
            </div>
          </div>

          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !player.name || !player.overall}
            className="w-full bg-emerald-500 hover:bg-emerald-600"
          >
            {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
            Ajouter le joueur
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}