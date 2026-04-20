import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bell, X, Gavel, ArrowRightLeft, Trophy, CheckCheck, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AnimatePresence, motion } from 'framer-motion';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const TYPE_ICON = {
  auction_ended: Gavel,
  transfer_offer: ArrowRightLeft,
  league_event: Trophy,
  announcement: Megaphone,
};

const TYPE_COLOR = {
  auction_ended: 'text-amber-400',
  transfer_offer: 'text-blue-400',
  league_event: 'text-emerald-400',
  announcement: 'text-purple-400',
};

export default function NotificationBell({ userId }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => base44.entities.Notification.filter({ user_id: userId }, '-created_date', 50),
    enabled: !!userId,
    refetchInterval: 30000,
  });

  const unread = notifications.filter(n => !n.is_read).length;

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unreadOnes = notifications.filter(n => !n.is_read);
      await Promise.all(unreadOnes.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
  });

  // Fermer si clic en dehors
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleClick = (notif) => {
    markReadMutation.mutate(notif.id);
    if (notif.link_page) navigate(createPageUrl(notif.link_page));
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        className="relative text-slate-400 hover:text-white"
        onClick={() => setOpen(!open)}
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-400" />
                <span className="text-white font-semibold text-sm">Notifications</span>
                {unread > 0 && <Badge className="bg-red-500 text-white text-xs h-5 px-1.5">{unread}</Badge>}
              </div>
              {unread > 0 && (
                <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-emerald-400 h-6 px-2"
                  onClick={() => markAllReadMutation.mutate()}>
                  <CheckCheck className="w-3 h-3 mr-1" />Tout lire
                </Button>
              )}
            </div>

            {/* Voir tout */}
            <div className="px-4 py-2 border-b border-slate-800">
              <button
                className="w-full text-xs text-slate-400 hover:text-emerald-400 transition-colors flex items-center justify-center gap-1"
                onClick={() => { setOpen(false); navigate(createPageUrl('Notifications')); }}
              >
                Voir toutes les notifications →
              </button>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucune notification</p>
                </div>
              ) : (
                notifications.map(n => {
                  const Icon = TYPE_ICON[n.type] || Bell;
                  const color = TYPE_COLOR[n.type] || 'text-slate-400';
                  return (
                    <div key={n.id}
                      className={`flex gap-3 px-4 py-3 border-b border-slate-800/60 cursor-pointer transition-colors hover:bg-slate-800/50 ${!n.is_read ? 'bg-slate-800/30' : ''}`}
                      onClick={() => handleClick(n)}>
                      <div className={`w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 mt-0.5 ${color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <p className={`text-sm font-medium leading-tight ${n.is_read ? 'text-slate-300' : 'text-white'}`}>{n.title}</p>
                          <button className="text-slate-600 hover:text-red-400 shrink-0 ml-1"
                            onClick={e => { e.stopPropagation(); deleteMutation.mutate(n.id); }}>
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-slate-500 text-xs mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-slate-600 text-xs mt-1">
                          {n.created_date ? formatDistanceToNow(new Date(n.created_date), { addSuffix: true, locale: fr }) : ''}
                        </p>
                      </div>
                      {!n.is_read && <span className="w-2 h-2 bg-emerald-400 rounded-full shrink-0 mt-2" />}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}