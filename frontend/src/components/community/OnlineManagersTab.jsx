import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';

export default function OnlineManagersTab() {
  const { data: users = [] } = useQuery({
    queryKey: ['online-managers'],
    queryFn: () => base44.entities.User.list(),
    refetchInterval: 30000,
  });

  const managers = users.filter(u => u.has_selected_club || u.club_id);

  const isOnline = (u) => {
    if (!u.last_seen) return false;
    return new Date() - new Date(u.last_seen) < 5 * 60 * 1000;
  };

  const online = managers.filter(isOnline);
  const offline = managers.filter(u => !isOnline(u));

  const ManagerRow = ({ u }) => (
    <div className="flex items-center gap-3 p-3 bg-slate-800/60 rounded-xl">
      <div className="relative shrink-0">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
          {(u.site_pseudo || u.full_name)?.charAt(0)?.toUpperCase()}
        </div>
        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${isOnline(u) ? 'bg-emerald-400' : 'bg-slate-600'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{u.site_pseudo || u.full_name}</p>
        <p className="text-slate-500 text-xs truncate">{u.club_name || '—'}</p>
      </div>
      {isOnline(u) && (
        <span className="text-xs text-emerald-400 font-medium">En ligne</span>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-emerald-400 font-semibold text-sm mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
          En ligne ({online.length})
        </h3>
        {online.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">Aucun manager en ligne</p>
        ) : (
          <div className="space-y-2">
            {online.map(u => <ManagerRow key={u.id} u={u} />)}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-slate-500 font-semibold text-sm mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-600 inline-block" />
          Hors ligne ({offline.length})
        </h3>
        <div className="space-y-2">
          {offline.map(u => <ManagerRow key={u.id} u={u} />)}
        </div>
      </div>
    </div>
  );
}