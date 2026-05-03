import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Globe, Users, Trophy, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const FLAG_MAP = {
  'France': '🇫🇷', 'Espagne': '🇪🇸', 'Argentine': '🇦🇷', 'Angleterre': '🏴',
  'Portugal': '🇵🇹', 'Norvège': '🇳🇴', 'Pays-Bas': '🇳🇱', 'Maroc': '🇲🇦',
  'Belgique': '🇧🇪', 'Allemagne': '🇩🇪', 'Croatie': '🇭🇷', 'Italie': '🇮🇹',
  'Colombie': '🇨🇴', 'Suède': '🇸🇪', 'Mexique': '🇲🇽', 'États-Unis': '🇺🇸',
  'Uruguay': '🇺🇾', 'Ghana': '🇬🇭', 'Qatar': '🇶🇦', 'Danemark': '🇩🇰',
};

export default function NationalTeamsTab({ currentUser }) {
  const navigate = useNavigate();

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['national-teams-community'],
    queryFn: () => base44.entities.NationalTeam.list('country', 50),
  });

  const sorted = [...teams].sort((a, b) => (b.points ?? 0) - (a.points ?? 0) || (b.goals_for ?? 0) - (a.goals_for ?? 0));

  const myTeam = currentUser ? teams.find(t => t.manager_id === currentUser.id) : null;

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (teams.length === 0) return (
    <div className="text-center py-20 text-slate-500">
      <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
      <p>Les sélections nationales n'ont pas encore été initialisées.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Ma sélection */}
      {myTeam && (
        <div
          className="bg-gradient-to-r from-blue-500/20 to-indigo-500/10 border border-blue-500/30 rounded-2xl p-5 cursor-pointer hover:border-blue-400/60 transition-all"
          onClick={() => navigate(`/NationalTeamSpace?team_id=${myTeam.id}`)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-4xl">{FLAG_MAP[myTeam.country] || '🌍'}</span>
              <div>
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs mb-1">Ma sélection</Badge>
                <p className="text-white font-bold text-lg">{myTeam.country}</p>
                <p className="text-slate-400 text-sm">{myTeam.player_ids?.length || 0} joueur(s) sélectionné(s)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-white font-bold text-xl">{myTeam.points ?? 0} pts</p>
                <p className="text-slate-500 text-xs">{myTeam.wins ?? 0}V {myTeam.draws ?? 0}N {myTeam.losses ?? 0}D</p>
              </div>
              <ChevronRight className="w-5 h-5 text-blue-400" />
            </div>
          </div>
        </div>
      )}

      {/* Classement */}
      <div>
        <h3 className="text-white font-bold text-base mb-3 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-400" />
          Classement des sélections
        </h3>
        <div className="bg-slate-800/50 rounded-2xl overflow-hidden border border-slate-700/50">
          {/* Header */}
          <div className="grid grid-cols-12 px-4 py-2 text-slate-500 text-xs font-semibold uppercase border-b border-slate-700/50">
            <div className="col-span-1">#</div>
            <div className="col-span-5">Sélection</div>
            <div className="col-span-2 text-center">J</div>
            <div className="col-span-2 text-center">Buts</div>
            <div className="col-span-2 text-center">Pts</div>
          </div>
          {sorted.map((team, i) => {
            const isMe = currentUser && team.manager_id === currentUser.id;
            const played = (team.wins ?? 0) + (team.draws ?? 0) + (team.losses ?? 0);
            return (
              <div
                key={team.id}
                onClick={() => navigate(`/NationalTeamSpace?team_id=${team.id}`)}
                className={`grid grid-cols-12 items-center px-4 py-3 border-b border-slate-700/30 last:border-0 cursor-pointer transition-all hover:bg-slate-700/30 ${isMe ? 'bg-blue-500/10' : ''}`}
              >
                <div className="col-span-1">
                  <span className={`text-sm font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-500'}`}>{i + 1}</span>
                </div>
                <div className="col-span-5 flex items-center gap-2">
                  <span className="text-lg">{FLAG_MAP[team.country] || '🌍'}</span>
                  <div>
                    <p className={`text-sm font-semibold ${isMe ? 'text-blue-300' : 'text-white'}`}>{team.country}</p>
                    {team.manager_name && <p className="text-slate-500 text-xs">@{team.manager_name}</p>}
                  </div>
                </div>
                <div className="col-span-2 text-center text-slate-300 text-sm">{played}</div>
                <div className="col-span-2 text-center text-slate-300 text-sm">{team.goals_for ?? 0}</div>
                <div className="col-span-2 text-center">
                  <span className={`font-bold text-sm ${isMe ? 'text-blue-300' : 'text-emerald-400'}`}>{team.points ?? 0}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}