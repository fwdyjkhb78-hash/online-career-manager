import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

const groupByJournee = (matches) => {
  const groups = {};
  for (const m of matches) {
    const j = m.journee || 0;
    if (!groups[j]) groups[j] = [];
    groups[j].push(m);
  }
  return Object.entries(groups).sort((a, b) => Number(a[0]) - Number(b[0]));
};

export default function CalendrierTab() {
  const [expandedJournees, setExpandedJournees] = useState(new Set());

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ['all-matches-calendar'],
    queryFn: async () => {
      const all = await base44.entities.Match.list('-journee', 500);
      return all.filter(m => m.match_type !== 'tournoi');
    },
    staleTime: 30000,
  });

  const grouped = groupByJournee(matches);

  const toggleJournee = (j) => {
    setExpandedJournees(prev => {
      const next = new Set(prev);
      if (next.has(j)) next.delete(j); else next.add(j);
      return next;
    });
  };

  if (isLoading) return (
    <div className="flex justify-center py-16">
      <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
    </div>
  );

  if (grouped.length === 0) return (
    <div className="text-center py-16 text-slate-500">
      <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
      <p>Aucun match de championnat enregistré.</p>
    </div>
  );

  return (
    <div className="space-y-3 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-bold text-xl flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-400" />
          Calendrier Championnat
        </h2>
        <a href="https://www.score7.io/fr" target="_blank" rel="noopener noreferrer"
          className="text-xs text-slate-500 hover:text-emerald-400 transition-colors">
          Générer sur score7.io →
        </a>
      </div>
      {grouped.map(([journee, jMatches]) => {
        const isExpanded = expandedJournees.has(journee);
        const confirmed = jMatches.filter(m => m.status === 'confirmed').length;
        return (
          <div key={journee} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
            <button
              onClick={() => toggleJournee(journee)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg px-3 py-1 text-sm font-bold">
                  J{journee}
                </span>
                <span className="text-slate-400 text-sm">{jMatches.length} match{jMatches.length > 1 ? 's' : ''}</span>
                {confirmed > 0 && (
                  <span className="text-emerald-500 text-xs">{confirmed} confirmé{confirmed > 1 ? 's' : ''}</span>
                )}
              </div>
              {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {isExpanded && (
              <div className="border-t border-slate-700/50 divide-y divide-slate-700/30">
                {jMatches.map(m => {
                  const hasScore = m.home_score !== undefined && m.away_score !== undefined;
                  const confirmed = m.status === 'confirmed';
                  return (
                    <div key={m.id} className="px-4 py-3 flex items-center gap-3">
                      <div className="flex-1 text-right">
                        <span className="text-white text-sm font-semibold">{m.home_club_name}</span>
                      </div>
                      <div className="w-20 text-center shrink-0">
                        {confirmed && hasScore ? (
                          <span className="text-emerald-400 font-black text-base">{m.home_score} - {m.away_score}</span>
                        ) : (
                          <span className="text-slate-500 text-sm font-medium">vs</span>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <span className="text-white text-sm font-semibold">{m.away_club_name}</span>
                      </div>
                      <div className="w-20 text-right shrink-0">
                        {confirmed ? (
                          <span className="text-xs text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">✓</span>
                        ) : m.status === 'home_submitted' || m.status === 'away_submitted' ? (
                          <span className="text-xs text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">En cours</span>
                        ) : (
                          <span className="text-xs text-slate-600">À jouer</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}