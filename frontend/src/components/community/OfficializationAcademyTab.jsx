import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, GraduationCap, Search } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import { fetchAll } from '@/utils/fetchAll';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const POSITIONS = { GK: '🥅', CB: '🛡️', LB: '🛡️', RB: '🛡️', CDM: '⚙️', CM: '⚙️', CAM: '✨', LW: '⚡', RW: '⚡', ST: '🔥' };

export default function OfficializationAcademyTab() {
  const [search, setSearch] = useState('');

  const { data: players = [], isLoading } = useQuery({
    queryKey: ['offic-academy-players'],
    queryFn: () => base44.entities.AcademyPlayer.list('-created_date', 5000),
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const filtered = players.filter(p => {
    const q = search.toLowerCase();
    return !q || p.name?.toLowerCase().includes(q) || p.club_name?.toLowerCase().includes(q) || p.position?.toLowerCase().includes(q);
  });

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-cyan-500 animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl">
        <GraduationCap className="w-6 h-6 text-cyan-400 shrink-0" />
        <div>
          <p className="text-cyan-300 font-semibold">Centre de Formation</p>
          <p className="text-slate-400 text-sm">{players.length} joueur{players.length > 1 ? 's' : ''} formé{players.length > 1 ? 's' : ''} dans la ligue</p>
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
          <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{search ? 'Aucun résultat.' : 'Aucun joueur de formation pour le moment.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800/60 border border-cyan-500/20 rounded-2xl p-4 flex items-center gap-4"
            >
              {p.image_url ? (
                <img src={p.image_url} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-cyan-500/20 border border-cyan-500/20 flex items-center justify-center shrink-0">
                  <span className="text-2xl">{POSITIONS[p.position] || '⚽'}</span>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white font-bold">{p.name}</p>
                  {p.position && <Badge className="bg-slate-700 text-slate-300 text-xs">{p.position}</Badge>}
                  {p.overall && <Badge className="bg-amber-500/20 text-amber-300 text-xs">⭐ {p.overall}</Badge>}
                  {p.potential && <Badge className="bg-cyan-500/20 text-cyan-300 text-xs">🚀 {p.potential}</Badge>}
                </div>
                <p className="text-slate-400 text-sm mt-0.5">
                  <span className="text-cyan-400 font-medium">{p.club_name || 'Club inconnu'}</span>
                  {p.nationality && <span className="text-slate-500"> · {p.nationality}</span>}
                  {p.age && <span className="text-slate-500"> · {p.age} ans</span>}
                </p>
                <p className="text-slate-600 text-xs mt-0.5">
                  {p.created_date ? formatDistanceToNow(new Date(p.created_date), { addSuffix: true, locale: fr }) : ''}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                  <GraduationCap className="w-3 h-3 mr-1" />
                  Formé ✓
                </Badge>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}