import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Gavel, ArrowRightLeft, Trophy, Megaphone,
  CheckCheck, Trash2, ChevronRight, PartyPopper, UserPlus, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const TYPE_CONFIG = {
  welcome:       { icon: PartyPopper,     color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30', label: 'Bienvenue',    dot: 'bg-emerald-400' },
  new_member:    { icon: UserPlus,        color: 'text-cyan-400',    bg: 'bg-cyan-500/15 border-cyan-500/30',       label: 'Nouveau membre', dot: 'bg-cyan-400' },
  auction_ended: { icon: Gavel,           color: 'text-amber-400',   bg: 'bg-amber-500/15 border-amber-500/30',    label: 'Enchère',      dot: 'bg-amber-400' },
  transfer_offer:{ icon: ArrowRightLeft,  color: 'text-blue-400',    bg: 'bg-blue-500/15 border-blue-500/30',      label: 'Transfert',    dot: 'bg-blue-400' },
  league_event:  { icon: Trophy,          color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30',label: 'Championnat',  dot: 'bg-emerald-400' },
  announcement:  { icon: Megaphone,       color: 'text-purple-400',  bg: 'bg-purple-500/15 border-purple-500/30',  label: 'Annonce',      dot: 'bg-purple-400' },
};

const CATEGORIES = [
  { key: 'all',            label: 'Tous',        icon: Bell },
  { key: 'unread',         label: 'Non lus',     icon: Bell },
  { key: 'welcome',        label: 'Bienvenue',   icon: PartyPopper },
  { key: 'new_member',     label: 'Membres',     icon: UserPlus },
  { key: 'transfer_offer', label: 'Transferts',  icon: ArrowRightLeft },
  { key: 'auction_ended',  label: 'Enchères',    icon: Gavel },
  { key: 'league_event',   label: 'Championnat', icon: Trophy },
  { key: 'announcement',   label: 'Annonces',    icon: Megaphone },
];

export default function InboxPanel({ userId }) {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState(null);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => base44.entities.Notification.filter({ user_id: userId }, '-created_date', 100),
    enabled: !!userId,
    refetchInterval: 20000,
  });

  const markRead = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
  });

  const deleteNotif = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
      if (selected?.id === id) setSelected(null);
    }
  });

  const handleSelect = (n) => {
    setSelected(n);
    if (!n.is_read) markRead.mutate(n.id);
  };

  const filtered = notifications.filter(n => {
    if (category === 'all') return true;
    if (category === 'unread') return !n.is_read;
    return n.type === category;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const countByType = (key) => {
    if (key === 'unread') return notifications.filter(n => !n.is_read).length;
    if (key === 'all') return notifications.filter(n => !n.is_read).length;
    return notifications.filter(n => n.type === key && !n.is_read).length;
  };

  return (
    <div className="bg-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden flex flex-col md:flex-row" style={{ minHeight: '500px' }}>

      {/* Left sidebar — categories */}
      <div className="w-full md:w-52 border-b md:border-b-0 md:border-r border-slate-700/50 bg-slate-950/40 flex-shrink-0">
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-400" />
              Boîte de réception
            </h2>
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white text-xs px-1.5 py-0">{unreadCount}</Badge>
            )}
          </div>
        </div>

        <nav className="p-2 space-y-0.5">
          {CATEGORIES.map(cat => {
            const count = countByType(cat.key);
            const isActive = category === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2">
                  <cat.icon className="w-3.5 h-3.5" />
                  {cat.label}
                </span>
                {count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'
                  }`}>{count}</span>
                )}
              </button>
            );
          })}
        </nav>

        {unreadCount > 0 && (
          <div className="p-3 border-t border-slate-700/50 mt-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-slate-400 hover:text-emerald-400 text-xs"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="w-3 h-3 mr-1" />
              Tout marquer lu
            </Button>
          </div>
        )}
      </div>

      {/* Middle — list */}
      <div className="flex-1 flex flex-col md:flex-row min-w-0">
        <div className="w-full md:w-72 flex-shrink-0 border-b md:border-b-0 md:border-r border-slate-700/50 overflow-y-auto" style={{ maxHeight: '600px' }}>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Bell className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Aucun message ici</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/30">
              {filtered.map(n => {
                const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.league_event;
                const Icon = cfg.icon;
                const isActive = selected?.id === n.id;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleSelect(n)}
                    className={`w-full text-left px-4 py-3 transition-all hover:bg-slate-800/50 ${
                      isActive ? 'bg-slate-800 border-l-2 border-emerald-500' : ''
                    } ${!n.is_read ? 'bg-slate-800/20' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg}`}>
                        <Icon className={`w-4 h-4 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {!n.is_read && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />}
                          <p className={`text-xs font-bold truncate ${n.is_read ? 'text-slate-400' : 'text-white'}`}>{n.title}</p>
                        </div>
                        <p className="text-slate-500 text-xs truncate">{n.message}</p>
                        <p className="text-slate-600 text-xs mt-1">
                          {n.created_date ? formatDistanceToNow(new Date(n.created_date), { addSuffix: true, locale: fr }) : ''}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right — detail */}
        <div className="flex-1 p-6 min-w-0">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col"
              >
                {(() => {
                  const cfg = TYPE_CONFIG[selected.type] || TYPE_CONFIG.league_event;
                  const Icon = cfg.icon;
                  return (
                    <>
                      {/* Detail header */}
                      <div className="flex items-start justify-between gap-4 mb-6 pb-5 border-b border-slate-700/50">
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${cfg.bg}`}>
                            <Icon className={`w-6 h-6 ${cfg.color}`} />
                          </div>
                          <div>
                            <Badge className={`text-xs mb-2 ${cfg.bg} ${cfg.color} border-0`}>{cfg.label}</Badge>
                            <h3 className="text-white font-bold text-lg leading-tight">{selected.title}</h3>
                            <p className="text-slate-500 text-xs mt-1">
                              {selected.created_date ? formatDistanceToNow(new Date(selected.created_date), { addSuffix: true, locale: fr }) : ''}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteNotif.mutate(selected.id)}
                          className="text-slate-600 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-all shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Message body */}
                      <div className="flex-1">
                        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{selected.message}</p>
                      </div>

                      {/* Footer action */}
                      {selected.link_page && (
                        <div className="mt-6 pt-4 border-t border-slate-700/50">
                          <Link to={createPageUrl(selected.link_page)}>
                            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
                              Voir la page <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      )}
                    </>
                  );
                })()}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center text-center py-16"
              >
                <Bell className="w-14 h-14 text-slate-700 mb-4" />
                <p className="text-slate-500 font-medium">Sélectionnez un message</p>
                <p className="text-slate-600 text-sm mt-1">Cliquez sur une notification pour la lire</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}