import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Wallet, Pencil, Check, X, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';

const formatBudget = (amount) => {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}Md €`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M €`;
  return `${amount.toLocaleString('fr-FR')} €`;
};

export default function ManageBudgetsTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null); // { clubId, value }
  const [adjusting, setAdjusting] = useState(null); // { clubId, amount, mode }

  const { data: clubs = [], isLoading } = useQuery({
    queryKey: ['all-clubs-budgets'],
    queryFn: () => base44.entities.Club.list('name'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ clubId, budget }) => base44.entities.Club.update(clubId, { budget }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-clubs-budgets'] });
      setEditing(null);
      setAdjusting(null);
      toast.success('Budget mis à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const handleSaveEdit = (clubId) => {
    const budget = parseFloat(editing.value.replace(/\s/g, '').replace(',', '.'));
    if (isNaN(budget) || budget < 0) {
      toast.error('Montant invalide');
      return;
    }
    updateMutation.mutate({ clubId, budget });
  };

  const handleAdjust = (clubId, currentBudget) => {
    const amount = parseFloat(adjusting.amount.replace(/\s/g, '').replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }
    const newBudget = adjusting.mode === 'add' ? currentBudget + amount : Math.max(0, currentBudget - amount);
    updateMutation.mutate({ clubId, budget: newBudget });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Wallet className="w-5 h-5 text-emerald-400" />
        <h2 className="text-white font-semibold text-lg">Gestion des budgets</h2>
        <Badge className="bg-slate-700 text-slate-300 ml-auto">{clubs.length} clubs</Badge>
      </div>

      <div className="grid gap-3">
        {clubs.map((club) => (
          <Card key={club.id} className="bg-slate-900 border-slate-800">
            <CardContent className="py-4 px-5">
              <div className="flex items-center gap-4 flex-wrap">
                {/* Club name */}
                <div className="flex items-center gap-2 min-w-[160px]">
                  {club.logo_url ? (
                    <img src={club.logo_url} alt={club.name} className="w-8 h-8 object-contain rounded" />
                  ) : (
                    <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center text-slate-400 text-xs font-bold">
                      {club.name[0]}
                    </div>
                  )}
                  <span className="text-white font-medium">{club.name}</span>
                </div>

                {/* Budget display */}
                <div className="flex-1 min-w-[120px]">
                  {editing?.clubId === club.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={editing.value}
                        onChange={(e) => setEditing({ clubId: club.id, value: e.target.value })}
                        className="bg-slate-800 border-slate-600 text-white h-8 w-40"
                        placeholder="Ex: 50000000"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(club.id);
                          if (e.key === 'Escape') setEditing(null);
                        }}
                      />
                      <span className="text-slate-400 text-sm">€</span>
                      <Button size="icon" className="h-8 w-8 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleSaveEdit(club.id)}>
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400" onClick={() => setEditing(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <span className={`font-bold text-lg ${(club.budget ?? 0) < 5_000_000 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {formatBudget(club.budget ?? 0)}
                    </span>
                  )}
                </div>

                {/* Adjust section */}
                {adjusting?.clubId === club.id && editing?.clubId !== club.id ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant={adjusting.mode === 'add' ? 'default' : 'outline'}
                      className={adjusting.mode === 'add' ? 'bg-emerald-600 hover:bg-emerald-700 h-8' : 'border-slate-600 text-slate-300 h-8'}
                      onClick={() => setAdjusting({ ...adjusting, mode: 'add' })}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Ajouter
                    </Button>
                    <Button
                      size="sm"
                      variant={adjusting.mode === 'remove' ? 'destructive' : 'outline'}
                      className={adjusting.mode === 'remove' ? 'h-8' : 'border-slate-600 text-slate-300 h-8'}
                      onClick={() => setAdjusting({ ...adjusting, mode: 'remove' })}
                    >
                      <Minus className="w-3 h-3 mr-1" /> Retirer
                    </Button>
                    <Input
                      type="text"
                      value={adjusting.amount}
                      onChange={(e) => setAdjusting({ ...adjusting, amount: e.target.value })}
                      className="bg-slate-800 border-slate-600 text-white h-8 w-32"
                      placeholder="Montant"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAdjust(club.id, club.budget ?? 0);
                        if (e.key === 'Escape') setAdjusting(null);
                      }}
                    />
                    <span className="text-slate-400 text-sm">€</span>
                    <Button size="icon" className="h-8 w-8 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleAdjust(club.id, club.budget ?? 0)}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400" onClick={() => setAdjusting(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : null}

                {/* Action buttons */}
                {editing?.clubId !== club.id && adjusting?.clubId !== club.id && (
                  <div className="flex items-center gap-2 ml-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-600 text-slate-300 hover:text-white h-8"
                      onClick={() => setAdjusting({ clubId: club.id, amount: '', mode: 'add' })}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Ajuster
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-600 text-slate-300 hover:text-white h-8"
                      onClick={() => setEditing({ clubId: club.id, value: String(club.budget ?? 0) })}
                    >
                      <Pencil className="w-3 h-3 mr-1" /> Définir
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}