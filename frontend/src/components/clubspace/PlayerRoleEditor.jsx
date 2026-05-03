import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Edit2 } from 'lucide-react';

const POSITIONS = ["GK","CB","LB","RB","CDM","CM","CAM","LW","RW","ST"];
const ROLES = [
  { value: "espoir", label: "🌱 Espoir" },
  { value: "reserviste", label: "🔵 Réserviste" },
  { value: "rotation", label: "🟡 Rotation" },
  { value: "important", label: "🟠 Important" },
  { value: "titulaire_indiscutable", label: "⭐ Titulaire indiscutable" },
];

export default function PlayerRoleEditor({ player, clubId }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(player.position || '');
  const [role, setRole] = useState(player.player_role || 'rotation');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => base44.entities.Player.update(player.id, { position, player_role: role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-players', clubId] });
      setOpen(false);
    }
  });

  return (
    <>
      <button
        title="Modifier poste / rôle"
        onClick={() => setOpen(true)}
        className="p-1.5 bg-slate-700 hover:bg-purple-500/30 text-slate-400 hover:text-purple-300 rounded transition-colors"
      >
        <Edit2 className="w-3.5 h-3.5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-purple-300">Modifier — {player.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="w-24 text-sm font-medium text-slate-300 shrink-0">Poste</label>
              <select
                value={position}
                onChange={e => setPosition(e.target.value)}
                className="bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white text-sm flex-1"
              >
                {POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label className="w-24 text-sm font-medium text-slate-300 shrink-0">Rôle</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white text-sm flex-1"
              >
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 justify-end mt-4">
            <Button variant="outline" onClick={() => setOpen(false)} className="border-slate-600">Annuler</Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="bg-purple-500 hover:bg-purple-600">
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Sauvegarder
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}