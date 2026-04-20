import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Send } from 'lucide-react';

export default function MoneyTransferModal({ open, onClose, club, onSuccess }) {
  const queryClient = useQueryClient();
  const [selectedClubId, setSelectedClubId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const { data: clubs = [] } = useQuery({
    queryKey: ['all-clubs'],
    queryFn: () => base44.entities.Club.list(),
    enabled: open
  });

  const otherClubs = clubs.filter(c => c.id !== club?.id);

  const reset = () => {
    setSelectedClubId(''); setAmount(''); setReason('');
  };

  const maxAmount = club?.budget || 0;
  const validMoney = selectedClubId && parseInt(amount) > 0 && parseInt(amount) <= maxAmount;

  const moneyMutation = useMutation({
    mutationFn: async () => {
      const amt = parseInt(amount);
      const targetClub = clubs.find(c => c.id === selectedClubId);
      await base44.entities.Club.update(club.id, { budget: club.budget - amt });
      await base44.entities.Club.update(selectedClubId, { budget: targetClub.budget + amt });
      await base44.entities.MoneyTransfer.create({
        from_club_id: club.id,
        from_club_name: club.name,
        to_club_id: selectedClubId,
        to_club_name: targetClub.name,
        amount: amt,
        reason
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-club'] });
      queryClient.invalidateQueries({ queryKey: ['all-clubs'] });
      reset(); onSuccess?.(); onClose();
    }
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Transfert Financier</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-slate-300">Club destinataire</Label>
            <select
              value={selectedClubId}
              onChange={e => setSelectedClubId(e.target.value)}
              className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white text-sm"
            >
              <option value="">-- Choisir un club --</option>
              {otherClubs.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.manager_name})</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-slate-300">Montant (€)</Label>
            <Input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Ex: 5000000"
              className="bg-slate-800 border-slate-700 mt-1"
              max={maxAmount}
            />
            <p className="text-slate-500 text-xs mt-1">Budget disponible : {(maxAmount / 1e6).toFixed(1)}M€</p>
          </div>
          <div>
            <Label className="text-slate-300">Raison (optionnel)</Label>
            <Input
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Ex: Accord de partenariat"
              className="bg-slate-800 border-slate-700 mt-1"
            />
          </div>
          <Button
            onClick={() => moneyMutation.mutate()}
            disabled={!validMoney || moneyMutation.isPending}
            className="w-full bg-emerald-500 hover:bg-emerald-600"
          >
            {moneyMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Envoyer les fonds
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}