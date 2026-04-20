import React from 'react';
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Check, Users, Euro, Trophy } from "lucide-react";

export default function ClubSelector({ clubs, selectedId, onSelect, takenClubIds = [] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {clubs.map((club, index) => {
        const isTaken = takenClubIds.includes(club.id);
        const isSelected = selectedId === club.id;

        return (
          <motion.div
            key={club.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => !isTaken && onSelect(club)}
            className={`
              relative p-5 rounded-2xl border-2 cursor-pointer transition-all
              ${isTaken 
                ? 'bg-slate-800/30 border-slate-700/30 opacity-50 cursor-not-allowed' 
                : isSelected 
                  ? 'bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/20' 
                  : 'bg-slate-800/50 border-slate-700/50 hover:border-emerald-500/50 hover:bg-slate-800'}
            `}
          >
            {isSelected && (
              <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
            )}

            {isTaken && (
              <Badge className="absolute top-3 right-3 bg-red-500/20 text-red-400 border border-red-500/30">
                Déjà pris
              </Badge>
            )}

            <div className="flex items-center gap-4 mb-4">
              {club.logo_url ? (
                <img src={club.logo_url} alt={club.name} className="w-16 h-16 rounded-xl object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                  <span className="text-2xl font-bold text-slate-500">
                    {club.name?.substring(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <h3 className="text-white font-bold text-lg">{club.name}</h3>
                {club.stadium && (
                  <p className="text-slate-400 text-sm">{club.stadium}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-slate-400 text-sm bg-slate-900/50 rounded-lg p-2">
                <Euro className="w-4 h-4 text-emerald-400" />
                <span>{(club.budget / 1000000).toFixed(0)}M€</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-sm bg-slate-900/50 rounded-lg p-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>{club.points || 0} pts</span>
              </div>
            </div>

            {club.manager_name && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-slate-500" />
                <span className="text-slate-500">Manager: {club.manager_name}</span>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}