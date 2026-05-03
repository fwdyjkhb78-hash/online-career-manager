import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bell, Gavel, ArrowRightLeft, Trophy, X, CheckCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const TYPE_CONFIG = {
  auction_ended: { icon: Gavel, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  transfer_offer: { icon: ArrowRightLeft, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  league_event: { icon: Trophy, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
};

export default function NotificationCenter({ userId }) {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => base44.entities.Notification.filter({ user_id: userId }, '-created_date', 50),
    enabled: !!userId,
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>;

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-bold text-white">Notifications</h2>
          {unreadCount > 0 && (
            <Badge className="bg-red-500 text-white">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-emerald-400"
            onClick={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending}>
            <CheckCheck className="w-4 h-4 mr-1" />Tout marquer comme lu
          </Button>
        )}
      </div>

      {/* List */}
      {notifications.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucune notification pour le moment</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-700/50">
          {notifications.map(n => {
            const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.league_event;
            const Icon = cfg.icon;
            return (
              <div key={n.id}
                className={`flex gap-4 px-6 py-4 transition-colors ${!n.is_read ? 'bg-slate-700/20' : ''}`}>
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${cfg.bg}`}>
                  <Icon className={`w-5 h-5 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`font-semibold text-sm ${n.is_read ? 'text-slate-300' : 'text-white'}`}>{n.title}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      {!n.is_read && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-500 hover:text-emerald-400"
                          onClick={() => markReadMutation.mutate(n.id)}>
                          <CheckCheck className="w-3 h-3" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-500 hover:text-red-400"
                        onClick={() => deleteMutation.mutate(n.id)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm mt-0.5">{n.message}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-slate-600 text-xs">
                      {n.created_date ? formatDistanceToNow(new Date(n.created_date), { addSuffix: true, locale: fr }) : ''}
                    </p>
                    {n.link_page && (
                      <Link to={createPageUrl(n.link_page)} className="text-emerald-400 text-xs hover:underline"
                        onClick={() => markReadMutation.mutate(n.id)}>
                        Voir →
                      </Link>
                    )}
                  </div>
                </div>
                {!n.is_read && <span className="w-2 h-2 bg-emerald-400 rounded-full shrink-0 mt-2" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}