import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Trash2, Copy, AlertTriangle } from 'lucide-react';
import { fetchAll } from '@/utils/fetchAll';
import { toast } from 'sonner';

export default function DeduplicatePlayersTab() {
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);

  const { data: players = [], isLoading } = useQuery({
    queryKey: ['all-players-dedup'],
    queryFn: () => fetchAll('Player'),
  });

  // Trouver les groupes de doublons (même nom normalisé)
  const groups = Object.values(
    players.reduce((acc, p) => {
      const key = p.name?.toLowerCase().trim();
      if (!key) return acc;
      if (!acc[key]) acc[key] = [];
      acc[key].push(p);
      return acc;
    }, {})
  ).filter(group => group.length > 1);

  // Pour chaque groupe, déterminer le joueur à garder et ceux à supprimer
  const duplicateGroups = groups.map(group => {
    const sorted = [...group].sort((a, b) => {
      const aHasClub = !!(a.club_id && a.club_name) ? 1 : 0;
      const bHasClub = !!(b.club_id && b.club_name) ? 1 : 0;
      if (bHasClub !== aHasClub) return bHasClub - aHasClub;
      return (b.overall || 0) - (a.overall || 0);
    });
    return {
      keep: sorted[0],
      toDelete: sorted.slice(1),
    };
  });

  const toDeleteAll = duplicateGroups.flatMap(g => g.toDelete);

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      setDeleting(true);
      for (const p of toDeleteAll) {
        await base44.entities.Player.delete(p.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-players-dedup'] });
      queryClient.invalidateQueries({ queryKey: ['all-players-staff'] });
      queryClient.invalidateQueries({ queryKey: ['all-players-move'] });
      toast.success(`${toDeleteAll.length} doublon(s) supprimé(s) !`);
      setDeleting(false);
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
      setDeleting(false);
    },
  });

  const deleteSingleMutation = useMutation({
    mutationFn: (id) => base44.entities.Player.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-players-dedup'] });
      queryClient.invalidateQueries({ queryKey: ['all-players-staff'] });
      queryClient.invalidateQueries({ queryKey: ['all-players-move'] });
      toast.success('Doublon supprimé');
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-slate-500 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-lg">Supprimer les doublons</h2>
          <p className="text-slate-400 text-sm mt-1">
            {duplicateGroups.length} groupe(s) de doublons détecté(s) — {toDeleteAll.length} joueur(s) à supprimer.
          </p>
        </div>
        {toDeleteAll.length > 0 && (
          <Button
            variant="destructive"
            onClick={() => deleteAllMutation.mutate()}
            disabled={deleteAllMutation.isPending || deleting}
          >
            {deleteAllMutation.isPending || deleting
              ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
              : <Trash2 className="w-4 h-4 mr-2" />
            }
            Tout supprimer ({toDeleteAll.length})
          </Button>
        )}
      </div>

      {duplicateGroups.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="py-12 text-center">
            <Copy className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Aucun doublon détecté 🎉</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {duplicateGroups.map(({ keep, toDelete }) => (
            <Card key={keep.id} className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  {keep.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {/* Joueur à garder */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div>
                    <p className="text-emerald-400 text-xs font-bold mb-0.5">✓ À garder</p>
                    <p className="text-white text-sm">{keep.name}</p>
                    <p className="text-slate-400 text-xs">
                      {keep.position} · {keep.club_name || 'Sans club'} · OVR {keep.overall}
                    </p>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Conservé</Badge>
                </div>
                {/* Joueurs à supprimer */}
                {toDelete.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div>
                      <p className="text-red-400 text-xs font-bold mb-0.5">✗ Doublon</p>
                      <p className="text-white text-sm">{p.name}</p>
                      <p className="text-slate-400 text-xs">
                        {p.position} · {p.club_name || 'Sans club'} · OVR {p.overall}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteSingleMutation.mutate(p.id)}
                      disabled={deleteSingleMutation.isPending}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}