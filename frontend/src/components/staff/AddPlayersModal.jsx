import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2, Check, ChevronDown } from 'lucide-react';

const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];

const emptyPlayer = () => ({
  name: '',
  position: 'ST',
  overall: '',
  age: '',
  nationality: '',
  value: '',
  pace: '',
  shooting: '',
  passing: '',
  dribbling: '',
  defending: '',
  physical: '',
});

export default function AddPlayersModal({ open, onClose }) {
  const queryClient = useQueryClient();
  const [selectedClubId, setSelectedClubId] = useState('');
  const [players, setPlayers] = useState([emptyPlayer()]);
  const [success, setSuccess] = useState(false);

  const { data: clubs = [] } = useQuery({
    queryKey: ['clubs'],
    queryFn: () => base44.entities.Club.list(),
    enabled: open,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const club = clubs.find(c => c.id === selectedClubId);
      const toCreate = players
        .filter(p => p.name.trim() && p.position)
        .map(p => ({
          name: p.name.trim(),
          position: p.position,
          overall: parseInt(p.overall) || 70,
          age: parseInt(p.age) || 22,
          nationality: p.nationality || '',
          value: parseInt(p.value) || 0,
          pace: parseInt(p.pace) || null,
          shooting: parseInt(p.shooting) || null,
          passing: parseInt(p.passing) || null,
          dribbling: parseInt(p.dribbling) || null,
          defending: parseInt(p.defending) || null,
          physical: parseInt(p.physical) || null,
          club_id: selectedClubId,
          club_name: club?.name || '',
          is_on_transfer_list: false,
        }));
      return await base44.entities.Player.bulkCreate(toCreate);
    },
    onSuccess: () => {
      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['my-players'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      setTimeout(() => {
        setSuccess(false);
        setPlayers([emptyPlayer()]);
        setSelectedClubId('');
        onClose();
      }, 1000);
    },
    onError: (error) => {
      console.error('Error creating players:', error);
      setSuccess(false);
    },
  });

  const updatePlayer = (index, field, value) => {
    setPlayers(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const removePlayer = (index) => {
    setPlayers(prev => prev.filter((_, i) => i !== index));
  };

  const addRow = () => setPlayers(prev => [...prev, emptyPlayer()]);

  const canSubmit = selectedClubId && players.some(p => p.name.trim());

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Ajouter des joueurs à un effectif</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Club selector */}
          <div className="space-y-1.5">
            <Label className="text-slate-300">Club cible</Label>
            <select
              value={selectedClubId}
              onChange={e => setSelectedClubId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white text-sm"
            >
              <option value="">-- Sélectionner un club --</option>
              {clubs.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Players rows */}
          <div className="space-y-3">
            <div className="grid text-xs text-slate-400 font-medium px-1"
              style={{ gridTemplateColumns: '2fr 80px 50px 50px 1fr 80px 50px 50px 50px 50px 50px 50px 36px' }}>
              <span>Nom</span>
              <span>Poste</span>
              <span>OVR</span>
              <span>Âge</span>
              <span>Nationalité</span>
              <span>Valeur€</span>
              <span>PAC</span>
              <span>SHO</span>
              <span>PAS</span>
              <span>DRI</span>
              <span>DEF</span>
              <span>PHY</span>
              <span></span>
            </div>

            {players.map((p, i) => (
              <div key={i} className="grid gap-1.5 items-center"
                style={{ gridTemplateColumns: '2fr 80px 50px 50px 1fr 80px 50px 50px 50px 50px 50px 50px 36px' }}>
                <Input
                  placeholder="Nom du joueur"
                  value={p.name}
                  onChange={e => updatePlayer(i, 'name', e.target.value)}
                  className="bg-slate-800 border-slate-700 h-8 text-sm"
                />
                <select
                  value={p.position}
                  onChange={e => updatePlayer(i, 'position', e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-white text-sm h-8"
                >
                  {POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                </select>
                {['overall', 'age'].map(field => (
                  <Input
                    key={field}
                    type="number"
                    placeholder={field === 'overall' ? '70' : '22'}
                    value={p[field]}
                    onChange={e => updatePlayer(i, field, e.target.value)}
                    className="bg-slate-800 border-slate-700 h-8 text-sm px-2"
                  />
                ))}
                <Input
                  placeholder="Français"
                  value={p.nationality}
                  onChange={e => updatePlayer(i, 'nationality', e.target.value)}
                  className="bg-slate-800 border-slate-700 h-8 text-sm"
                />
                <Input
                  type="number"
                  placeholder="0"
                  value={p.value}
                  onChange={e => updatePlayer(i, 'value', e.target.value)}
                  className="bg-slate-800 border-slate-700 h-8 text-sm px-2"
                />
                {['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'].map(field => (
                  <Input
                    key={field}
                    type="number"
                    placeholder="-"
                    value={p[field]}
                    onChange={e => updatePlayer(i, field, e.target.value)}
                    className="bg-slate-800 border-slate-700 h-8 text-sm px-2"
                  />
                ))}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removePlayer(i)}
                  disabled={players.length === 1}
                  className="h-8 w-8 text-slate-500 hover:text-red-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={addRow} className="border-slate-600 text-slate-300 hover:bg-slate-800">
              <Plus className="w-4 h-4 mr-2" />Ajouter une ligne
            </Button>
            <span className="text-slate-500 text-sm">{players.filter(p => p.name.trim()).length} joueur(s) à créer</span>
          </div>

          <div className="flex gap-3 pt-2 border-t border-slate-700">
            <Button variant="ghost" onClick={onClose} className="text-slate-400">Annuler</Button>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={!canSubmit || addMutation.isPending || success}
              className="bg-emerald-500 hover:bg-emerald-600 ml-auto"
            >
              {addMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Création...</>
              ) : success ? (
                <><Check className="w-4 h-4 mr-2" />Joueurs créés !</>
              ) : (
                `Créer ${players.filter(p => p.name.trim()).length} joueur(s)`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}