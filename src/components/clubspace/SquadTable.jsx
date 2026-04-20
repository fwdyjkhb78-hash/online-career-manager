import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, ChevronUp, ChevronDown, Zap, RotateCcw, Sparkles, Wrench, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import PlayerStatsEditor from './PlayerStatsEditor';

const ACADEMY_STAT_LABELS = {
  centres: "Centres", finition: "Finition", precision_tete: "Précision tête",
  passes_courtes: "Passes courtes", volees: "Volées", aptitude: "Aptitude",
  mauvais_pied: "Mauvais pied", tacles_debout: "Tacles debout", tacles_glisses: "Tacles glissés",
  dribbles: "Dribbles", effet: "Effet", precision_cf: "Précision CF",
  passes_longues: "Passes longues", conduite_balle: "Conduite de balle",
  puissance_tir: "Puissance tir", detente: "Détente", endurance: "Endurance",
  force: "Force", tirs_loin: "Tirs de loin", acceleration: "Accélération",
  vitesse_sprint: "Vitesse sprint", agilite: "Agilité", reactivite: "Réactivité",
  equilibre: "Équilibre", agressivite: "Agressivité", interception: "Interception",
  positionnement: "Positionnement", vista: "Vista", penaltys: "Penaltys",
  plongeon: "Plongeon (G)", jeu_a_la_main: "Jeu à la main (G)", degagement: "Dégagement (G)", reflexe_g: "Réflexe (G)"
};
const ACADEMY_STATS_FIELDS = Object.keys(ACADEMY_STAT_LABELS);

const positionColors = {
  GK: "bg-amber-500", CB: "bg-blue-600", LB: "bg-blue-500", RB: "bg-blue-500",
  CDM: "bg-green-600", CM: "bg-green-500", CAM: "bg-emerald-500",
  LW: "bg-red-500", RW: "bg-red-500", ST: "bg-red-600"
};

const positionGroups = {
  GK: { label: 'Gardiens', color: 'border-amber-500/40 bg-amber-500/5' },
  DEF: { label: 'Défenseurs', color: 'border-blue-500/40 bg-blue-500/5' },
  MID: { label: 'Milieux', color: 'border-green-500/40 bg-green-500/5' },
  ATT: { label: 'Attaquants', color: 'border-red-500/40 bg-red-500/5' },
};

const getGroup = (pos) => {
  if (pos === 'GK') return 'GK';
  if (['CB', 'LB', 'RB'].includes(pos)) return 'DEF';
  if (['CDM', 'CM', 'CAM'].includes(pos)) return 'MID';
  return 'ATT';
};

const getStatColor = (val) => {
  if (!val) return 'text-slate-600';
  if (val >= 85) return 'text-yellow-400 font-bold';
  if (val >= 75) return 'text-emerald-400 font-semibold';
  if (val >= 65) return 'text-blue-400';
  if (val >= 55) return 'text-slate-300';
  return 'text-slate-500';
};

const getOverallColor = (val) => {
  if (!val) return 'bg-slate-600';
  if (val >= 85) return 'bg-gradient-to-br from-yellow-400 to-amber-500';
  if (val >= 75) return 'bg-gradient-to-br from-emerald-400 to-green-600';
  if (val >= 65) return 'bg-gradient-to-br from-blue-400 to-blue-600';
  return 'bg-gradient-to-br from-slate-400 to-slate-600';
};

const getMoraleColor = (v) => {
  if (v >= 70) return 'bg-emerald-500';
  if (v >= 45) return 'bg-amber-500';
  return 'bg-red-500';
};

const STATS_TO_CHECK = ['finition', 'passes_courtes', 'dribbles', 'acceleration', 'tacles_debout'];
const hasDetailedStats = (player) => STATS_TO_CHECK.some(s => player[s] != null && player[s] > 0);

