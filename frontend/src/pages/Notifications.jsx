import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Bell, Gavel, ArrowRightLeft, Trophy, Megaphone, 
  CheckCheck, Trash2, Loader2, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from 'framer-motion';

const TYPE_ICON = {
  auction_ended: Gavel,
  transfer_offer: ArrowRightLeft,
  league_event: Trophy,
  announcement: Megaphone,
};

const TYPE_COLOR = {
  auction_ended: 'text-amber-400 bg-amber-400/10',
  transfer_offer: 'text-blue-400 bg-blue-400/10',
  league_event: 'text-emerald-400 bg-emerald-400/10',
  announcement: 'text-purple-400 bg-purple-400/10',
};

const TYPE_LABEL = {
  auction_ended: 'Enchère',
  transfer_offer: 'Transfert',
  league_event: 'Championnat',
  announcement: 'Annonce',
};

const PAGE_LINKS = {
  auction_ended: 'Community',
  transfer_offer: 'MyClub',
  league_event: 'League',
  announcement: 'Community',
};

export default function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications-page', user?.id],
    queryFn: () => base44.entities.Notification.filter({ user_id: user.id }, '-created_date', 100),
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications-page', user?.id] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-page', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications-page', user?.id] }),
  });

  const handleClick = (notif) => {
    if (!notif.is_read) markReadMutation.mutate(notif.id);
    const page = notif.link_page || PAGE_LINKS[notif.type] || 'Home';
    navigate(createPageUrl(page));
  };

  const unread = notifications.filter(n => !n.is_read).length;

  const filtered = filter === 'all' ? notifications : filter === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications.filter(n => n.type === filter);

  if (!user) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-950/80">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-white font-bold text-xl">Notifications</h1>
                <p className="text-slate-400 text-sm">{unread} non lue{unread > 1 ? 's' : ''}</p>
              </div>
            </div>
            {unread > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="border-slate-700 text-slate-400 hover:text-emerald-400"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
              >
                <CheckCheck className="w-4 h-4 mr-1" />
                Tout marquer lu
              </Button>
            )}
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'all', label: 'Tout' },
              { key: 'unread', label: 'Non lues' },
              { key: 'announcement', label: 'Annonces' },
              { key: 'transfer_offer', label: 'Transferts' },
              { key: 'auction_ended', label: 'Enchères' },
              { key: 'league_event', label: 'Championnat' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  filter === f.key
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {f.label}
                {f.key === 'unread' && unread > 0 && (
                  <span className="ml-1.5 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{unread}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">Aucune notification</p>
          </div>
        ) : (
          filtered.map((n, i) => {
            const Icon = TYPE_ICON[n.type] || Bell;
            const colorClass = TYPE_COLOR[n.type] || 'text-slate-400 bg-slate-400/10';
            const label = TYPE_LABEL[n.type] || n.type;
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`flex gap-4 p-4 rounded-2xl border cursor-pointer transition-all hover:border-slate-600 group ${
                  !n.is_read
                    ? 'bg-slate-800/50 border-slate-700'
                    : 'bg-slate-900/30 border-slate-800/50'
                }`}
                onClick={() => handleClick(n)}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={`text-xs px-2 py-0 h-5 ${colorClass} border-0`}>{label}</Badge>
                    {!n.is_read && <span className="w-2 h-2 bg-emerald-400 rounded-full" />}
                    <span className="text-slate-500 text-xs ml-auto">
                      {n.created_date ? formatDistanceToNow(new Date(n.created_date), { addSuffix: true, locale: fr }) : ''}
                    </span>
                  </div>
                  <p className={`font-semibold text-sm mb-0.5 ${n.is_read ? 'text-slate-300' : 'text-white'}`}>{n.title}</p>
                  <p className="text-slate-400 text-sm leading-relaxed">{n.message}</p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <button
                    className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    onClick={e => { e.stopPropagation(); deleteMutation.mutate(n.id); }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors mt-auto" />
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}