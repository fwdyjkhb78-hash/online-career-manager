import React from 'react';
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";

export default function LeagueTable({ clubs, currentClubId, title, relegationSpots = 2 }) {
  const sortedClubs = [...clubs].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = (a.goals_for || 0) - (a.goals_against || 0);
    const gdB = (b.goals_for || 0) - (b.goals_against || 0);
    return gdB - gdA;
  });

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden">
      <div className="p-4 border-b border-slate-700/50 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-white font-bold text-lg">{title}</h2>
          <p className="text-slate-400 text-sm">Classement général</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-slate-400 text-xs uppercase border-b border-slate-700/50">
              <th className="text-left p-3 pl-4">#</th>
              <th className="text-left p-3">Club</th>
              <th className="text-center p-3">MJ</th>
              <th className="text-center p-3">V</th>
              <th className="text-center p-3">N</th>
              <th className="text-center p-3">D</th>
              <th className="text-center p-3">BP</th>
              <th className="text-center p-3">BC</th>
              <th className="text-center p-3">DB</th>
              <th className="text-center p-3 pr-4">Pts</th>
            </tr>
          </thead>
          <tbody>
            {sortedClubs.map((club, index) => {
              const played = (club.wins || 0) + (club.draws || 0) + (club.losses || 0);
              const gd = (club.goals_for || 0) - (club.goals_against || 0);
              const isCurrentClub = club.id === currentClubId;
              const total = sortedClubs.length;
              const isRelegation = total > 0 && index >= total - relegationSpots;
              const rowStyle = index === 0
                ? "bg-gradient-to-r from-amber-500/20 to-transparent border-l-4 border-amber-500"
                : isRelegation
                ? "bg-gradient-to-r from-red-500/10 to-transparent border-l-4 border-red-500"
                : index <= 3
                ? "bg-gradient-to-r from-emerald-500/10 to-transparent border-l-4 border-emerald-500"
                : "border-l-4 border-transparent";

              return (
                <motion.tr
                  key={club.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`${rowStyle} ${isCurrentClub ? 'bg-emerald-500/10' : ''} hover:bg-slate-700/30 transition-colors`}
                >
                  <td className="p-3 pl-4">
                    <div className="flex items-center gap-1">
                      {index === 0 && <Trophy className="w-4 h-4 text-amber-500" />}
                      <span className={`font-bold ${index === 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                        {index + 1}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {club.logo_url ? (
                        <img src={club.logo_url} alt={club.name} className="w-8 h-8 rounded-lg object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
                          <span className="text-slate-400 text-xs font-bold">
                            {club.name?.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className={`font-semibold ${isCurrentClub ? 'text-emerald-400' : 'text-white'}`}>
                          {club.name}
                        </p>
                        {club.manager_name && (
                          <p className="text-slate-500 text-xs">{club.manager_name}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="text-center p-3 text-slate-300">{played}</td>
                  <td className="text-center p-3 text-emerald-400 font-medium">{club.wins || 0}</td>
                  <td className="text-center p-3 text-slate-400">{club.draws || 0}</td>
                  <td className="text-center p-3 text-red-400">{club.losses || 0}</td>
                  <td className="text-center p-3 text-slate-300">{club.goals_for || 0}</td>
                  <td className="text-center p-3 text-slate-300">{club.goals_against || 0}</td>
                  <td className="text-center p-3">
                    <span className={`font-medium ${gd > 0 ? 'text-emerald-400' : gd < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                      {gd > 0 ? '+' : ''}{gd}
                    </span>
                  </td>
                  <td className="text-center p-3 pr-4">
                    <span className="font-bold text-white text-lg">{club.points || 0}</span>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sortedClubs.length === 0 && (
        <div className="p-8 text-center text-slate-400">
          Aucun club dans ce championnat
        </div>
      )}
    </div>
  );
}