export default function SquadTable({ players, clubId, canEdit, canDelete, onManage, onDelete, playerMorales = {} }) {
  const queryClient = useQueryClient();
  const [expandedAcademyId, setExpandedAcademyId] = useState(null);
  const [repairingId, setRepairingId] = useState(null);

  const repairStats = async (player) => {
    setRepairingId(player.id);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Tu es un générateur de stats FIFA/FC pour un joueur de football.
Joueur : ${player.name}, poste : ${player.position}, nationalité : ${player.nationality || 'française'}, âge : ${player.age || 18}, OVR : ${player.overall}, potentiel : ${player.potential || player.overall + 5}.
Génère des stats réalistes et cohérentes avec son poste et son OVR. Toutes les stats entre 10 et 99, jamais 0.
Pour un GK : plongeon, reflexe_g, positionnement, jeu_a_la_main, degagement élevés (70-88). Stats offensives faibles (15-35).
Pour un non-GK : plongeon/jeu_a_la_main/degagement/reflexe_g faibles (10-30). positionnement réaliste selon poste (ST/LW/RW : 38-58, CAM : 55-68, CM/CDM : 58-72, CB/LB/RB : 60-75).
penaltys entre 50-78 pour non-GK, 40-60 pour GK.
player_details : courte description du joueur.`,
      response_json_schema: {
        type: 'object',
        properties: {
          centres: { type: 'number' }, finition: { type: 'number' }, precision_tete: { type: 'number' },
          passes_courtes: { type: 'number' }, volees: { type: 'number' }, aptitude: { type: 'number' },
          mauvais_pied: { type: 'number' }, tacles_debout: { type: 'number' }, tacles_glisses: { type: 'number' },
          dribbles: { type: 'number' }, effet: { type: 'number' }, precision_cf: { type: 'number' },
          passes_longues: { type: 'number' }, conduite_balle: { type: 'number' }, puissance_tir: { type: 'number' },
          detente: { type: 'number' }, endurance: { type: 'number' }, force: { type: 'number' },
          tirs_loin: { type: 'number' }, acceleration: { type: 'number' }, vitesse_sprint: { type: 'number' },
          agilite: { type: 'number' }, reactivite: { type: 'number' }, equilibre: { type: 'number' },
          agressivite: { type: 'number' }, interception: { type: 'number' }, positionnement: { type: 'number' },
          vista: { type: 'number' }, penaltys: { type: 'number' },
          plongeon: { type: 'number' }, jeu_a_la_main: { type: 'number' }, degagement: { type: 'number' }, reflexe_g: { type: 'number' },
          player_details: { type: 'string' }
        }
      }
    });
    await base44.entities.Player.update(player.id, result);
    queryClient.invalidateQueries({ queryKey: ['players', clubId] });
    toast.success(`Stats de ${player.name} régénérées !`);
    setRepairingId(null);
  };
  const [sortField, setSortField] = useState('overall');
  const [sortDir, setSortDir] = useState('desc');

  const liftSuspensionMutation = useMutation({
    mutationFn: (playerId) => base44.entities.Player.update(playerId, { is_suspended: false, suspension_reason: '' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['players', clubId] }),
  });

  const sendToAcademyMutation = useMutation({
    mutationFn: async (player) => {
      const detailedStats = {};
      ACADEMY_STATS_FIELDS.forEach(f => { if (player[f] != null) detailedStats[f] = player[f]; });
      await base44.entities.AcademyPlayer.create({
        club_id: player.club_id,
        club_name: player.club_name,
        name: player.name,
        nationality: player.nationality,
        age: player.age,
        height: player.height,
        weight: player.weight,
        position: player.position,
        overall: player.overall,
        potential: player.potential,
        player_details: player.player_details || '(retour formation depuis senior)',
        ...detailedStats,
      });
      await base44.entities.Player.delete(player.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players', clubId] });
      queryClient.invalidateQueries({ queryKey: ['academy-players'] });
      toast.success('Joueur retourné en formation');
    },
  });

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronUp className="w-3 h-3 text-slate-600" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-emerald-400" />
      : <ChevronDown className="w-3 h-3 text-emerald-400" />;
  };

  const Th = ({ field, label, className = '' }) => (
    <th
      onClick={() => handleSort(field)}
      className={`px-2 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide cursor-pointer hover:text-white select-none whitespace-nowrap ${className}`}
    >
      <span className="flex items-center gap-1 justify-center">
        {label}
        <SortIcon field={field} />
      </span>
    </th>
  );

  const grouped = { GK: [], DEF: [], MID: [], ATT: [] };
  players.forEach(p => grouped[getGroup(p.position)].push(p));

  const sortPlayers = (arr) => [...arr].sort((a, b) => {
    const va = a[sortField] ?? 0;
    const vb = b[sortField] ?? 0;
    return sortDir === 'asc' ? va - vb : vb - va;
  });

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([group, groupPlayers]) => {
        if (groupPlayers.length === 0) return null;
        const g = positionGroups[group];
        const sorted = sortPlayers(groupPlayers);

        return (
          <div key={group} className={`rounded-xl border ${g.color} overflow-hidden`}>
            <div className="px-4 py-2 flex items-center gap-2 border-b border-slate-700/50">
              <span className={`w-2.5 h-2.5 rounded-full ${
                group === 'GK' ? 'bg-amber-500' :
                group === 'DEF' ? 'bg-blue-500' :
                group === 'MID' ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">{g.label}</h3>
              <Badge variant="outline" className="text-xs text-slate-400 border-slate-600 ml-1">
                {groupPlayers.length}
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-700/30">
                    <th className="pl-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide w-8">#</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Joueur</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">Pos</th>
                    <Th field="age" label="Âge" />
                    <Th field="overall" label="OVR" />
                    <Th field="potential" label="POT" />
                    <Th field="value" label="Valeur" className="text-right" />
                    <th className="px-2 py-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">Moral</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">Statut</th>
                    {canEdit && <th className="pr-3 py-2 w-16" />}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((player, idx) => (
                    <React.Fragment key={player.id}>
                      <tr
                        onClick={() => onManage && onManage(player)}
                        className="border-b border-slate-700/20 hover:bg-slate-700/30 cursor-pointer transition-colors group"
                      >
                        <td className="pl-4 py-3 text-slate-500 text-xs">{idx + 1}</td>

                        {/* Name + photo */}
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            {player.image_url ? (
                              <img
                                src={player.image_url}
                                alt={player.name}
                                className="w-8 h-8 rounded-full object-cover bg-slate-700 shrink-0"
                                onError={(e) => { e.currentTarget.style.display='none'; }}
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                                <span className="text-xs text-slate-400 font-bold">{player.name?.charAt(0)}</span>
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <p className="text-white font-medium text-sm truncate max-w-[130px]">{player.name}</p>
                                {player.is_academy && (
                                  <button
                                    onClick={e => { e.stopPropagation(); setExpandedAcademyId(expandedAcademyId === player.id ? null : player.id); }}
                                    title="Voir stats formation"
                                    className="text-purple-400 hover:text-purple-300 shrink-0"
                                  >
                                    <Sparkles className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              {player.nationality && (
                                <p className="text-slate-500 text-xs truncate">{player.nationality}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Position */}
                        <td className="px-2 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold text-white ${positionColors[player.position] || 'bg-slate-600'}`}>
                            {player.position}
                          </span>
                        </td>

                        {/* Age */}
                        <td className="px-2 py-3 text-center text-sm text-slate-300">{player.age || '—'}</td>

                        {/* Overall */}
                        <td className="px-2 py-3 text-center">
                          <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg text-white font-black text-sm ${getOverallColor(player.overall)}`}>
                            {player.overall}
                          </span>
                        </td>

                        {/* Potential */}
                        <td className="px-2 py-3 text-center">
                          {player.potential ? (
                            <span className={`text-sm font-semibold ${
                              player.overall >= player.potential ? 'text-slate-500 line-through' : 'text-violet-400'
                            }`}>
                              {player.potential}
                            </span>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>

                        {/* Value */}
                        <td className="px-3 py-3 text-right">
                          <span className="text-emerald-400 font-semibold text-sm whitespace-nowrap">
                            {player.value ? `${(player.value / 1e6).toFixed(1)}M€` : '—'}
                          </span>
                          {player.release_clause > 0 && (
                            <p className="text-amber-400 text-xs flex items-center justify-end gap-0.5">
                              <Zap className="w-3 h-3" />{(player.release_clause / 1e6).toFixed(1)}M€
                            </p>
                          )}
                        </td>

                        {/* Morale */}
                        <td className="px-2 py-3 text-center">
                          {(() => {
                            const morale = playerMorales[player.id] ?? 100;
                            return (
                              <div className="flex flex-col items-center gap-0.5">
                                <span className={`text-xs font-bold ${morale >= 70 ? 'text-emerald-400' : morale >= 45 ? 'text-amber-400' : 'text-red-400'}`}>
                                  {morale}
                                </span>
                                <div className="w-10 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${getMoraleColor(morale)}`} style={{ width: `${morale}%` }} />
                                </div>
                              </div>
                            );
                          })()}
                        </td>

                        {/* Status */}
                        <td className="px-2 py-3 text-center" onClick={e => e.stopPropagation()}>
                          {player.is_suspended ? (
                            <button
                              title="Lever la suspension"
                              onClick={() => liftSuspensionMutation.mutate(player.id)}
                              className="bg-red-500/20 text-red-400 border border-red-500/40 text-xs px-2 py-0.5 rounded-full hover:bg-red-500/40 transition-colors whitespace-nowrap"
                            >
                              🟥 Suspendu
                            </button>
                          ) : player.is_on_transfer_list ? (
                            <Badge className="bg-red-500/20 text-red-400 border border-red-500/40 text-xs whitespace-nowrap">
                              À vendre
                            </Badge>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        {canEdit && (
                          <td className="pr-3 py-3" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {player.is_academy && (
                                <button
                                  title="Retour en formation"
                                  onClick={() => sendToAcademyMutation.mutate(player)}
                                  className="p-1.5 bg-purple-500/20 hover:bg-purple-500 text-purple-400 hover:text-white rounded transition-colors"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <PlayerStatsEditor player={player} clubId={clubId} />
                              {canDelete && (
                                <button
                                  onClick={() => onDelete && onDelete(player.id)}
                                  className="p-1.5 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>

                      {/* Stats détaillées CDF */}
                      {player.is_academy && expandedAcademyId === player.id && (
                        <tr key={`stats-${player.id}`}>
                          <td colSpan={canEdit ? 10 : 9} className="p-0">
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="border-t border-purple-500/20 bg-purple-500/5 px-4 pb-4 overflow-hidden"
                            >
                              {!hasDetailedStats(player) ? (
                                <div className="flex items-center gap-3 mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                                  <Wrench className="w-4 h-4 text-amber-400 shrink-0" />
                                  <p className="text-amber-300 text-xs flex-1">Stats détaillées manquantes (joueur promu avant la mise à jour)</p>
                                  <button
                                    onClick={() => repairStats(player)}
                                    disabled={repairingId === player.id}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                                  >
                                    {repairingId === player.id ? <><Loader2 className="w-3 h-3 animate-spin" />Régénération...</> : <><Sparkles className="w-3 h-3" />Réparer par IA</>}
                                  </button>
                                </div>
                              ) : (
                                <>
                              {player.player_details && (
                                <p className="text-purple-300 text-xs italic mt-3 mb-3">{player.player_details}</p>
                              )}
                              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-1.5 mt-3">
                                {ACADEMY_STATS_FIELDS.map(key => {
                                  const isGkOnly = ['plongeon','jeu_a_la_main','degagement','reflexe_g'].includes(key);
                                  if (isGkOnly && player.position !== 'GK') return null;
                                  if (player[key] == null) return null;
                                  return (
                                    <div key={key} className="flex items-center justify-between bg-slate-700/40 rounded-lg px-2.5 py-1">
                                      <span className="text-slate-400 text-xs truncate">{ACADEMY_STAT_LABELS[key]}</span>
                                      <span className={`font-bold text-xs ml-1 shrink-0 ${
                                        player[key] >= 70 ? 'text-emerald-400' : player[key] >= 60 ? 'text-amber-400' : 'text-red-400'
                                      }`}>{player[key]}</span>
                                    </div>
                                  );
                                })}
                              </div>
                                </>
                              )}
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}