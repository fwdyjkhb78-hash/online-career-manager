import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Swords, Plus, Check, ChevronDown, ChevronUp,
  Loader2, Trophy, Shield, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

const STATS_FIELDS = [
  { key: 'possession', label: 'Possession (%)' },
  { key: 'shots', label: 'Tirs' },
  { key: 'shots_on_target', label: 'Tirs cadrés' },
  { key: 'corners', label: 'Corners' },
  { key: 'fouls', label: 'Fautes' },
  { key: 'yellow_cards', label: 'Cartons jaunes' },
  { key: 'red_cards', label: 'Cartons rouges' },
];

function PlayerPicker({ players, label, selected, onChange, multi = false }) {
  const [search, setSearch] = useState('');
  const filtered = players.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const toggle = (name) => {
    if (multi) {
      // multi: ajouter à chaque clic
      onChange([...selected, name]);
    } else {
      onChange(selected.includes(name) ? selected.filter(n => n !== name) : [...selected, name]);
    }
  };

  const removeOne = (name) => {
    const idx = selected.lastIndexOf(name);
    if (idx !== -1) {
      const next = [...selected];
      next.splice(idx, 1);
      onChange(next);
    }
  };

  // Count occurrences for display
  const counts = selected.reduce((acc, n) => { acc[n] = (acc[n] || 0) + 1; return acc; }, {});

  return (
    <div>
      <Label className="text-slate-300 text-sm">{label}</Label>
      <div className="mt-1 bg-slate-700/50 border border-slate-600 rounded-xl p-2 space-y-1.5">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un joueur..."
          className="bg-slate-600 border-slate-500 text-white h-7 text-xs"
        />
        <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
          {filtered.length === 0 && <p className="text-slate-500 text-xs text-center py-2">Aucun joueur trouvé</p>}
          {filtered.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.name)}
              className={`w-full text-left px-2 py-1 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                selected.includes(p.name)
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-300 hover:bg-slate-600/50'
              }`}
            >
              <span className="text-xs text-slate-500 w-10 shrink-0">{p.position}</span>
              <span className="flex-1">{p.name}</span>
              {multi && counts[p.name] > 0 && (
                <span className="bg-emerald-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                  {counts[p.name]}
                </span>
              )}
            </button>
          ))}
        </div>
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-600">
            {multi
              ? Object.entries(counts).map(([name, count]) => (
                  <span
                    key={name}
                    onClick={() => removeOne(name)}
                    className="cursor-pointer bg-emerald-500/20 text-emerald-300 text-xs px-2 py-0.5 rounded-full border border-emerald-500/30 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30 transition-colors"
                    title="Cliquer pour retirer une occurrence"
                  >
                    {name}{count > 1 ? ` ×${count}` : ''}
                  </span>
                ))
              : selected.map((n, i) => (
                  <span key={i} className="bg-emerald-500/20 text-emerald-300 text-xs px-2 py-0.5 rounded-full border border-emerald-500/30">
                    {n}
                  </span>
                ))
            }
          </div>
        )}
      </div>
    </div>
  );
}

