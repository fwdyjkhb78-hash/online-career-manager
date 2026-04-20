import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, TrendingUp, Search, ArrowUp } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function OfficializationDevelopmentTab() {
  const [search, setSearch] = useState('');

  const { data: evolutions = [], isLoading } = useQuery({
    queryKey: ['player-evolutions-offic'],
    queryFn: () => base44.entities.PlayerEvolution.list('-created_date', 100),
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const filtered = evolutions.filter(e => {
    const q = search.toLowerCase();
    return !q || e.player_name?.toLowerCase().includes(q) || e.club_name?.toLowerCase().includes(q);
  });

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-violet-500 animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 p-4 bg-violet-500/10 border border-violet-500/20 rounded-2xl">
        <TrendingUp className="w-6 h-6 text-violet-400 shrink-0" />
        <div>
          <p className="text-violet-300 font-semibold">Évolutions de joueurs</p>
          <p className="text-slate-400 text-sm">{evolutions.length} évolution{evolutions.length > 1 ? 's' : ''} enregistrée{evolutions.length > 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un joueur, un club..."
          className="pl-9 bg-slate-800 border-slate-700 text-white"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{search ? 'Aucun résultat.' : 'Aucune évolution enregistrée pour le moment.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((evo) => (
            <motion.div
              key={evo.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800/60 border border-violet-500/20 rounded-2xl p-4 flex items-center gap-4"
            >
              {evo.player_image_url ? (
                <img src={evo.player_image_url} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-violet-500/20 border border-violet-500/20 flex items-center justify-center shrink-0">
                  <span className="text-white font-bold text-lg">{evo.player_name?.charAt(0)}</span>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white font-bold">{evo.player_name}</p>
                  {evo.player_position && <Badge className="bg-slate-700 text-slate-300 text-xs">{evo.player_position}</Badge>}
                </div>
                <p className="text-slate-400 text-sm mt-0.5">
                  <span className="text-violet-400 font-medium">{evo.club_name || 'Club inconnu'}</span>
                </p>
                <p className="text-slate-600 text-xs mt-0.5">
                  {evo.created_date ? formatDistanceToNow(new Date(evo.created_date), { addSuffix: true, locale: fr }) : ''}
                </p>
              </div>

              <div className="shrink-0 text-right flex flex-col items-end gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-lg font-bold">{evo.overall_before}</span>
                  <ArrowUp className="w-4 h-4 text-violet-400" />
                  <span className="text-violet-300 text-xl font-bold">{evo.overall_after}</span>
                </div>
                <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-xs">
                  +{evo.overall_after - evo.overall_before} OVR ✓
                </Badge>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}