import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, HandCoins } from 'lucide-react';

export default function LoanListToggle({ player, clubId }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [loanPrice, setLoanPrice] = useState(player.loan_asking_price || '');

  const toggleMutation = useMutation({
    mutationFn: (data) => base44.entities.Player.update(player.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-players', clubId] });
      queryClient.invalidateQueries({ queryKey: ['players', clubId] });
      queryClient.invalidateQueries({ queryKey: ['all-players-transfer'] });
      setOpen(false);
    }
  });

  const isOnLoanList = player.is_on_loan_list;

  const handleToggleOn = () => {
    toggleMutation.mutate({
      is_on_loan_list: true,
      loan_asking_price: parseInt(loanPrice) || 0,
    });
  };

  const handleToggleOff = () => {
    toggleMutation.mutate({ is_on_loan_list: false, loan_asking_price: null });
  };

  if (isOnLoanList) {
    return (
      <button
        title="Retirer de la liste de prêt"
        onClick={() => handleToggleOff()}
        disabled={toggleMutation.isPending}
        className="p-1.5 bg-blue-500/30 hover:bg-blue-500 text-blue-300 hover:text-white rounded transition-colors"
      >
        {toggleMutation.isPending
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <HandCoins className="w-3.5 h-3.5" />
        }
      </button>
    );
  }

  return (
    <>
      <button
        title="Mettre sur liste de prêt"
        onClick={() => setOpen(true)}
        className="p-1.5 bg-slate-700 hover:bg-blue-500/30 text-slate-400 hover:text-blue-300 rounded transition-colors"
      >
        <HandCoins className="w-3.5 h-3.5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-300">
              <HandCoins className="w-4 h-4" />
              Mettre sur liste de prêt
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-xl">
              {player.image_url && (
                <img src={player.image_url} alt={player.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
              )}
              <div>
                <p className="text-white font-bold">{player.name}</p>
                <p className="text-slate-400 text-sm">{player.position} · {player.overall} OVR</p>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-300">Frais de prêt demandés (€) — optionnel</label>
              <Input
                type="number"
                value={loanPrice}
                onChange={e => setLoanPrice(e.target.value)}
                placeholder="Ex: 2000000"
                className="bg-slate-800 border-slate-600"
              />
              {loanPrice && <p className="text-slate-400 text-xs">{(parseFloat(loanPrice) / 1e6).toFixed(2)}M€</p>}
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)} className="border-slate-600">Annuler</Button>
              <Button
                onClick={handleToggleOn}
                disabled={toggleMutation.isPending}
                className="bg-blue-500 hover:bg-blue-600"
              >
                {toggleMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirmer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}