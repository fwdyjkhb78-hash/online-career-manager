import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Star, ChevronDown, ChevronUp } from 'lucide-react';

const POSITION_ORDER = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];

// Sélecteur de saison sous forme de boutons pill
function SeasonSelector({ seasons, season, setSeason }) {
  return (
    <div className="flex flex-wrap gap-2">
      {seasons.map(s => (
        <button
          key={s}
          onClick={() => setSeason(s)}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
            season === s
              ? 'bg-emerald-500 text-white'
              : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          S{s}
        </button>
      ))}
    </div>
  );
}

function PlayerCard({ award, gold = false }) {
  return (
    <div className={`relative bg-gradient-to-br ${gold ? 'from-yellow-500 to-amber-500' : 'from-blue-500 to-cyan-500'} p-0.5 rounded-lg`}>
      <div className="bg-slate-900 rounded-lg p-3 h-full">
        <div className="h-20 bg-slate-700 rounded mb-2 overflow-hidden flex items-center justify-center">
          {award.image_url ? (
            <img src={award.image_url} alt={award.player_name} className="h-full object-cover" />
          ) : <span className="text-2xl">⚽</span>}
        </div>
        <p className="font-semibold text-white text-sm truncate">{award.player_name}</p>
        <p className="text-xs text-slate-400">{award.position}</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-slate-500 truncate">{award.club_name}</p>
          <p className="text-xs font-bold text-yellow-400">{award.overall}</p>
        </div>
      </div>
    </div>
  );
}

