import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Euro, Check, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function DevelopmentPlanCardWithPlayer({ plan, club, players = [] }) {
  const queryClient = useQueryClient();
  const [showPlayerDialog, setShowPlayerDialog] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [statIncrease, setStatIncrease] = useState(1);

  const publishMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.DevelopmentPlan.update(plan.id, {
        is_published: true,
        published_at: new Date().toISOString()
      });
      if (plan.budget_allocated > 0) {
        await base44.entities.Club.update(club.id, {
          budget: club.budget - plan.budget_allocated
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-plans'] });
      queryClient.invalidateQueries({ queryKey: ['my-club'] });
    }
  });

  const applyDevelopmentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPlayer) return;
      const increase = parseInt(statIncrease) || 1;
      const newOverall = Math.min(99, selectedPlayer.overall + increase);
      
      await base44.entities.Player.update(selectedPlayer.id, {
        overall: newOverall
      });

      // Mark plan as published after applying
      await base44.entities.DevelopmentPlan.update(plan.id, {
        is_published: true,
        published_at: new Date().toISOString()
      });

      if (plan.budget_allocated > 0) {
        await base44.entities.Club.update(club.id, {
          budget: club.budget - plan.budget_allocated
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-plans'] });
      queryClient.invalidateQueries({ queryKey: ['my-players'] });
      queryClient.invalidateQueries({ queryKey: ['my-club'] });
      setShowPlayerDialog(false);
      setSelectedPlayer(null);
      setStatIncrease(1);
    }
  });

  return (
    <>
      <div className={`border rounded-2xl p-5 space-y-3 ${plan.is_published ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-slate-800/50 border-slate-700/50'}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-white font-bold text-lg">{plan.title}</h4>
            {plan.description && <p className="text-slate-400 text-sm mt-1">{plan.description}</p>}
          </div>
          {plan.is_published
            ? <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shrink-0"><Check className="w-3 h-3 mr-1" />Publié</Badge>
            : <Badge className="bg-slate-700 text-slate-300 border-slate-600 shrink-0">Brouillon</Badge>}
        </div>
        {plan.objectives?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {plan.objectives.map((o, i) => (
              <span key={i} className="text-xs bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-full px-3 py-1">{o}</span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between">
          {plan.budget_allocated > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Euro className="w-4 h-4 text-amber-400" />
              <span className="text-amber-300 font-bold">{(plan.budget_allocated / 1e6).toFixed(1)}M€ alloués</span>
            </div>
          )}
          {!plan.is_published && (
            <div className="flex gap-2 ml-auto">
              <Button
                onClick={() => setShowPlayerDialog(true)}
                disabled={applyDevelopmentMutation.isPending || players.length === 0}
                size="sm"
                className="bg-purple-500 hover:bg-purple-600"
              >
                <Zap className="w-3 h-3 mr-1" />
                Développer Joueur
              </Button>
              <Button
                onClick={() => publishMutation.mutate()}
                disabled={publishMutation.isPending || (plan.budget_allocated > 0 && club.budget < plan.budget_allocated)}
                size="sm"
                className="bg-blue-500 hover:bg-blue-600"
              >
                {publishMutation.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                <Send className="w-3 h-3 mr-1" />
                Publier
              </Button>
            </div>
          )}
        </div>
        {!plan.is_published && plan.budget_allocated > 0 && club.budget < plan.budget_allocated && (
          <p className="text-red-400 text-xs">Budget insuffisant pour publier ce plan</p>
        )}
      </div>

      <Dialog open={showPlayerDialog} onOpenChange={setShowPlayerDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Appliquer le développement</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-2">Sélectionner un joueur</label>
              <select
                value={selectedPlayer?.id || ''}
                onChange={(e) => {
                  const p = players.find(pl => pl.id === e.target.value);
                  setSelectedPlayer(p || null);
                }}
                className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white text-sm"
              >
                <option value="">Choisir un joueur...</option>
                {players.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} - {p.position} ({p.overall}★)
                  </option>
                ))}
              </select>
            </div>

            {selectedPlayer && (
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">
                  Augmentation de note (actuellement: {selectedPlayer.overall})
                </label>
                <Input
                  type="number"
                  min="1"
                  max={99 - selectedPlayer.overall}
                  value={statIncrease}
                  onChange={(e) => setStatIncrease(e.target.value)}
                  className="bg-slate-800 border-slate-600"
                />
                <p className="text-slate-400 text-sm mt-2">
                  Nouvelle note: <span className="text-emerald-400 font-bold">{Math.min(99, selectedPlayer.overall + parseInt(statIncrease) || 0)}</span>
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowPlayerDialog(false)} className="border-slate-600">
              Annuler
            </Button>
            <Button
              onClick={() => applyDevelopmentMutation.mutate()}
              disabled={applyDevelopmentMutation.isPending || !selectedPlayer}
              className="bg-purple-500 hover:bg-purple-600"
            >
              {applyDevelopmentMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Appliquer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}