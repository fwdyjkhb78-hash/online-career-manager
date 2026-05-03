import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings as SettingsIcon, Camera, User, Bell, Loader2,
  CheckCircle2, AlertCircle, LogOut, Mail, Crown, Shield,
  BellOff, BellRing, Sparkles, Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.35, ease: 'easeOut' } }),
};

const NOTIF_PREFS = [
  { key: 'notif_transfers', label: 'Offres de transfert', desc: 'Nouvelles offres reçues sur vos joueurs', icon: '💸' },
  { key: 'notif_auctions', label: 'Enchères', desc: 'Surenchères et fin d\'enchères', icon: '🔨' },
  { key: 'notif_messages', label: 'Messages du staff', desc: 'Annonces et communications officielles', icon: '📢' },
  { key: 'notif_matches', label: 'Résultats de matchs', desc: 'Confirmation des scores soumis', icon: '⚽' },
  { key: 'notif_mercato', label: 'Ouverture mercato', desc: 'Ouverture et fermeture du mercato', icon: '🏪' },
  { key: 'notif_awards', label: 'Récompenses & trophées', desc: 'TOTW, TOTY, Ballon d\'Or...', icon: '🏆' },
];

export default function Settings() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState({});
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const u = await base44.auth.me();
        setUser(u);
        setAvatarUrl(u.avatar_url || '');
        // Initialiser les préférences (true par défaut si non défini)
        const prefs = {};
        NOTIF_PREFS.forEach(({ key }) => {
          prefs[key] = u[key] !== false;
        });
        setNotifPrefs(prefs);
      } catch {
        base44.auth.redirectToLogin();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await base44.auth.updateMe({ ...notifPrefs, avatar_url: avatarUrl });
    },
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      toast.success('Paramètres sauvegardés !');
    },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  });

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setAvatarUrl(file_url);
      await base44.auth.updateMe({ avatar_url: file_url });
      setUser(prev => ({ ...prev, avatar_url: file_url }));
      toast.success('Photo de profil mise à jour !');
    } catch {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setAvatarUploading(false);
    }
  };

  const toggleNotif = (key) => {
    setNotifPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div variants={fadeUp} custom={0} initial="hidden" animate="visible" className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <SettingsIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Paramètres</h1>
            <p className="text-slate-400 text-sm">Photo de profil & notifications</p>
          </div>
        </motion.div>

        <div className="space-y-6">
          {/* Photo de profil */}
          <motion.div variants={fadeUp} custom={1} initial="hidden" animate="visible"
            className="bg-slate-800/50 border border-slate-700/50 rounded-3xl p-8"
          >
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <Camera className="w-4.5 h-4.5 text-emerald-400" style={{ width: '1.125rem', height: '1.125rem' }} />
              </div>
              <h3 className="text-white font-bold text-lg">Photo de profil</h3>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-8">
              {/* Avatar */}
              <div className="relative group">
                <div className="w-28 h-28 rounded-3xl overflow-hidden shadow-xl shadow-black/30 border-2 border-slate-700">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-3xl font-black text-white select-none">
                      {initials}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute inset-0 rounded-3xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  {avatarUploading
                    ? <Loader2 className="w-7 h-7 text-white animate-spin" />
                    : <Camera className="w-7 h-7 text-white" />}
                </button>
              </div>

              <div className="flex-1 space-y-3 text-center sm:text-left">
                <p className="text-slate-300 text-sm">Choisissez une photo qui vous représente dans la communauté OCM.</p>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  variant="outline"
                  className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 rounded-2xl"
                >
                  {avatarUploading
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Upload...</>
                    : <><Upload className="w-4 h-4 mr-2" />Changer la photo</>}
                </Button>
                {avatarUrl && (
                  <button
                    onClick={() => setAvatarUrl('')}
                    className="block text-slate-500 text-xs hover:text-red-400 transition-colors"
                  >
                    Supprimer la photo
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Préférences de notifications */}
          <motion.div variants={fadeUp} custom={2} initial="hidden" animate="visible"
            className="bg-slate-800/50 border border-slate-700/50 rounded-3xl p-8"
          >
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
                <Bell className="w-4.5 h-4.5 text-blue-400" style={{ width: '1.125rem', height: '1.125rem' }} />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Notifications</h3>
                <p className="text-slate-400 text-xs">Choisissez ce que vous souhaitez recevoir</p>
              </div>
            </div>

            <div className="space-y-3">
              {NOTIF_PREFS.map(({ key, label, desc, icon }) => {
                const enabled = notifPrefs[key] !== false;
                return (
                  <button
                    key={key}
                    onClick={() => toggleNotif(key)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left
                      ${enabled
                        ? 'border-emerald-500/30 bg-emerald-500/8 hover:bg-emerald-500/12'
                        : 'border-slate-700/50 bg-slate-900/30 hover:bg-slate-800/50'}`}
                  >
                    <span className="text-2xl select-none">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm ${enabled ? 'text-white' : 'text-slate-400'}`}>{label}</p>
                      <p className="text-slate-500 text-xs mt-0.5 truncate">{desc}</p>
                    </div>
                    <div className={`relative w-12 h-6 rounded-full transition-all shrink-0 ${enabled ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${enabled ? 'left-6' : 'left-0.5'}`} />
                    </div>
                  </button>
                );
              })}
            </div>

            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-2xl text-base mt-6 transition-all"
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
                    Sauvegarder les préférences
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </motion.div>

          {/* Infos compte (lecture seule) */}
          <motion.div variants={fadeUp} custom={3} initial="hidden" animate="visible"
            className="bg-slate-800/30 border border-slate-700/30 rounded-3xl p-6 space-y-3"
          >
            <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-4">Informations du compte</p>
            {[
              { icon: User, label: 'Nom', value: user?.full_name || '—' },
              { icon: Mail, label: 'Email', value: user?.email || '—' },
              { icon: Crown, label: 'Rôle', value: user?.role || 'user' },
              user?.club_name && { icon: Shield, label: 'Club', value: user.club_name },
            ].filter(Boolean).map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center justify-between py-2.5 border-b border-slate-700/40 last:border-0">
                <div className="flex items-center gap-2.5 text-slate-400 text-sm">
                  <Icon className="w-4 h-4 text-slate-500" />
                  {label}
                </div>
                <span className="text-white text-sm font-medium">{value}</span>
              </div>
            ))}
          </motion.div>

          {/* Déconnexion */}
          <motion.div variants={fadeUp} custom={4} initial="hidden" animate="visible">
            <Button
              variant="outline"
              onClick={() => base44.auth.logout()}
              className="w-full h-12 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 rounded-2xl transition-all"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Se déconnecter
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}