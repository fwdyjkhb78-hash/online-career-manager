import React from 'react';
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Zap, Tag } from 'lucide-react';

const positionColors = {
  GK: "bg-amber-500",
  CB: "bg-blue-500",
  LB: "bg-blue-500",
  RB: "bg-blue-500",
  CDM: "bg-green-500",
  CM: "bg-green-500",
  CAM: "bg-green-500",
  LW: "bg-red-500",
  RW: "bg-red-500",
  ST: "bg-red-500"
};

const positionLabels = {
  GK: "Gardien",
  CB: "Défenseur Central",
  LB: "Arrière Gauche",
  RB: "Arrière Droit",
  CDM: "Milieu Défensif",
  CM: "Milieu Central",
  CAM: "Milieu Offensif",
  LW: "Ailier Gauche",
  RW: "Ailier Droit",
  ST: "Attaquant"
};

export default function PlayerCard({ player, onClick, showValue = true, compact = false }) {
  const getRatingColor = (rating) => {
    if (rating >= 85) return "from-yellow-400 to-amber-600";
    if (rating >= 75) return "from-emerald-400 to-green-600";
    if (rating >= 65) return "from-blue-400 to-blue-600";
    return "from-slate-400 to-slate-600";
  };

  if (compact) {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        onClick={onClick}
        className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 cursor-pointer hover:border-emerald-500/50 transition-all"
      >
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getRatingColor(player.overall)} flex items-center justify-center`}>
          <span className="text-white font-bold text-sm">{player.overall}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium truncate">{player.name}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`${positionColors[player.position]} text-white text-xs px-2 py-0`}>
              {positionLabels[player.position] || player.position}
            </Badge>
            {player.club_name && (
              <span className="text-slate-400 text-xs truncate">{player.club_name}</span>
            )}
          </div>
        </div>
        <div className="text-right space-y-1">
          {showValue && (
            <p className="text-emerald-400 font-semibold text-sm">
              {player.value ? (player.value / 1000000).toFixed(1) : '0'}M€
            </p>
          )}
          {player.is_on_transfer_list && (
            <Badge className="bg-red-500 text-white text-xs">À vendre</Badge>
          )}
          {player.release_clause > 0 && (
            <p className="text-amber-400 text-xs flex items-center gap-1 justify-end">
              <Zap className="w-3 h-3" />{(player.release_clause / 1e6).toFixed(1)}M€
            </p>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -5 }}
      onClick={onClick}
      className="relative bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl overflow-hidden cursor-pointer group border border-slate-700/50 hover:border-emerald-500/50 transition-all"
    >
      {/* Rating Badge */}
      <div className={`absolute top-3 left-3 w-12 h-12 rounded-xl bg-gradient-to-br ${getRatingColor(player.overall)} flex items-center justify-center shadow-lg`}>
        <span className="text-white font-black text-xl">{player.overall}</span>
      </div>

      {/* Position */}
      <div className="absolute top-3 right-3">
        <Badge className={`${positionColors[player.position]} text-white font-semibold`}>
          {player.position}
        </Badge>
      </div>

      {/* Player Image Area */}
      <div className="h-40 bg-gradient-to-b from-slate-700/30 to-transparent flex items-end justify-center pt-8">
        {player.image_url ? (
          <img src={player.image_url} alt={player.name} className="h-32 object-contain" />
        ) : (
          <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center mb-4">
            <span className="text-4xl text-slate-500">⚽</span>
          </div>
        )}
      </div>

      {/* Player Info */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="text-white font-bold text-lg truncate">{player.name}</h3>
          <p className="text-slate-400 text-sm">
            {positionLabels[player.position] || player.position}
            {player.nationality ? ` • ${player.nationality}` : ''}
            {player.age ? ` • ${player.age} ans` : ''}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-800/50 rounded-lg p-2">
            <p className="text-emerald-400 font-bold text-sm">{player.pace || '-'}</p>
            <p className="text-slate-500 text-xs">Vitesse</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2">
            <p className="text-emerald-400 font-bold text-sm">{player.shooting || '-'}</p>
            <p className="text-slate-500 text-xs">Tir</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2">
            <p className="text-emerald-400 font-bold text-sm">{player.passing || '-'}</p>
            <p className="text-slate-500 text-xs">Passe</p>
          </div>
        </div>

        {showValue && (
          <div className="flex justify-between items-center pt-2 border-t border-slate-700/50">
            <span className="text-slate-400 text-sm">Valeur marchande</span>
            <span className="text-emerald-400 font-bold">
              {player.value ? (player.value / 1000000).toFixed(1) : '0'}M€
            </span>
          </div>
        )}

        {player.asking_price > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm flex items-center gap-1"><Tag className="w-3 h-3" />Prix demandé</span>
            <span className="text-white font-semibold text-sm">{(player.asking_price / 1e6).toFixed(1)}M€</span>
          </div>
        )}

        {player.release_clause > 0 && (
          <div className="flex justify-between items-center bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            <span className="text-amber-400 text-sm flex items-center gap-1"><Zap className="w-3 h-3" />Clause libération</span>
            <span className="text-amber-300 font-bold text-sm">{(player.release_clause / 1e6).toFixed(1)}M€</span>
          </div>
        )}

        {player.is_on_transfer_list && (
          <Badge className="bg-red-500 text-white w-full justify-center py-1 animate-pulse">🔴 Disponible au transfert</Badge>
        )}
      </div>
    </motion.div>
  );
}