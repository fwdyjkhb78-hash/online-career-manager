import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Edit2 } from 'lucide-react';



export default function PlayerStatsEditor({ player, clubId }) {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState(player);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Player.update(player.id, data);
      // Si l'overall a augmenté, on enregistre une évolution
      if (data.overall && data.overall > player.overall) {
        await base44.entities.PlayerEvolution.create({
          player_id: player.id,
          player_name: player.name,
          player_position: data.position || player.position,
          player_image_url: data.image_url || player.image_url || '',
          club_id: player.club_id || '',
          club_name: player.club_name || '',
          overall_before: player.overall,
          overall_after: data.overall,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-players', clubId] });
      setOpen(false);
    }
  });

  const potential = stats.potential || 99;
  const overallExceedsPotential = stats.overall > potential;

  const handleSave = () => {
    updateMutation.mutate(stats);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-blue-400 hover:text-blue-300"
      >
        <Edit2 className="w-3 h-3" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier — {player.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {overallExceedsPotential && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                ⚠️ La note ({stats.overall}) dépasse le potentiel ({potential}).
              </div>
            )}

            {/* Nom */}
            <div className="flex items-center gap-3">
              <label className="w-36 text-sm font-medium text-slate-300">Nom</label>
              <Input
                value={stats.name || ''}
                onChange={(e) => setStats({...stats, name: e.target.value})}
                className="bg-slate-800 border-slate-600 flex-1"
              />
            </div>

            {/* Poste */}
            <div className="flex items-center gap-3">
              <label className="w-36 text-sm font-medium text-slate-300">Poste</label>
              <select
                value={stats.position || ''}
                onChange={(e) => setStats({...stats, position: e.target.value})}
                className="bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white text-sm flex-1"
              >
                {["GK","CB","LB","RB","CDM","CM","CAM","LW","RW","ST"].map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>

            {/* Note globale */}
            <div className="flex items-center gap-3">
              <label className="w-36 text-sm font-medium text-slate-300">Note globale</label>
              <Input type="number" min="1" max="99"
                value={stats.overall || ''}
                onChange={(e) => setStats({...stats, overall: parseInt(e.target.value) || 0})}
                className={`bg-slate-800 border-slate-600 w-24 ${overallExceedsPotential ? 'border-red-500' : ''}`}
              />
              <span className="text-slate-500 text-xs">/99</span>
            </div>

            {/* Âge */}
            <div className="flex items-center gap-3">
              <label className="w-36 text-sm font-medium text-slate-300">Âge</label>
              <Input type="number" min="15" max="45"
                value={stats.age || ''}
                onChange={(e) => setStats({...stats, age: parseInt(e.target.value) || 0})}
                className="bg-slate-800 border-slate-600 w-24"
              />
              <span className="text-slate-500 text-xs">ans</span>
            </div>

            {/* Potentiel */}
            <div className="flex items-center gap-3">
              <label className="w-36 text-sm font-medium text-violet-300">Potentiel max</label>
              <Input type="number" min="1" max="99"
                value={stats.potential || ''}
                onChange={(e) => setStats({...stats, potential: parseInt(e.target.value) || 0})}
                placeholder="99"
                className="bg-slate-800 border-violet-500/50 w-24"
              />
              <span className="text-slate-500 text-xs">/99</span>
            </div>

            {/* Valeur */}
            <div className="flex items-center gap-3">
              <label className="w-36 text-sm font-medium text-slate-300">Valeur (€)</label>
              <Input type="number" min="0"
                value={stats.value || ''}
                onChange={(e) => setStats({...stats, value: parseInt(e.target.value) || 0})}
                className="bg-slate-800 border-slate-600 flex-1"
              />
              <span className="text-slate-500 text-xs whitespace-nowrap">{((stats.value || 0) / 1e6).toFixed(1)}M€</span>
            </div>

            {/* Clause libératoire */}
            <div className="flex items-center gap-3">
              <label className="w-36 text-sm font-medium text-slate-300">Clause lib. (€)</label>
              <Input type="number" min="0"
                value={stats.release_clause || ''}
                onChange={(e) => setStats({...stats, release_clause: parseInt(e.target.value) || 0})}
                className="bg-slate-800 border-slate-600 flex-1"
              />
              <span className="text-slate-500 text-xs whitespace-nowrap">{((stats.release_clause || 0) / 1e6).toFixed(1)}M€</span>
            </div>

            {/* Photo URL */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">URL Photo</label>
              <div className="flex items-center gap-3">
                {stats.image_url && (
                  <img src={stats.image_url} alt="" className="w-10 h-10 rounded-full object-cover bg-slate-700 shrink-0" onError={e => e.currentTarget.style.display='none'} />
                )}
                <Input
                  value={stats.image_url || ''}
                  onChange={(e) => setStats({...stats, image_url: e.target.value})}
                  placeholder="https://..."
                  className="bg-slate-800 border-slate-600 flex-1 text-xs"
                />
              </div>
            </div>


          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)} className="border-slate-600">
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending || overallExceedsPotential}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Sauvegarder
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}