function MatchCard({ match, club, user, players = [], onSubmit, onDelete, loading, deleting, defaultLineup = [] }) {
  const [expanded, setExpanded] = useState(false);
  const [score, setScore] = useState('');
  const [scorers, setScorers] = useState([]);
  const [assisters, setAssisters] = useState([]);
  const [redCards, setRedCards] = useState([]);
  const [stats, setStats] = useState({});
  const [starters, setStarters] = useState([]);
  const [bench, setBench] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const loadTacticLineup = () => {
    if (defaultLineup.length > 0) {
      setStarters(defaultLineup.slice(0, 11));
      setBench(defaultLineup.slice(11, 18));
    }
  };

  const isHome = match.home_club_id === club.id;
  const isAway = match.away_club_id === club.id;
  const myRole = isHome ? 'home' : 'away';
  const opponent = isHome ? match.away_club_name : match.home_club_name;

  const alreadySubmitted = isHome
    ? ['home_submitted', 'confirmed'].includes(match.status)
    : ['away_submitted', 'confirmed'].includes(match.status);

  const confirmed = match.status === 'confirmed';
  const hasScore = match.home_score !== undefined && match.away_score !== undefined;

  const canSubmit = score.includes('-') && starters.length === 11 && bench.length >= 1;

  const handleSubmit = async () => {
    const [hs, as_] = score.split('-').map(s => parseInt(s.trim(), 10));
    if (isNaN(hs) || isNaN(as_)) return;
    if (starters.length !== 11) return;
    const scorersTxt = scorers.length > 0 ? scorers.join(', ') : '';
    const assistsTxt = assisters.length > 0 ? `(assists: ${assisters.join(', ')})` : '';
    const combined = [scorersTxt, assistsTxt].filter(Boolean).join(' ');
    setSubmitting(true);
    await onSubmit({
      match,
      isHome,
      homeScore: isHome ? hs : as_,
      awayScore: isHome ? as_ : hs,
      scorers: combined,
      stats,
      starters,
      bench,
      redCards,
    });
    setSubmitting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <div className="bg-slate-700 rounded-lg px-2 py-1 text-xs text-slate-400 font-semibold whitespace-nowrap">
              J{match.journee}
            </div>
            {match.match_type === 'tournoi' ? (
              <div className="bg-purple-500/20 text-purple-300 rounded-lg px-2 py-1 text-xs font-semibold whitespace-nowrap border border-purple-500/30">
                ⚔️ {match.tournament_name || 'Tournoi'}
              </div>
            ) : (
              <div className="bg-emerald-500/10 text-emerald-400 rounded-lg px-2 py-1 text-xs font-semibold whitespace-nowrap border border-emerald-500/20">
                🏆 Champ.
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-white min-w-0">
            <span className="truncate">{match.home_club_name}</span>
            {confirmed || hasScore ? (
              <span className="font-black text-emerald-400 shrink-0">
                {match.home_score} - {match.away_score}
              </span>
            ) : (
              <span className="text-slate-500 shrink-0">vs</span>
            )}
            <span className="truncate">{match.away_club_name}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {confirmed ? (
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">Confirmé</Badge>
          ) : alreadySubmitted ? (
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">En attente adv.</Badge>
          ) : (
            <Badge className="bg-slate-600/50 text-slate-400 border-slate-600">À saisir</Badge>
          )}
          <button
            onClick={() => onDelete(match)}
            disabled={deleting}
            className="text-slate-600 hover:text-red-400 transition-colors p-1"
            title="Supprimer ce match"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
          <button onClick={() => setExpanded(!expanded)} className="text-slate-400 hover:text-white transition-colors">
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-slate-700/50 p-4 space-y-4">
          {confirmed ? (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-4xl font-black text-white">{match.home_score} - {match.away_score}</p>
                <p className="text-slate-400 text-sm mt-1">{match.home_club_name} vs {match.away_club_name}</p>
              </div>
              {match.home_scorers && (
                <div className="bg-slate-700/30 rounded-xl p-3">
                  <p className="text-slate-400 text-xs mb-1">Buteurs {match.home_club_name}</p>
                  <p className="text-white text-sm">{match.home_scorers}</p>
                </div>
              )}
              {match.away_scorers && (
                <div className="bg-slate-700/30 rounded-xl p-3">
                  <p className="text-slate-400 text-xs mb-1">Buteurs {match.away_club_name}</p>
                  <p className="text-white text-sm">{match.away_scorers}</p>
                </div>
              )}
              {(match.home_stats || match.away_stats) && (
                <div className="grid grid-cols-2 gap-3">
                  {STATS_FIELDS.map(f => {
                    const hv = match.home_stats?.[f.key] ?? '-';
                    const av = match.away_stats?.[f.key] ?? '-';
                    return (
                      <div key={f.key} className="col-span-2 flex items-center gap-2 text-sm">
                        <span className="w-20 text-right font-bold text-white">{hv}</span>
                        <span className="flex-1 text-center text-slate-500 text-xs">{f.label}</span>
                        <span className="w-20 font-bold text-white">{av}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : alreadySubmitted ? (
            <div className="text-center py-4">
              <Check className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <p className="text-white font-semibold">Résultat soumis</p>
              <p className="text-slate-400 text-sm mt-1">En attente que l'adversaire saisisse le sien.</p>
              {hasScore && (
                <p className="text-emerald-400 font-bold mt-2 text-xl">{match.home_score} - {match.away_score}</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Score (ex: 2-1)</Label>
                <Input
                  value={score}
                  onChange={e => setScore(e.target.value)}
                  placeholder={isHome ? `${club.name} - ${opponent}` : `${opponent} - ${club.name}`}
                  className="bg-slate-700 border-slate-600 text-white mt-1"
                />
                <p className="text-slate-500 text-xs mt-1">
                  Format : {isHome ? `${club.name}` : opponent} d'abord, puis {isHome ? opponent : club.name}
                </p>
              </div>
              {defaultLineup.length > 0 && (
                <button
                  type="button"
                  onClick={loadTacticLineup}
                  className="w-full text-xs text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg px-3 py-2 transition-colors"
                >
                  ⚡ Charger la dernière compo (tactiques)
                </button>
              )}
              <PlayerPicker
                players={players}
                label={`🟢 Titulaires — OBLIGATOIRE (${starters.length}/11 sélectionnés)`}
                selected={starters}
                onChange={setStarters}
              />
              {starters.length !== 11 && (
                <p className="text-red-400 text-xs">⚠️ Vous devez sélectionner exactement 11 titulaires</p>
              )}
              <PlayerPicker
                players={players}
                label={`🟡 Banc — OBLIGATOIRE (${bench.length} sélectionné${bench.length > 1 ? 's' : ''})`}
                selected={bench}
                onChange={setBench}
              />
              {bench.length === 0 && (
                <p className="text-red-400 text-xs">⚠️ Vous devez sélectionner au moins 1 remplaçant</p>
              )}
              <PlayerPicker
                players={players}
                label="Vos buteurs (optionnel — cliquez plusieurs fois pour plusieurs buts)"
                selected={scorers}
                onChange={setScorers}
                multi
              />
              <PlayerPicker
                players={players}
                label="Vos passeurs décisifs (optionnel — cliquez plusieurs fois pour plusieurs passes)"
                selected={assisters}
                onChange={setAssisters}
                multi
              />
              <div>
                <p className="text-slate-300 text-sm font-medium mb-2">Vos stats (optionnel)</p>
                <div className="grid grid-cols-2 gap-2">
                  {STATS_FIELDS.map(f => (
                    <div key={f.key}>
                      <Label className="text-slate-400 text-xs">{f.label}</Label>
                      <Input
                        type="number"
                        value={stats[f.key] || ''}
                        onChange={e => setStats(prev => ({ ...prev, [f.key]: e.target.value }))}
                        className="bg-slate-700 border-slate-600 text-white h-8 text-sm mt-0.5"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <PlayerPicker
                players={players}
                label="🟥 Cartons rouges (joueurs suspendus au prochain match)"
                selected={redCards}
                onChange={setRedCards}
              />
              <Button
                onClick={handleSubmit}
                disabled={submitting || !canSubmit}
                className="w-full bg-emerald-500 hover:bg-emerald-600"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                Soumettre le résultat
              </Button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default function MatchTab({ club, user, clubs = [] }) {
  // Fetch active tactic for pre-filling lineup
  const { data: tactics = [] } = useQuery({
    queryKey: ['tactics', club.id],
    queryFn: () => base44.entities.Tactic.filter({ club_id: club.id, is_active: true }),
    enabled: !!club.id,
  });
  const activeTacticLineup = (tactics[0]?.lineup || []).map(l => l.player_name).filter(Boolean);
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newJournee, setNewJournee] = useState('');
  const [newOpponent, setNewOpponent] = useState('');
  const [newIsHome, setNewIsHome] = useState(true);
  const [newMatchType, setNewMatchType] = useState('championnat');
  const [newTournamentName, setNewTournamentName] = useState('');

  const { data: players = [] } = useQuery({
    queryKey: ['players', club.id],
    queryFn: () => base44.entities.Player.filter({ club_id: club.id }),
    enabled: !!club.id,
  });

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ['matches', club.id],
    queryFn: async () => {
      const home = await base44.entities.Match.filter({ home_club_id: club.id });
      const away = await base44.entities.Match.filter({ away_club_id: club.id });
      const all = [...home, ...away];
      all.sort((a, b) => b.journee - a.journee);
      return all;
    },
    enabled: !!club.id
  });

  const [deletingId, setDeletingId] = useState(null);

  const deleteMatch = useMutation({
    mutationFn: async (match) => {
      setDeletingId(match.id);
      if (match.status === 'confirmed' && match.home_score !== undefined) {
        const hs = match.home_score;
        const as_ = match.away_score;
        const homeWin = hs > as_;
        const awayWin = as_ > hs;
        const draw = hs === as_;
        const [homeClubs, awayClubs] = await Promise.all([
          base44.entities.Club.filter({ id: match.home_club_id }),
          base44.entities.Club.filter({ id: match.away_club_id }),
        ]);
        if (homeClubs.length > 0) {
          const hc = homeClubs[0];
          await base44.entities.Club.update(match.home_club_id, {
            wins: Math.max(0, (hc.wins || 0) - (homeWin ? 1 : 0)),
            draws: Math.max(0, (hc.draws || 0) - (draw ? 1 : 0)),
            losses: Math.max(0, (hc.losses || 0) - (awayWin ? 1 : 0)),
            goals_for: Math.max(0, (hc.goals_for || 0) - hs),
            goals_against: Math.max(0, (hc.goals_against || 0) - as_),
            points: Math.max(0, (hc.points || 0) - (homeWin ? 3 : draw ? 1 : 0)),
          });
        }
        if (awayClubs.length > 0) {
          const ac = awayClubs[0];
          await base44.entities.Club.update(match.away_club_id, {
            wins: Math.max(0, (ac.wins || 0) - (awayWin ? 1 : 0)),
            draws: Math.max(0, (ac.draws || 0) - (draw ? 1 : 0)),
            losses: Math.max(0, (ac.losses || 0) - (homeWin ? 1 : 0)),
            goals_for: Math.max(0, (ac.goals_for || 0) - as_),
            goals_against: Math.max(0, (ac.goals_against || 0) - hs),
            points: Math.max(0, (ac.points || 0) - (awayWin ? 3 : draw ? 1 : 0)),
          });
        }
      }
      await base44.entities.Match.delete(match.id);
    },
    onSuccess: () => {
      setDeletingId(null);
      queryClient.invalidateQueries({ queryKey: ['matches', club.id] });
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
    },
    onError: () => setDeletingId(null),
  });

  const createMatch = useMutation({
    mutationFn: async () => {
      const oppClub = clubs.find(c => c.id === newOpponent);
      await base44.entities.Match.create({
        journee: parseInt(newJournee),
        match_type: newMatchType,
        tournament_name: newMatchType === 'tournoi' ? newTournamentName : undefined,
        home_club_id: newIsHome ? club.id : oppClub?.id || newOpponent,
        home_club_name: newIsHome ? club.name : oppClub?.name || newOpponent,
        away_club_id: newIsHome ? oppClub?.id || newOpponent : club.id,
        away_club_name: newIsHome ? oppClub?.name || newOpponent : club.name,
        status: 'pending'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches', club.id] });
      setShowCreate(false);
      setNewJournee('');
      setNewOpponent('');
    }
  });

  const submitResult = useMutation({
    mutationFn: async ({ match, isHome, homeScore, awayScore, scorers, stats, starters = [], bench = [], redCards = [] }) => {
      const updateData = { home_score: homeScore, away_score: awayScore };
      if (isHome) {
        updateData.home_scorers = scorers;
        updateData.home_stats = stats;
        updateData.home_submitted_by = user.id;
        updateData.status = match.status === 'away_submitted' ? 'confirmed' : 'home_submitted';
      } else {
        updateData.away_scorers = scorers;
        updateData.away_stats = stats;
        updateData.away_submitted_by = user.id;
        updateData.status = match.status === 'home_submitted' ? 'confirmed' : 'away_submitted';
      }
      // Sauvegarder les cartons rouges (merge avec existants)
      if (redCards.length > 0) {
        const existing = match.red_cards || [];
        const allRed = [...new Set([...existing, ...redCards])];
        updateData.red_cards = allRed;
        // Marquer les joueurs suspendus
        for (const playerName of redCards) {
          const player = players.find(p => p.name === playerName);
          if (player) {
            await base44.entities.Player.update(player.id, { is_suspended: true, suspension_reason: `Carton rouge J${match.journee}` });
          }
        }
      }
      await base44.entities.Match.update(match.id, updateData);

      // Stats championnat uniquement (pas tournoi)
      if (updateData.status === 'confirmed' && match.match_type !== 'tournoi') {
        const homeWin = homeScore > awayScore;
        const awayWin = awayScore > homeScore;
        const draw = homeScore === awayScore;
        const [homeClubData, awayClubData] = await Promise.all([
          base44.entities.Club.filter({ id: match.home_club_id }),
          base44.entities.Club.filter({ id: match.away_club_id }),
        ]);
        if (homeClubData.length > 0) {
          const hc = homeClubData[0];
          await base44.entities.Club.update(match.home_club_id, {
            wins: (hc.wins || 0) + (homeWin ? 1 : 0),
            draws: (hc.draws || 0) + (draw ? 1 : 0),
            losses: (hc.losses || 0) + (awayWin ? 1 : 0),
            goals_for: (hc.goals_for || 0) + homeScore,
            goals_against: (hc.goals_against || 0) + awayScore,
            points: (hc.points || 0) + (homeWin ? 3 : draw ? 1 : 0),
          });
        }
        if (awayClubData.length > 0) {
          const ac = awayClubData[0];
          await base44.entities.Club.update(match.away_club_id, {
            wins: (ac.wins || 0) + (awayWin ? 1 : 0),
            draws: (ac.draws || 0) + (draw ? 1 : 0),
            losses: (ac.losses || 0) + (homeWin ? 1 : 0),
            goals_for: (ac.goals_for || 0) + awayScore,
            goals_against: (ac.goals_against || 0) + homeScore,
            points: (ac.points || 0) + (awayWin ? 3 : draw ? 1 : 0),
          });
        }
      }

      // Messages joueurs post-match (anti-doublon)
      const isMyMatch = match.home_club_id === club.id || match.away_club_id === club.id;
      if (isMyMatch) {
        const existingMsgs = await base44.entities.PlayerMessage.filter({ match_id: match.id, club_id: club.id });
        if (existingMsgs.length === 0) {
          const myScore = isHome ? homeScore : awayScore;
          const oppScore = isHome ? awayScore : homeScore;
          const resultLabel = myScore > oppScore ? 'victoire' : myScore < oppScore ? 'défaite' : 'match nul';
          const scoreStr = `${myScore}-${oppScore}`;
          const opponent = isHome ? match.away_club_name : match.home_club_name;
          const playedPlayers = players.filter(p => starters.includes(p.name) || bench.includes(p.name));
          const pool = playedPlayers.length > 0 ? playedPlayers : players;
          const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(3, pool.length));

          for (const player of shuffled) {
            const wasStarter = starters.includes(player.name);
            const wasBench = bench.includes(player.name);
            const wasAbsent = !wasStarter && !wasBench && (starters.length > 0 || bench.length > 0);
            let messageType = 'match_reaction';
            let context = '';
            if (wasAbsent) {
              messageType = 'playtime';
              context = `Il n'était pas dans le groupe pour ce match contre ${opponent} (${scoreStr} - ${resultLabel}).`;
            } else if (wasBench) {
              messageType = 'playtime';
              context = `Il était sur le banc contre ${opponent} (${scoreStr} - ${resultLabel}).`;
            } else {
              context = `Match contre ${opponent} : ${resultLabel} ${scoreStr}.`;
            }
            const morale = wasAbsent ? 35 : wasBench ? 50 : (myScore > oppScore ? 75 : myScore < oppScore ? 45 : 60);
            const emotion = morale >= 70 ? 'happy' : morale >= 55 ? 'neutral' : morale >= 40 ? 'unhappy' : 'angry';
            const result = await base44.integrations.Core.InvokeLLM({
              prompt: `Tu es un joueur de football FIFA nommé ${player.name} (${player.position}, note ${player.overall}). Tu joues pour ${club.name}. ${context} Écris un message court (2-3 phrases max) en français que tu enverrais à ton manager. Sois authentique.`,
              response_json_schema: { type: 'object', properties: { message: { type: 'string' } } }
            });
            await base44.entities.PlayerMessage.create({
              player_id: player.id,
              player_name: player.name,
              player_position: player.position,
              player_overall: player.overall,
              player_image_url: player.image_url,
              club_id: club.id,
              club_name: club.name,
              message_type: messageType,
              content: result.message || '',
              emotion,
              morale,
              is_read: false,
              match_id: match.id,
              match_result: `${resultLabel} ${scoreStr} vs ${opponent}`,
            });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches', club.id] });
      queryClient.invalidateQueries({ queryKey: ['player-messages', club.id] });
      queryClient.invalidateQueries({ queryKey: ['players', club.id] });
    }
  });

  const availableOpponents = clubs.filter(c => c.id !== club.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Swords className="w-5 h-5 text-emerald-400" />
          Mes Matchs
        </h2>
        <Button
          onClick={() => setShowCreate(!showCreate)}
          size="sm"
          className="bg-emerald-500 hover:bg-emerald-600"
        >
          <Plus className="w-4 h-4 mr-1" />
          Ajouter un match
        </Button>
      </div>

      {/* Formulaire création */}
      {showCreate && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/70 border border-slate-700 rounded-2xl p-5 space-y-4"
        >
          <h3 className="text-white font-semibold">Nouveau match</h3>
          {/* Type de match */}
          <div>
            <Label className="text-slate-300">Type de match</Label>
            <div className="flex gap-2 mt-1">
              <Button
                size="sm"
                onClick={() => setNewMatchType('championnat')}
                className={newMatchType === 'championnat' ? 'bg-emerald-500 hover:bg-emerald-600' : 'border-slate-600 text-slate-300 bg-transparent border'}
              >
                🏆 Championnat
              </Button>
              <Button
                size="sm"
                onClick={() => setNewMatchType('tournoi')}
                className={newMatchType === 'tournoi' ? 'bg-purple-500 hover:bg-purple-600' : 'border-slate-600 text-slate-300 bg-transparent border'}
              >
                ⚔️ Tournoi
              </Button>
            </div>
          </div>
          {newMatchType === 'tournoi' && (
            <div>
              <Label className="text-slate-300">Nom du tournoi</Label>
              <Input
                value={newTournamentName}
                onChange={e => setNewTournamentName(e.target.value)}
                placeholder="Ex: Coupe SuperLigue"
                className="bg-slate-700 border-slate-600 text-white mt-1"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-300">Journée n°</Label>
              <Input
                type="number"
                value={newJournee}
                onChange={e => setNewJournee(e.target.value)}
                placeholder="Ex: 5"
                className="bg-slate-700 border-slate-600 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-300">Domicile/Extérieur</Label>
              <div className="flex gap-2 mt-1">
                <Button
                  size="sm"
                  variant={newIsHome ? 'default' : 'outline'}
                  onClick={() => setNewIsHome(true)}
                  className={newIsHome ? 'bg-emerald-500 hover:bg-emerald-600' : 'border-slate-600 text-slate-300'}
                >
                  <Shield className="w-3 h-3 mr-1" /> Domicile
                </Button>
                <Button
                  size="sm"
                  variant={!newIsHome ? 'default' : 'outline'}
                  onClick={() => setNewIsHome(false)}
                  className={!newIsHome ? 'bg-blue-500 hover:bg-blue-600' : 'border-slate-600 text-slate-300'}
                >
                  Extérieur
                </Button>
              </div>
            </div>
          </div>
          <div>
            <Label className="text-slate-300">Adversaire</Label>
            <select
              value={newOpponent}
              onChange={e => setNewOpponent(e.target.value)}
              className="w-full mt-1 bg-slate-700 border border-slate-600 text-white rounded-md px-3 py-2 text-sm"
            >
              <option value="">-- Choisir un adversaire --</option>
              {availableOpponents.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => createMatch.mutate()}
              disabled={!newJournee || !newOpponent || createMatch.isPending}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              {createMatch.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Créer
            </Button>
            <Button variant="ghost" className="text-slate-400" onClick={() => setShowCreate(false)}>
              Annuler
            </Button>
          </div>
        </motion.div>
      )}

      {/* Liste des matchs */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-16">
          <Trophy className="w-14 h-14 mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400 text-lg font-medium">Aucun match enregistré</p>
          <p className="text-slate-500 text-sm mt-1">Ajoutez un match pour saisir vos résultats.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map(match => (
            <MatchCard
              key={match.id}
              match={match}
              club={club}
              user={user}
              players={players}
              onSubmit={(data) => submitResult.mutate(data)}
              defaultLineup={activeTacticLineup}
              onDelete={(m) => deleteMatch.mutate(m)}
              loading={submitResult.isPending}
              deleting={deletingId === match.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}