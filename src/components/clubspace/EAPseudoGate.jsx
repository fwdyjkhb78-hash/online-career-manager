import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Gamepad2, Loader2, CheckCircle2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const STAFF_ROLES = ['owner', 'admin', 'staff_mercato', 'staff_championnat', 'staff_developpement', 'staff_formation'];

export default function EAPseudoGate({ user, club, onComplete }) {
  const [pseudo, setPseudo] = useState('');
  const [sitePseudo, setSitePseudo] = useState('');
  const [step, setStep] = useState('welcome'); // 'welcome' | 'form' | 'done'
  const queryClient = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: async () => {
      // Sauvegarder le pseudo EA + pseudo site + marquer intro comme faite
      await base44.auth.updateMe({ ea_pseudo: pseudo.trim(), site_pseudo: sitePseudo.trim() || pseudo.trim(), intro_submitted: true });

      // Poster dans le chat staff
      try {
        await base44.entities.StaffMessage.create({
          author_id: user.id,
          author_name: user.full_name,
          author_role: 'manager',
          content: `🎮 **Présentation de ${user.full_name}** — Manager de ${club.name}\nPseudo EA FC : **${pseudo.trim()}**`,
          is_pinned: false,
        });
      } catch (e) { /* ignore */ }

      // Notifier tous les staff/owner
      const staffNotifTitle = `🆕 Nouveau manager : ${user.full_name}`;
      const staffNotifMsg = `${user.full_name} vient de rejoindre ${club.name}. Pseudo EA FC : ${pseudo.trim()}`;

      try {
        const allUsers = await base44.entities.User.list();
        const staffUsers = allUsers.filter(u => STAFF_ROLES.includes(u.role));
        await Promise.all(staffUsers.map(su =>
          base44.entities.Notification.create({
            user_id: su.id,
            type: 'new_member',
            title: staffNotifTitle,
            message: staffNotifMsg,
            is_read: false,
            link_page: 'StaffRoom'
          })
        ));
      } catch (e) { /* ignore if can't list users */ }

      // Notif de bienvenue pour le manager lui-même
      await base44.entities.Notification.create({
        user_id: user.id,
        club_id: club.id,
        type: 'welcome',
        title: `Bienvenue à ${club.name} !`,
        message: `Votre pseudo EA FC "${pseudo.trim()}" a bien été enregistré. Le staff a été notifié de votre arrivée. Bonne saison !`,
        is_read: false,
        link_page: 'ClubSpace'
      });
    },
    onSuccess: () => {
      setStep('done');
      setTimeout(() => onComplete(), 1500);
    }
  });

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
          <p className="text-white text-xl font-bold">Présentation envoyée !</p>
          <p className="text-slate-400">Chargement de votre espace club...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="max-w-lg w-full">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            {club.logo_url ? (
              <img src={club.logo_url} alt={club.name} className="w-20 h-20 rounded-2xl object-cover shadow-lg shadow-emerald-500/20" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg">
                <Shield className="w-10 h-10 text-white" />
              </div>
            )}
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Bienvenue à {club.name}</h1>
          <p className="text-slate-400">Vous venez d'être nommé manager. Avant de commencer, le staff a besoin de quelques informations.</p>
        </div>

        {step === 'welcome' && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 space-y-6">
            {/* Message de bienvenue style FM */}
            <div className="flex gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                <span className="text-xl">📬</span>
              </div>
              <div>
                <p className="text-emerald-300 font-semibold text-sm mb-1">Message du Staff</p>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Bonjour <span className="text-white font-semibold">{user.full_name}</span> et bienvenue dans la SuperLigue !
                  Pour valider votre arrivée à <span className="text-emerald-400 font-semibold">{club.name}</span>, 
                  nous avons besoin de votre pseudo EA FC afin de vous identifier lors des matchs et des transferts.
                </p>
              </div>
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <p className="text-amber-300 text-sm font-medium mb-1">⚠️ Important</p>
              <p className="text-slate-400 text-sm">
                Sans cette présentation, vous ne pourrez pas accéder à votre espace club ni effectuer de transferts.
                Le staff vérifiera votre pseudo EA avant validation complète.
              </p>
            </div>

            <Button
              onClick={() => setStep('form')}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 text-base font-semibold"
            >
              Faire ma présentation →
            </Button>
          </div>
        )}

        {step === 'form' && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-white font-bold text-lg mb-1 flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-emerald-400" />
                Votre pseudo EA FC
              </h2>
              <p className="text-slate-400 text-sm">C'est le nom que vous utilisez sur EA FC / FIFA. Il sera partagé au staff.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Pseudo EA FC *</label>
              <input
                value={pseudo}
                onChange={e => setPseudo(e.target.value)}
                placeholder="Ex: MonPseudoEAFC"
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-3 text-base focus:outline-none focus:border-emerald-500"
              />
              <p className="text-slate-500 text-xs">Votre identifiant sur EA FC / FIFA utilisé pour les matchs.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Pseudo sur le site *</label>
              <input
                value={sitePseudo}
                onChange={e => setSitePseudo(e.target.value)}
                placeholder="Ex: LeRoi_du_Ballon"
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-3 text-base focus:outline-none focus:border-emerald-500"
              />
              <p className="text-slate-500 text-xs">Votre nom affiché dans la communauté et le chat. Peut être différent de votre vrai nom.</p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('welcome')} className="border-slate-600 text-slate-400">
                Retour
              </Button>
              <Button
                onClick={() => submitMutation.mutate()}
                disabled={!sitePseudo.trim() || submitMutation.isPending}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
              >
                {submitMutation.isPending
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Envoi en cours...</>
                  : '✓ Confirmer ma présentation'
                }
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}