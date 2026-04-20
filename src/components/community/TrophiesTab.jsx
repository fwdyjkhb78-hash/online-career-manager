import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Star } from 'lucide-react';

const AWARD_TYPES = {
  totw: { label: 'Team Of The Week', icon: '🏆', color: 'from-blue-500 to-cyan-500' },
  toty: { label: 'Team Of The Year', icon: '👑', color: 'from-yellow-500 to-amber-500' },
  ballon_d_or: { label: 'Ballon d\'Or', icon: '⭐', color: 'from-yellow-400 to-orange-500' }
};

export default function TrophiesTab() {
  const [season, setSeason] = useState(1);
  const [selectedMatchday, setSelectedMatchday] = useState(1);

  const { data: awards = [] } = useQuery({
    queryKey: ['awards'],
    queryFn: () => base44.entities.Award.list('-created_date', 500)
  });

  const filteredAwards = {
    totw: awards.filter(a => a.type === 'totw' && a.season === season),
    toty: awards.filter(a => a.type === 'toty' && a.season === season),
    ballon_d_or: awards.filter(a => a.type === 'ballon_d_or' && a.season === season)
  };

  const totwByMatchday = {};
  filteredAwards.totw.forEach(award => {
    const md = award.matchday || 1;
    if (!totwByMatchday[md]) totwByMatchday[md] = [];
    totwByMatchday[md].push(award);
  });

  const matchdays = Object.keys(totwByMatchday).sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-6 h-6 text-yellow-500" />
        <h2 className="text-2xl font-bold text-white">Palmarès</h2>
      </div>

      <div>
        <label className="text-sm text-slate-400 block mb-2">Saison</label>
        <input
          type="number"
          min="1"
          value={season}
          onChange={(e) => setSeason(parseInt(e.target.value))}
          className="bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white w-32"
        />
      </div>

      <Tabs defaultValue="totw" className="w-full">
        <TabsList className="bg-slate-800 grid w-full grid-cols-3">
          <TabsTrigger value="totw" className="flex items-center gap-2">
            <span className="text-lg">🏆</span>
            TOTW
          </TabsTrigger>
          <TabsTrigger value="toty" className="flex items-center gap-2">
            <span className="text-lg">👑</span>
            TOTY
          </TabsTrigger>
          <TabsTrigger value="ballon_d_or" className="flex items-center gap-2">
            <span className="text-lg">⭐</span>
            Ballon d'Or
          </TabsTrigger>
        </TabsList>

        <TabsContent value="totw" className="space-y-6">
          {matchdays.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              Aucun TOTW pour cette saison
            </div>
          ) : (
            <div className="space-y-8">
              {matchdays.map(matchday => (
                <div key={matchday}>
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Journée {matchday}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {totwByMatchday[matchday].map(award => (
                      <AwardCard key={award.id} award={award} type="totw" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="toty" className="space-y-4">
          {filteredAwards.toty.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              Aucune TOTY pour cette saison
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredAwards.toty.map(award => (
                <AwardCard key={award.id} award={award} type="toty" />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ballon_d_or" className="space-y-4">
          {filteredAwards.ballon_d_or.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              Aucun Ballon d'Or pour cette saison
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAwards.ballon_d_or.map((award, idx) => (
                <div key={award.id} className="flex items-center gap-4 bg-gradient-to-r from-yellow-600/20 to-transparent p-4 rounded-lg border border-yellow-600/30">
                  <div className="text-3xl font-bold text-yellow-500 w-12 text-center">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                  </div>
                  <div className="h-16 w-16 rounded-lg bg-slate-700 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {award.image_url ? (
                      <img src={award.image_url} alt={award.player_name} className="h-full object-cover" />
                    ) : (
                      <Star className="w-6 h-6 text-yellow-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-bold text-white">{award.player_name}</p>
                    <p className="text-sm text-slate-400">{award.position} • {award.overall} OVR</p>
                    <p className="text-xs text-slate-500">{award.club_name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AwardCard({ award, type }) {
  const awardInfo = AWARD_TYPES[type];
  return (
    <div className={`relative bg-gradient-to-br ${awardInfo.color} p-0.5 rounded-lg`}>
      <div className="bg-slate-900 rounded-lg p-3 h-full">
        <div className="absolute top-2 right-2 text-2xl">{awardInfo.icon}</div>

        <div className="h-20 bg-slate-700 rounded mb-2 overflow-hidden flex items-center justify-center">
          {award.image_url ? (
            <img src={award.image_url} alt={award.player_name} className="h-full object-cover" />
          ) : (
            <span className="text-2xl">⚽</span>
          )}
        </div>

        <p className="font-semibold text-white text-sm truncate">{award.player_name}</p>
        <p className="text-xs text-slate-400">{award.position}</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-slate-500">{award.club_name}</p>
          <p className="text-xs font-bold text-yellow-400">{award.overall}</p>
        </div>
      </div>
    </div>
  );
}