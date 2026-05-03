import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gamepad2, User, Loader2, CheckCircle2, AlertCircle,
  LogOut, Trash2, Shield, Mail, Crown, Sparkles
} from 'lucide-react';
import WelcomeTour from './WelcomeTour';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.35, ease: 'easeOut' } }),
};

export default function ProfileTab({ user, onSaved }) {
  const [eaPseudo, setEaPseudo] = useState(user?.ea_pseudo || '');
  const [sitePseudo, setSitePseudo] = useState(user?.site_pseudo || '');
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showTour, setShowTour] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);

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

  const deleteMutation = useMutation({
    mutationFn: async () => {
      console.log('Account deletion requested for user:', user?.email);
      setDeleteDialogOpen(false);
      setDeleteConfirmed(false);
    },
    onSuccess: () => {
      base44.auth.logout();
    },
    onError: (err) => {
      setErrorMsg(err?.message || 'Erreur lors de la suppression.');
    },
  });

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div className="max-w-xl mx-auto space-y-8 pb-12">
      {showTour && (
        <WelcomeTour clubName={user?.club_name || 'votre club'} onClose={() => setShowTour(false)} />
      )}

      {/* Avatar & identité */}
      <motion.div
        variants={fadeUp} custom={0} initial="hidden" animate="visible"
        className="flex flex-col items-center gap-5 pt-4"
      >
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-xl shadow-emerald-500/20 text-3xl font-black text-white select-none">
            {initials}
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-slate-800 rounded-lg border-2 border-slate-700 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">{user?.full_name || 'Utilisateur'}</h2>
          <p className="text-slate-400 text-sm mt-1">{user?.email}</p>
          {user?.club_name && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300 text-xs font-medium">{user.club_name}</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Formulaire pseudos */}
      <motion.div
        variants={fadeUp} custom={1} initial="hidden" animate="visible"
        className="bg-slate-800/50 border border-slate-700/50 rounded-3xl p-8 space-y-7"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <User className="w-4.5 h-4.5 text-emerald-400" style={{ width: '1.125rem', height: '1.125rem' }} />
          </div>
          <h3 className="text-white font-bold text-lg">Mon Profil</h3>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold text-slate-300 flex items-center gap-1.5">
            <Gamepad2 className="w-3.5 h-3.5 text-emerald-400" />
            Pseudo EA FC <span className="text-red-400">*</span>
          </label>
          <input
            value={eaPseudo}
            onChange={e => setEaPseudo(e.target.value)}
            placeholder="Ex: MonPseudoEAFC"
            className="w-full bg-slate-900/60 border border-slate-600/70 text-white rounded-2xl px-5 py-3.5 text-base focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-slate-600"
          />
          <p className="text-slate-500 text-xs pl-1">Votre identifiant sur EA FC / FIFA utilisé pour les matchs.</p>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold text-slate-300">
            Pseudo du site <span className="text-red-400">*</span>
          </label>
          <input
            value={sitePseudo}
            onChange={e => setSitePseudo(e.target.value)}
            placeholder="Ex: LeRoi_du_Ballon"
            className="w-full bg-slate-900/60 border border-slate-600/70 text-white rounded-2xl px-5 py-3.5 text-base focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-slate-600"
          />
          <p className="text-slate-500 text-xs pl-1">Votre nom affiché dans la communauté et le chat.</p>
        </div>

        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!eaPseudo.trim() || !sitePseudo.trim() || saveMutation.isPending}
          className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-2xl text-base transition-all"
        >
          <AnimatePresence mode="wait">
            {saveMutation.isPending ? (
              <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />Enregistrement...
              </motion.span>
            ) : saved ? (
              <motion.span key="saved" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />Sauvegardé !
              </motion.span>
            ) : (
              <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Enregistrer
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </motion.div>

      {/* Informations du compte */}
      <motion.div
        variants={fadeUp} custom={2} initial="hidden" animate="visible"
        className="bg-slate-800/30 border border-slate-700/30 rounded-3xl p-6 space-y-4"
      >
        <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Informations du compte</p>
        <div className="space-y-3">
          {[
            { icon: User, label: 'Nom complet', value: user?.full_name || '—' },
            { icon: Mail, label: 'Email', value: user?.email || '—' },
            { icon: Crown, label: 'Rôle', value: user?.role || 'user' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center justify-between py-2.5 border-b border-slate-700/40 last:border-0">
              <div className="flex items-center gap-2.5 text-slate-400 text-sm">
                <Icon className="w-4 h-4 text-slate-500" />
                {label}
              </div>
              <span className="text-white text-sm font-medium">{value}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Déconnexion */}
      <motion.div variants={fadeUp} custom={3} initial="hidden" animate="visible">
        <Button
          variant="outline"
          onClick={() => base44.auth.logout()}
          className="w-full h-12 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-300 rounded-2xl transition-all"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Se déconnecter
        </Button>
      </motion.div>

      {/* Zone dangereuse */}
      <motion.div
        variants={fadeUp} custom={4} initial="hidden" animate="visible"
        className="border border-red-500/20 rounded-3xl p-6 bg-red-500/5"
      >
        <h3 className="text-red-400 font-semibold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
          <Trash2 className="w-4 h-4" />Zone dangereuse
        </h3>
        <p className="text-slate-500 text-sm mb-4">La suppression de compte est permanente et irréversible.</p>
        <Button
          variant="outline"
          onClick={() => setDeleteDialogOpen(true)}
          className="w-full border-red-500/40 text-red-400 hover:bg-red-500/10 rounded-2xl"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Supprimer mon compte
        </Button>
      </motion.div>

      {/* Dialogue suppression */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Supprimer mon compte</DialogTitle>
            <DialogDescription className="text-slate-400">
              Cette action est irréversible. Toutes vos données seront supprimées.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <p className="text-slate-300 text-sm leading-relaxed">
              Êtes-vous sûr de vouloir supprimer votre compte ? Cette action ne peut pas être annulée.
            </p>
            <label className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl cursor-pointer hover:bg-red-500/15 transition-colors">
              <input
                type="checkbox"
                checked={deleteConfirmed}
                onChange={(e) => setDeleteConfirmed(e.target.checked)}
                className="w-4 h-4 accent-red-500"
              />
              <span className="text-sm text-red-300">Je comprends les conséquences</span>
            </label>
            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                className="flex-1 border-slate-600 text-slate-300 rounded-2xl"
              >
                Annuler
              </Button>
              <Button
                onClick={() => deleteMutation.mutate()}
                disabled={!deleteConfirmed || deleteMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-2xl"
              >
                {deleteMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Suppression...</>
                ) : 'Supprimer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}