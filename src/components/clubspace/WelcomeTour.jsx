import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, ArrowRightLeft, Wallet, Calendar, Swords, TrendingUp, Bell, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const sections = [
  {
    icon: Users,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    title: 'Effectif',
    desc: 'Gérez vos joueurs, consultez les stats et composez votre équipe.',
    page: 'ClubSpace',
    tab: 'squad',
  },
  {
    icon: ArrowRightLeft,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    title: 'Transferts',
    desc: 'Achetez, vendez, prêtez des joueurs et participez aux enchères.',
    page: 'TransferMarket',
  },
  {
    icon: Wallet,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    title: 'Finances',
    desc: 'Suivez votre budget, les mouvements financiers et les dépenses.',
    page: 'ClubSpace',
    tab: 'finances',
  },
  {
    icon: Calendar,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    title: 'Matchs',
    desc: 'Saisissez vos résultats et suivez l\'avancement du championnat.',
    page: 'ClubSpace',
    tab: 'matches',
  },
  {
    icon: Swords,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    title: 'Formation',
    desc: 'Créez et configurez vos tactiques et dispositions sur le terrain.',
    page: 'Tactics',
  },
  {
    icon: TrendingUp,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    title: 'Évolution',
    desc: 'Faites progresser vos joueurs et améliorez leurs statistiques.',
    page: 'ClubSpace',
    tab: 'evolution',
  },
  {
    icon: Bell,
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
    title: 'Notifications',
    desc: 'Recevez les alertes mercato, offres reçues et annonces du staff.',
    page: 'Notifications',
  },
];

export default function WelcomeTour({ clubName, onClose }) {
  const [step, setStep] = useState(0); // 0 = welcome, 1 = tour

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        >
          {step === 0 ? (
            <div className="p-8 text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-emerald-400" />
                </div>
              </div>
              <div>
                <h2 className="text-white text-2xl font-bold mb-2">Bienvenue dans la SuperLigue ! 🎉</h2>
                <p className="text-slate-400 text-base">
                  Votre profil est configuré. Découvrez maintenant toutes les sections disponibles pour gérer{' '}
                  <span className="text-emerald-400 font-semibold">{clubName}</span>.
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="border-slate-600 text-slate-400 hover:bg-slate-800"
                >
                  Passer
                </Button>
                <Button
                  onClick={() => setStep(1)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold gap-2"
                >
                  Découvrir les sections <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-white text-xl font-bold">Vos pages disponibles</h2>
                  <p className="text-slate-400 text-sm mt-0.5">Cliquez sur une section pour l'explorer</p>
                </div>
                <button
                  onClick={onClose}
                  className="text-slate-500 hover:text-white transition-colors p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sections.map((s) => {
                  const Icon = s.icon;
                  const url = createPageUrl(s.page) + (s.tab ? `?tab=${s.tab}` : '');
                  return (
                    <Link key={s.title} to={url} onClick={onClose}>
                      <div className={`flex items-start gap-3 p-4 rounded-xl border ${s.bg} ${s.border} hover:brightness-110 transition-all cursor-pointer`}>
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${s.bg}`}>
                          <Icon className={`w-5 h-5 ${s.color}`} />
                        </div>
                        <div>
                          <p className={`font-semibold text-sm ${s.color}`}>{s.title}</p>
                          <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{s.desc}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600 ml-auto mt-1 flex-shrink-0" />
                      </div>
                    </Link>
                  );
                })}
              </div>

              <Button
                onClick={onClose}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold mt-2"
              >
                C'est parti ! 🚀
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}