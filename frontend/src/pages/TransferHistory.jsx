import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowRightLeft, Search, TrendingUp, Euro, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const formatPrice = (p) => {
  if (!p) return '—';
  if (p >= 1e9) return `${(p / 1e9).toFixed(2)}Md€`;
  if (p >= 1e6) return `${(p / 1e6).toFixed(2)}M€`;
  return `${(p / 1000).toFixed(0)}K€`;
};

export default function TransferHistory() {
  const [search, setSearch] = useState('');

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ['completed-transfers'],
    queryFn: async () => {
      const all = await base44.entities.Transfer.list('-updated_date', 200);
      return all.filter(t => t.status === 'completed');
    },
  });

  const filtered = transfers.filter(t =>
    t.player_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.from_club_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.to_club_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalVolume = filtered.reduce((sum, t) => sum + (t.amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
            <ArrowRightLeft className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Historique des Transferts</h1>
            <p className="text-slate-400">Tous les transferts officialisés</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-2xl font-bold text-white">{filtered.length}</p>
              <p className="text-slate-400 text-sm">transferts</p>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
            <Euro className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-2xl font-bold text-white">{formatPrice(totalVolume)}</p>
              <p className="text-slate-400 text-sm">volume total</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un joueur, un club..."
            className="bg-slate-900 border-slate-700 text-white pl-10"
          />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="text-center py-16 text-slate-400">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <ArrowRightLeft className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Aucun transfert trouvé</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((t, i) => (
              <div
                key={t.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                {/* Index */}
                <span className="text-slate-600 text-sm font-mono w-6 shrink-0">#{i + 1}</span>

                {/* Player */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold truncate">{t.player_name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap text-sm">
                    <span className="text-red-400 font-medium">{t.from_club_name}</span>
                    <ArrowRightLeft className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="text-emerald-400 font-medium">{t.to_club_name}</span>
                  </div>
                </div>

                {/* Amount & Date */}
                <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1 shrink-0">
                  <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-base font-bold px-3 py-1">
                    {formatPrice(t.amount)}
                  </Badge>
                  <div className="flex items-center gap-1 text-slate-500 text-xs">
                    <Calendar className="w-3 h-3" />
                    {new Date(t.updated_date).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}