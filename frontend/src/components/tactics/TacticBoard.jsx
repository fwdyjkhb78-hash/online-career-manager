import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PLAYER_INSTRUCTIONS = {
  GK: ['Relances longues', 'Relances courtes', 'Sweeper keeper', 'Rester dans les buts'],
  DEF: ['Défense en zone', 'Marquage homme', 'Chevauchements', 'Rester en position', 'Pressing haut'],
  MID: ['Box-to-box', 'Tenir le ballon', 'Pressing', 'Passes longues', 'Dribbler', 'Soutien défensif', 'Rentrées dans la surface'],
  ATT: ['Appels en profondeur', 'Décrocher', 'Rester large', 'Rentrer dans l\'axe', 'Pressing', 'Tirer souvent', 'Créer pour les autres'],
};

function getInstructionGroup(slot) {
  if (slot === 'GK') return 'GK';
  if (['CB', 'LB', 'RB', 'SW'].includes(slot)) return 'DEF';
  if (['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(slot)) return 'MID';
  return 'ATT';
}

export default function TacticBoard({ lineup, players, formation, onLineupChange }) {
  const [selectedSlot, setSelectedSlot] = useState(null);

  const handlePlayerChange = (slotIndex, playerId) => {
    const player = players.find(p => p.id === playerId);
    const newLineup = [...lineup];
    newLineup[slotIndex] = {
      ...newLineup[slotIndex],
      player_id: playerId,
      player_name: player?.name || '',
    };
    onLineupChange(newLineup);
  };

  const toggleInstruction = (slotIndex, instruction) => {
    const newLineup = [...lineup];
    const slot = newLineup[slotIndex];
    const current = slot.instructions?.list || [];
    const updated = current.includes(instruction)
      ? current.filter(i => i !== instruction)
      : [...current, instruction];
    newLineup[slotIndex] = { ...slot, instructions: { ...slot.instructions, list: updated } };
    onLineupChange(newLineup);
    setSelectedSlot(slotIndex);
  };

  const usedPlayerIds = lineup.map(s => s.player_id).filter(Boolean);

  return (
    <div className="relative w-full">
      {/* Terrain */}
      <div className="relative w-full aspect-[2/3] bg-gradient-to-b from-emerald-800 to-emerald-700 rounded-2xl overflow-hidden border-2 border-emerald-600 select-none">
        {/* Lignes du terrain */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 150" preserveAspectRatio="none">
          {/* Contour */}
          <rect x="5" y="3" width="90" height="144" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
          {/* Ligne médiane */}
          <line x1="5" y1="75" x2="95" y2="75" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
          {/* Cercle central */}
          <circle cx="50" cy="75" r="12" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
          {/* Surface réparation haute */}
          <rect x="27" y="3" width="46" height="22" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
          {/* Surface de but haute */}
          <rect x="39" y="3" width="22" height="8" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
          {/* Surface réparation basse */}
          <rect x="27" y="125" width="46" height="22" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
          {/* Surface de but basse */}
          <rect x="39" y="139" width="22" height="8" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
          {/* Buts */}
          <rect x="42" y="1" width="16" height="3" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" />
          <rect x="42" y="146" width="16" height="3" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" />
          {/* Points de penalty */}
          <circle cx="50" cy="19" r="0.8" fill="rgba(255,255,255,0.4)" />
          <circle cx="50" cy="131" r="0.8" fill="rgba(255,255,255,0.4)" />
        </svg>

        {/* Joueurs */}
        {lineup.map((slot, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.03 }}
            style={{ left: `${slot.x}%`, top: `${slot.y}%`, transform: 'translate(-50%, -50%)' }}
            className="absolute cursor-pointer"
            onClick={() => setSelectedSlot(selectedSlot === i ? null : i)}
          >
            <div className={`flex flex-col items-center gap-0.5`}>
              <div className={`
                w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold shadow-lg transition-all
                ${selectedSlot === i ? 'border-yellow-400 bg-yellow-400/20 scale-110' : 
                  slot.player_id ? 'border-white bg-slate-800 hover:scale-105' : 'border-dashed border-slate-400 bg-slate-800/50 hover:border-white'}
              `}>
                {slot.player_id ? (
                  slot.player_name?.split(' ').pop()?.substring(0, 4) || '?'
                ) : (
                  <span className="text-slate-400 text-[9px]">{slot.position_slot}</span>
                )}
              </div>
              <span className="text-[9px] text-white font-semibold bg-slate-900/70 px-1 rounded whitespace-nowrap max-w-[70px] truncate text-center">
                {slot.player_id ? slot.player_name?.split(' ').pop() : slot.position_slot}
              </span>
              {slot.instructions?.list?.length > 0 && (
                <div className="flex gap-0.5">
                  {slot.instructions.list.slice(0, 2).map((_, idx) => (
                    <div key={idx} className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Panel d'instructions pour le slot sélectionné */}
      <AnimatePresence>
        {selectedSlot !== null && lineup[selectedSlot] && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-4 bg-slate-800 border border-slate-700 rounded-2xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold">
                Poste : {lineup[selectedSlot].position_slot}
              </h3>
              <Button variant="ghost" size="icon" className="text-slate-400 h-7 w-7" onClick={() => setSelectedSlot(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Sélecteur de joueur */}
            <div className="mb-4">
              <label className="text-xs text-slate-400 mb-1 block">Joueur</label>
              <Select
                value={lineup[selectedSlot].player_id || ''}
                onValueChange={(v) => handlePlayerChange(selectedSlot, v)}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Choisir un joueur" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 max-h-60">
                  {players
                    .filter(p => !usedPlayerIds.includes(p.id) || p.id === lineup[selectedSlot].player_id)
                    .sort((a, b) => b.overall - a.overall)
                    .map(p => (
                      <SelectItem key={p.id} value={p.id} className="text-white hover:bg-slate-700">
                        <span className="flex items-center gap-2">
                          <span className="text-emerald-400 font-bold text-xs w-6">{p.overall}</span>
                          <span>{p.name}</span>
                          <span className="text-slate-400 text-xs">{p.position}</span>
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Instructions */}
            <div>
              <label className="text-xs text-slate-400 mb-2 block">Instructions individuelles</label>
              <div className="flex flex-wrap gap-2">
                {PLAYER_INSTRUCTIONS[getInstructionGroup(lineup[selectedSlot].position_slot)]?.map(instr => {
                  const active = lineup[selectedSlot].instructions?.list?.includes(instr);
                  return (
                    <button
                      key={instr}
                      onClick={() => toggleInstruction(selectedSlot, instr)}
                      className={`px-2 py-1 rounded-lg text-xs font-medium transition-all border ${
                        active
                          ? 'bg-emerald-500 border-emerald-400 text-white'
                          : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {instr}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}