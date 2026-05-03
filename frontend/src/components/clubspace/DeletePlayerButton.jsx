import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function DeletePlayerButton({ player, clubId, compact = false }) {
  const queryClient = useQueryClient();

  const deletePlayer = useMutation({
    mutationFn: async (playerId) => {
      await base44.entities.Player.delete(playerId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-players', clubId] });
    }
  });

  const buttonClass = compact
    ? "h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
    : "h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10";

  const iconSize = compact ? "w-3 h-3" : "w-4 h-4";

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={buttonClass}
        >
          <Trash2 className={iconSize} />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-slate-900 border-slate-700">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">Supprimer {player.name}</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400">
            Êtes-vous sûr de vouloir supprimer ce joueur? Cette action est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex gap-3 justify-end">
          <AlertDialogCancel className="bg-slate-800 text-white border-slate-700 hover:bg-slate-700">Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deletePlayer.mutate(player.id)}
            disabled={deletePlayer.isPending}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {deletePlayer.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Supprimer'}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}