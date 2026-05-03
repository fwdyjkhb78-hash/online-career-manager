import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Send, Euro, FileText, Check } from 'lucide-react';
import DevelopmentPlanCardWithPlayer from './DevelopmentPlanCardWithPlayer';
import { motion } from 'framer-motion';

export default function DevelopmentPlanTab({ club, onBudgetUpdate, players = [] }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budgetAllocated, setBudgetAllocated] = useState('');
  const [objective, setObjective] = useState('');
  const [objectives, setObjectives] = useState([]);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['dev-plans', club?.id],
    queryFn: async () => {
      try {
        return await base44.entities.DevelopmentPlan.filter({ club_id: club.id }, '-created_date');
      } catch (e) {
        return [];
      }
    },
    enabled: !!club?.id,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.DevelopmentPlan.create({
        club_id: club.id,
        club_name: club.name,
        title,
        description,
        budget_allocated: parseInt(budgetAllocated) || 0,
        objectives,
        is_published: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-plans'] });
      setShowForm(false); setTitle(''); setDescription(''); setBudgetAllocated(''); setObjectives([]);
    }
  });

  const DevelopmentPlanCard = ({ plan }) => {
    return (
      <div>
        <div>
          <h4 className="text-white font-bold text-lg">{plan.title}</h4>
          {plan.description && <p className="text-slate-400 text-sm mt-1">{plan.description}</p>}
        </div>
        <div className="flex items-center justify-between p-5">
          {plan.budget_allocated > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-amber-300 font-bold">{(plan.budget_allocated / 1e6).toFixed(1)}M€ alloués</span>
            </div>
          )}
          {!plan.is_published && players.length > 0 && (
            <DevelopmentPlanCardWithPlayer plan={plan} club={club} players={players} />
          )}
        </div>
      </div>
    );
  };

  const addObjective = () => {
    if (objective.trim()) { setObjectives([...objectives, objective.trim()]); setObjective(''); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Plans de Développement</h3>
        <Button onClick={() => setShowForm(!showForm)} className="bg-emerald-500 hover:bg-emerald-600" size="sm">
          <Plus className="w-4 h-4 mr-1" /> Nouveau Plan
        </Button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/70 border border-slate-700 rounded-2xl p-6 space-y-4">
          <div>
            <Label className="text-slate-300">Titre du plan</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} className="bg-slate-700 border-slate-600 mt-1" placeholder="Ex: Développement de l'académie" />
          </div>
          <div>
            <Label className="text-slate-300">Description</Label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              className="w-full mt-1 bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm h-24 resize-none"
              placeholder="Décrivez votre plan..." />
          </div>
          <div>
            <Label className="text-slate-300">Budget alloué (€)</Label>
            <Input type="number" value={budgetAllocated} onChange={e => setBudgetAllocated(e.target.value)}
              className="bg-slate-700 border-slate-600 mt-1" placeholder="Ex: 10000000" />
            {budgetAllocated && <p className="text-slate-500 text-xs mt-1">{(parseInt(budgetAllocated) / 1e6).toFixed(1)}M€ — sera déduit à la publication</p>}
          </div>
          <div>
            <Label className="text-slate-300">Objectifs</Label>
            <div className="flex gap-2 mt-1">
              <Input value={objective} onChange={e => setObjective(e.target.value)} onKeyDown={e => e.key === 'Enter' && addObjective()}
                className="bg-slate-700 border-slate-600 flex-1" placeholder="Ajouter un objectif..." />
              <Button onClick={addObjective} size="sm" variant="outline" className="border-slate-600">+</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {objectives.map((o, i) => (
                <Badge key={i} className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 cursor-pointer"
                  onClick={() => setObjectives(objectives.filter((_, idx) => idx !== i))}>
                  {o} ✕
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => createMutation.mutate()} disabled={!title || createMutation.isPending}
              className="bg-emerald-500 hover:bg-emerald-600 flex-1">
              {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
              Sauvegarder
            </Button>
            <Button onClick={() => setShowForm(false)} variant="outline" className="border-slate-600">Annuler</Button>
          </div>
        </motion.div>
      )}

      {isLoading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-emerald-500 animate-spin" /></div> : (
        <div className="space-y-4">
          {plans.map(plan => (
            <motion.div key={plan.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={`border rounded-2xl p-5 space-y-3 ${plan.is_published ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-slate-800/50 border-slate-700/50'}`}>
              <div className="flex items-start justify-between gap-3">
                <DevelopmentPlanCard plan={plan} />
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
            </motion.div>
          ))}
          {plans.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-600" />
              <p>Aucun plan de développement</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}