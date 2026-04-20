import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Lock, Unlock, ShoppingCart } from 'lucide-react';

export default function MercatoStatusBanner() {
  const { data: windows = [] } = useQuery({
    queryKey: ['mercato-window'],
    queryFn: () => base44.entities.MercatoWindow.list('-created_date', 1),
    refetchInterval: 30000,
  });

  const currentWindow = windows[0] || null;
  const isOpen = currentWindow?.is_open === true;

  if (!currentWindow) return null;

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold ${
      isOpen
        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
        : 'bg-red-500/10 border-red-500/30 text-red-300'
    }`}>
      <span className={`w-2 h-2 rounded-full shrink-0 ${isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
      {isOpen ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
      <span>Mercato {isOpen ? 'Ouvert' : 'Fermé'}</span>
      {!isOpen && (
        <span className="text-xs font-normal opacity-70 ml-1">· Les enchères seront mises en attente</span>
      )}
    </div>
  );
}