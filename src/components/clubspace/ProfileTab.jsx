import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Gamepad2, User, Loader2, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';
import WelcomeTour from './WelcomeTour';
import { Button } from '@/components/ui/button';

export default function ProfileTab({ user, onSaved }) {
  const [eaPseudo, setEaPseudo] = useState(user?.ea_pseudo || '');
  const [sitePseudo, setSitePseudo] = useState(user?.site_pseudo || '');
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showTour, setShowTour] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg('');
      await base44.auth.updateMe({
        ea_pseudo: eaPseudo.trim(),
        site_pseudo: sitePseudo.trim(),
        intro_submitted: true,
      });
    },
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      if (!user?.intro_submitted) setShowTour(true);
      if (onSaved) onSaved();
    },
    onError: (err) => {
      setErrorMsg(err?.message || 'Une erreur est survenue. Réessayez.');
    },
  });

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {showTour && (
        <WelcomeTour clubName={user?.club_name || 'votre club'} onClose={() => setShowTour(false)} />
      )}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <User className="w-5 h-5 text-emerald-400" />
          <h2 className="text-white font-bold text-lg">Mon Profil</h2>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
            <Gamepad2 className="w-4 h-4 text-emerald-400" />
            Pseudo EA FC *
          </label>
          <input
            value={eaPseudo}
            onChange={e => setEaPseudo(e.target.value)}
            placeholder="Ex: MonPseudoEAFC"
            className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-3 text-base focus:outline-none focus:border-emerald-500"
          />
          <p className="text-slate-500 text-xs">Votre identifiant sur EA FC / FIFA utilisé pour les matchs.</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">
            Pseudo du site *
          </label>
          <input
            value={sitePseudo}
            onChange={e => setSitePseudo(e.target.value)}
            placeholder="Ex: LeRoi_du_Ballon"
            className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-3 text-base focus:outline-none focus:border-emerald-500"
          />
          <p className="text-slate-500 text-xs">Votre nom affiché dans la communauté et le chat.</p>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {errorMsg}
          </div>
        )}

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!eaPseudo.trim() || !sitePseudo.trim() || saveMutation.isPending}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
        >
          {saveMutation.isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enregistrement...</>
          ) : saved ? (
            <><CheckCircle2 className="w-4 h-4 mr-2" />Sauvegardé !</>
          ) : (
            'Enregistrer'
          )}
        </Button>
      </div>

      <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-4">
        <p className="text-slate-400 text-sm font-medium mb-2">Informations du compte</p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Nom complet</span>
            <span className="text-white">{user?.full_name || '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Email</span>
            <span className="text-white">{user?.email || '—'}</span>
          </div>
        </div>
      </div>

      <Button
        variant="outline"
        onClick={() => base44.auth.logout()}
        className="w-full border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300"
      >
        <LogOut className="w-4 h-4 mr-2" />
        Se déconnecter
      </Button>
    </div>
  );
}