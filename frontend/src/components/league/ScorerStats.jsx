import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, Target, Zap } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Nouveau format stocké: "Mbappé, Neymar (assists: Vinicius, Modric)"
function parseScorers(text) {
  if (!text) return [];
  // On prend tout avant "(assists:"
  const part = text.split(/\(assists?:/i)[0];
  return part.split(',').map(s => s.trim()).filter(Boolean);
}

function parseAssists(text) {
  if (!text) return [];
  const match = text.match(/\(assists?:\s*([^)]+)\)/i);
  if (!match) return [];
  return match[1].split(',').map(s => s.trim()).filter(Boolean);
}

function buildStats(matches) {
  const goals = {};
  const assists = {};

  matches.forEach(match => {
    if (match.status !== 'confirmed') return;

    parseScorers(match.home_scorers).forEach(name => {
      goals[name] = (goals[name] || 0) + 1;
    });
    parseScorers(match.away_scorers).forEach(name => {
      goals[name] = (goals[name] || 0) + 1;
    });

    parseAssists(match.home_scorers).forEach(name => {
      assists[name] = (assists[name] || 0) + 1;
    });
    parseAssists(match.away_scorers).forEach(name => {
      assists[name] = (assists[name] || 0) + 1;
    });
  });

  const goalList = Object.entries(goals).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  const assistList = Object.entries(assists).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  return { goalList, assistList };
}

function StatRow({ rank, name, count, icon: Icon, color }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl ${rank === 1 ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-slate-800/40'}`}>
      <span className={`text-sm font-bold w-6 text-center ${rank === 1 ? 'text-amber-400' : rank === 2 ? 'text-slate-300' : rank === 3 ? 'text-amber-700' : 'text-slate-500'}`}>
        {rank}
      </span>
      <div className="flex-1 text-white font-medium">{name}</div>
      <div className={`flex items-center gap-1 font-bold text-lg ${color}`}>
        <Icon className="w-4 h-4" />
        {count}
      </div>
    </div>
  );
}

export default function ScorerStats() {
  const { data: matches = [], isLoading } = useQuery({
    queryKey: ['all-matches-stats'],
    queryFn: async () => {
      try {
        return await base44.entities.Match.filter({ status: 'confirmed' });
      } catch (e) {
        return [];
      }
    },
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { goalList, assistList } = useMemo(() => buildStats(matches), [matches]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Target className="w-5 h-5 text-emerald-400" />
        Statistiques individuelles
      </h2>
      <Tabs defaultValue="goals">
        <TabsList className="bg-slate-800/50 border border-slate-700/50 mb-4">
          <TabsTrigger value="goals" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
            <Target className="w-4 h-4 mr-1.5" /> Buteurs
          </TabsTrigger>
          <TabsTrigger value="assists" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
            <Zap className="w-4 h-4 mr-1.5" /> Passeurs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="goals">
          {goalList.length === 0 ? (
            <p className="text-slate-500 text-center py-8">Aucun buteur enregistré.</p>
          ) : (
            <div className="space-y-2">
              {goalList.map((item, i) => (
                <StatRow key={item.name} rank={i + 1} name={item.name} count={item.count} icon={Target} color="text-emerald-400" />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="assists">
          {assistList.length === 0 ? (
            <p className="text-slate-500 text-center py-8">Aucun passeur enregistré.</p>
          ) : (
            <div className="space-y-2">
              {assistList.map((item, i) => (
                <StatRow key={item.name} rank={i + 1} name={item.name} count={item.count} icon={Zap} color="text-blue-400" />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}