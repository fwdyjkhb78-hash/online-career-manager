import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, XCircle, Loader2, Clock, Wallet, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const fmt = (v) => {
  if (!v) return '0€';
  if (v >= 1e9) return `${(v / 1e9).toFixed(0)} Md€`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M€`;
  return `${v}€`;
};

const STATUS = {
  pending: { label: 'En attente', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  approved: { label: 'Approuvé', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  rejected: { label: 'Rejeté', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
};

export default function BudgetRequestsTab({ currentUser }) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('pending');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['budget-requests', filter],
    queryFn: () => base44.entities.BudgetRequest.filter(
      filter === 'all' ? {} : { status: filter },
      '-created_date', 50
    ),
    refetchInterval: 15000,
  });

  const approveMutation = useMutation({
    mutationFn: async (req) => {
      // Récupérer le club et créditer le budget
      const clubs = await base44.entities.Club.filter({ id: req.club_id });
      const club = clubs[0];
      if (!club) throw new Error('Club introuvable');
      await base44.entities.Club.update(req.club_id, { budget: (club.budget || 0) + req.budget_amount });
      await base44.entities.BudgetRequest.update(req.id, {
        status: 'approved',
        approved_by: currentUser?.full_name || currentUser?.email,
      });
      // Notifier le manager
      await base44.entities.Notification.create({
        user_id: req.manager_id,
        club_id: req.club_id,
        type: 'announcement',
        title: '💰 Budget crédité !',
        message: `Votre achat de ${req.pack_label || req.euros + '€'} a été validé. +${fmt(req.budget_amount)} ajoutés à votre club.`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-requests'] });
      toast.success('Budget crédité et manager notifié !');
    },
    onError: (e) => toast.error('Erreur: ' + e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async (req) => {
      await base44.entities.BudgetRequest.update(req.id, {
        status: 'rejected',
        approved_by: currentUser?.full_name || currentUser?.email,
      });
      await base44.entities.Notification.create({
        user_id: req.manager_id,
        club_id: req.club_id,
        type: 'announcement',
        title: '❌ Demande de budget rejetée',
        message: `Votre demande de ${req.pack_label || req.euros + '€'} a été rejetée. Contactez le staff pour plus d'informations.`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-requests'] });
      toast.success('Demande rejetée');
    },
    onError: () => toast.error('Erreur lors du rejet'),
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">Demandes de budget</h2>
            {pendingCount > 0 && (
              <p className="text-amber-400 text-xs font-semibold">{pendingCount} en attente de validation</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {['pending', 'approved', 'rejected', 'all'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filter === f ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}>
              {f === 'all' ? 'Tout' : STATUS[f]?.label || f}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-slate-400 animate-spin" /></div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Aucune demande {filter === 'pending' ? 'en attente' : ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <div key={req.id} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white font-bold">{req.club_name}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS[req.status]?.color}`}>
                    {STATUS[req.status]?.label}
                  </span>
                </div>
                <p className="text-slate-400 text-sm">{req.manager_name}</p>
                <div className="flex gap-4 mt-2 text-sm">
                  <span className="text-blue-400 font-semibold">{req.euros}€ payés</span>
                  <span className="text-emerald-400 font-semibold">+{fmt(req.budget_amount)} en jeu</span>
                  {req.pack_label && <span className="text-slate-500">{req.pack_label}</span>}
                </div>
                {req.proof_url && (
                  <a href={req.proof_url} target="_blank" rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-blue-400 text-xs hover:underline">
                    Voir la preuve de paiement →
                  </a>
                )}
                <p className="text-slate-600 text-xs mt-1">
                  {new Date(req.created_date).toLocaleString('fr-FR')}
                  {req.approved_by && ` · Traité par ${req.approved_by}`}
                </p>
              </div>

              {req.status === 'pending' && (
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => approveMutation.mutate(req)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />Approuver
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => rejectMutation.mutate(req)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className="border-red-500/40 text-red-400 hover:bg-red-500/10 rounded-xl"
                  >
                    <XCircle className="w-4 h-4 mr-1" />Rejeter
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}