function TOTWSeasonView({ awards }) {
  const byMatchday = {};
  awards.forEach(a => {
    const md = a.matchday || 1;
    if (!byMatchday[md]) byMatchday[md] = [];
    byMatchday[md].push(a);
  });
  const matchdays = Object.keys(byMatchday).map(Number).sort((a, b) => b - a);
  const [openMd, setOpenMd] = useState(matchdays[0] || null);

  if (matchdays.length === 0) return <p className="text-center py-12 text-slate-400">Aucun TOTW pour cette saison</p>;

  return (
    <div className="space-y-3">
      {matchdays.map(md => (
        <div key={md} className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
          <button
            onClick={() => setOpenMd(openMd === md ? null : md)}
            className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-slate-700/40 transition"
          >
            <span className="font-semibold text-white flex items-center gap-2">
              🏆 Journée {md}
              <span className="text-xs text-slate-400 font-normal">({byMatchday[md].length} joueurs)</span>
            </span>
            {openMd === md ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {openMd === md && (
            <div className="px-4 pb-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
                {[...byMatchday[md]]
                  .sort((a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position))
                  .map(award => <PlayerCard key={award.id} award={award} />)}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function TOTYSeasonView({ awards }) {
  const [open, setOpen] = useState(true);
  if (awards.length === 0) return <p className="text-center py-12 text-slate-400">Aucune TOTY pour cette saison</p>;
  const sorted = [...awards].sort((a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position));
  return (
    <div className="bg-slate-800/60 border border-yellow-600/30 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-slate-700/40 transition"
      >
        <span className="font-semibold text-yellow-300 flex items-center gap-2">
          👑 Team Of The Year
          <span className="text-xs text-slate-400 font-normal">({awards.length} joueurs)</span>
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
            {sorted.map(award => <PlayerCard key={award.id} award={award} gold />)}
          </div>
        </div>
      )}
    </div>
  );
}

// Vue générique pour Ballon d'Or / Meilleur Jeune / Gardien / Coach
// Tri par ordre de création = le staff place le gagnant en 1er
function RankedAwardView({ awards, icon, label, emptyText, rankByOverall = false }) {
  if (awards.length === 0) return <p className="text-center py-12 text-slate-400">{emptyText}</p>;

  const sorted = rankByOverall
    ? [...awards].sort((a, b) => (b.overall || 0) - (a.overall || 0))
    : [...awards].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  const winner = sorted[0];
  const rest = sorted.slice(1);

  return (
    <div className="space-y-4">
      {/* Gagnant */}
      <div className="relative bg-gradient-to-br from-yellow-500/20 to-amber-600/10 border border-yellow-500/40 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6">
        <div className="absolute top-3 right-4 text-4xl">{icon}</div>
        <div className="h-28 w-28 rounded-xl bg-slate-700 overflow-hidden flex items-center justify-center flex-shrink-0 ring-4 ring-yellow-500">
          {winner.image_url ? (
            <img src={winner.image_url} alt={winner.player_name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-5xl">{icon}</span>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold text-yellow-400 uppercase tracking-widest mb-1">🥇 {label} — Gagnant</p>
          <p className="text-3xl font-black text-white">{winner.player_name || winner.club_name}</p>
          {winner.position && (
            <p className="text-slate-300 mt-1">
              {winner.position}
              {winner.overall ? <> • <span className="text-yellow-400 font-bold">{winner.overall} OVR</span></> : null}
            </p>
          )}
          {winner.club_name && winner.player_name && <p className="text-slate-400 text-sm mt-0.5">{winner.club_name}</p>}
          {winner.reason && <p className="text-xs text-amber-400 mt-1 italic">"{winner.reason}"</p>}
        </div>
      </div>

      {/* Reste du classement */}
      {rest.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest">Classement</p>
          {rest.map((award, idx) => (
            <div key={award.id} className="flex items-center gap-4 bg-slate-800/60 p-3 rounded-xl border border-slate-700">
              <div className="text-xl font-bold w-8 text-center flex-shrink-0">
                {idx === 0 ? '🥈' : idx === 1 ? '🥉' : <span className="text-slate-500 text-sm font-bold">{idx + 2}</span>}
              </div>
              <div className="h-10 w-10 rounded-lg bg-slate-700 overflow-hidden flex items-center justify-center flex-shrink-0">
                {award.image_url
                  ? <img src={award.image_url} alt={award.player_name} className="h-full w-full object-cover" />
                  : <span className="text-lg">{icon}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm truncate">{award.player_name || award.club_name}</p>
                <p className="text-xs text-slate-400 truncate">
                  {[award.position, award.club_name].filter(Boolean).join(' • ')}
                </p>
                {award.reason && <p className="text-xs text-amber-400 italic truncate">"{award.reason}"</p>}
              </div>
              {award.overall ? <p className="text-sm font-bold text-yellow-400 flex-shrink-0">{award.overall}</p> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Vue champions de ligues — groupée par championnat (reason)
function ChampionsView({ awards }) {
  if (awards.length === 0) return <p className="text-center py-12 text-slate-400">Aucun champion pour cette saison</p>;

  // Grouper par championnat (champ "reason")
  const byLeague = {};
  awards.forEach(a => {
    const league = a.reason || 'Championnat';
    if (!byLeague[league]) byLeague[league] = [];
    byLeague[league].push(a);
  });

  const leagues = Object.keys(byLeague).sort();

  return (
    <div className="space-y-4">
      {leagues.map(league => {
        const champion = byLeague[league][0];
        return (
          <div key={league} className="relative bg-gradient-to-br from-emerald-500/20 to-teal-600/10 border border-emerald-500/40 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6">
            <div className="absolute top-3 right-4 text-3xl">🏆</div>
            <div className="h-24 w-24 rounded-xl bg-slate-700 overflow-hidden flex items-center justify-center flex-shrink-0 ring-4 ring-emerald-500">
              {champion.image_url ? (
                <img src={champion.image_url} alt={champion.club_name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-4xl">🏅</span>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-1">Champion — {league}</p>
              <p className="text-2xl font-black text-white">{champion.club_name || champion.player_name}</p>
              {champion.player_name && champion.club_name && (
                <p className="text-slate-400 text-sm mt-0.5">Manager : {champion.player_name}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function TrophiesTab() {
  const { data: awards = [] } = useQuery({
    queryKey: ['awards'],
    queryFn: () => base44.entities.Award.list('created_date', 500)
  });

  // Construire la liste des saisons disponibles
  const allSeasons = [...new Set(awards.map(a => a.season).filter(Boolean))].sort((a, b) => a - b);
  const defaultSeason = allSeasons.length > 0 ? allSeasons[allSeasons.length - 1] : 1;
  const [season, setSeason] = useState(null);

  const activeSeason = season ?? defaultSeason;
  const seasons = allSeasons.length > 0 ? allSeasons : [1];

  const f = (type) => awards.filter(a => a.type === type && a.season === activeSeason);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="w-6 h-6 text-yellow-500" />
        <h2 className="text-2xl font-bold text-white">Palmarès</h2>
      </div>

      {/* Sélecteur de saison */}
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-2 font-semibold">Saison</p>
        <SeasonSelector seasons={seasons} season={activeSeason} setSeason={setSeason} />
      </div>

      <Tabs defaultValue="totw" className="w-full">
        <TabsList className="bg-slate-800/80 flex flex-wrap h-auto gap-1 p-1 rounded-xl">
          <TabsTrigger value="totw">🏆 TOTW</TabsTrigger>
          <TabsTrigger value="toty">👑 TOTY</TabsTrigger>
          <TabsTrigger value="ballon_d_or">⭐ Ballon d'Or</TabsTrigger>
          <TabsTrigger value="meilleur_jeune">🌟 Meilleur Jeune</TabsTrigger>
          <TabsTrigger value="meilleur_gardien">🧤 Meilleur Gardien</TabsTrigger>
          <TabsTrigger value="meilleur_coach">🎩 Meilleur Coach</TabsTrigger>
          <TabsTrigger value="champions">🏅 Champions</TabsTrigger>
        </TabsList>

        <TabsContent value="totw" className="mt-4">
          <TOTWSeasonView awards={f('totw')} />
        </TabsContent>
        <TabsContent value="toty" className="mt-4">
          <TOTYSeasonView awards={f('toty')} />
        </TabsContent>
        <TabsContent value="ballon_d_or" className="mt-4">
          <RankedAwardView awards={f('ballon_d_or')} icon="⭐" label="Ballon d'Or" emptyText="Aucun Ballon d'Or pour cette saison" />
        </TabsContent>
        <TabsContent value="meilleur_jeune" className="mt-4">
          <RankedAwardView awards={f('meilleur_jeune')} icon="🌟" label="Meilleur Jeune" emptyText="Aucun Meilleur Jeune pour cette saison" />
        </TabsContent>
        <TabsContent value="meilleur_gardien" className="mt-4">
          <RankedAwardView awards={f('meilleur_gardien')} icon="🧤" label="Meilleur Gardien" emptyText="Aucun Meilleur Gardien pour cette saison" />
        </TabsContent>
        <TabsContent value="meilleur_coach" className="mt-4">
          <RankedAwardView awards={f('meilleur_coach')} icon="🎩" label="Meilleur Coach" emptyText="Aucun Meilleur Coach pour cette saison" />
        </TabsContent>
        <TabsContent value="champions" className="mt-4">
          <ChampionsView awards={f('champion_ligue')} />
        </TabsContent>
      </Tabs>
    </div>
  );
}