import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Loader2 } from 'lucide-react';
import LeagueTable from '@/components/LeagueTable';
import ScorerStats from '@/components/league/ScorerStats';

const CHAMPIONSHIPS = [
  {
    id: 'ligue1_serie_a',
    label: 'Ligue 1',
    subtitle: 'Division 1 — élite',
    relegation: 2,
  },
  {
    id: 'bundesliga_liga_pl',
    label: 'Ligue 2',
    subtitle: 'Division 2 — montants/descendants',
    relegation: 2,
  },
];

export default function League() {
  const [user, setUser] = useState(null);
  const [activeChamp, setActiveChamp] = useState('ligue1_serie_a');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {}
    };
    loadUser();
  }, []);

  const { data: clubs = [], isLoading } = useQuery({
    queryKey: ['clubs'],
    queryFn: () => base44.entities.Club.list(),
    staleTime: 45000,
    gcTime: 300000,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  const filteredClubs = clubs.filter(c => (c.championship || 'ligue1_serie_a') === activeChamp);
  const currentChamp = CHAMPIONSHIPS.find(c => c.id === activeChamp);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mb-4">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Championnats</h1>
          <p className="text-slate-400 mt-2">Saison 2025/2026</p>
        </div>

        {/* Championship tabs */}
        <div className="flex gap-3 mb-8 p-1 bg-slate-800/60 rounded-xl border border-slate-700/50">
          {CHAMPIONSHIPS.map(champ => (
            <button
              key={champ.id}
              onClick={() => setActiveChamp(champ.id)}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                activeChamp === champ.id
                  ? 'bg-amber-500 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <div className="font-bold">{champ.label}</div>
              <div className={`text-xs mt-0.5 ${activeChamp === champ.id ? 'text-amber-100' : 'text-slate-500'}`}>
                {champ.subtitle}
              </div>
            </button>
          ))}
        </div>

        <LeagueTable
          clubs={filteredClubs}
          currentClubId={user?.club_id}
          title={currentChamp.label}
        />

        <ScorerStats />

        <div className="mt-8 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-500/20 border-l-4 border-amber-500" />
            <span className="text-slate-400">Champion</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-emerald-500/10 border-l-4 border-emerald-500" />
            <span className="text-slate-400">{activeChamp === 'ligue1_serie_a' ? 'Qualifié coupe' : 'Montée en Ligue 1'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500/10 border-l-4 border-red-500" />
            <span className="text-slate-400">{activeChamp === 'ligue1_serie_a' ? 'Relégation Ligue 2' : 'Relégation'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}