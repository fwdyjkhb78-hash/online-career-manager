import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trophy, Users, Shuffle, CalendarDays, ChevronRight, Check, ArrowRight, List, GitMerge, LayoutGrid, HelpCircle, Star, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import ChapeauxLdcConfig from './ChapeauxLdcConfig';

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Distribue des paires en journées : chaque équipe joue max 1 match/journée.
 * Le nombre de journées = matchs par équipe (garanti).
 * Simple greedy avec shuffles pour équilibrer.
 */
function assignToRounds(pairs, matchesPerTeam) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const shuffled = shuffle([...pairs]);
    const rounds = Array.from({ length: matchesPerTeam }, () => ({ matches: [], used: new Set() }));

    let allPlaced = true;
    for (const pair of shuffled) {
      const a = pair.a || pair.home?.id;
      const b = pair.b || pair.away?.id;
      // Cherche une journée où ni a ni b ne jouent encore, en préférant celle avec le moins de matchs
      const available = rounds
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => !r.used.has(a) && !r.used.has(b))
        .sort((x, y) => x.r.matches.length - y.r.matches.length);

      if (available.length === 0) { allPlaced = false; break; }
      const { r } = available[0];
      r.matches.push(pair);
      r.used.add(a);
      r.used.add(b);
    }

    if (allPlaced) {
      return rounds.map((r, i) => ({ journee: i + 1, matches: r.matches }));
    }
  }

  // Fallback ultime : greedy séquentiel (ne devrait pas arriver)
  const rounds = [];
  const remaining = [...pairs];
  let journee = 1;
  while (remaining.length > 0 && journee <= 999) {
    const used = new Set();
    const round = { journee, matches: [] };
    const leftover = [];
    for (const pair of remaining) {
      const a = pair.a || pair.home?.id;
      const b = pair.b || pair.away?.id;
      if (!used.has(a) && !used.has(b)) {
        round.matches.push(pair);
        used.add(a); used.add(b);
      } else leftover.push(pair);
    }
    if (round.matches.length > 0) rounds.push(round);
    remaining.length = 0;
    remaining.push(...leftover);
    journee++;
  }
  return rounds;
}

function generateRoundRobin(teams, allerRetour = true) {
  const list = teams.length % 2 === 0 ? [...teams] : [...teams, null];
  const n = list.length;
  const rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const matches = [];
    for (let i = 0; i < n / 2; i++) {
      const home = list[i], away = list[n - 1 - i];
      if (home && away) matches.push({ home, away });
    }
    rounds.push({ journee: r + 1, matches });
    list.splice(1, 0, list.pop());
  }
  if (!allerRetour) return rounds;
  return [
    ...rounds,
    ...rounds.map((round, i) => ({
      journee: rounds.length + i + 1,
      matches: round.matches.map(m => ({ home: m.away, away: m.home })),
    })),
  ];
}

function generateKnockout(teams, startJournee = 1) {
  let list = [...teams];
  const rounds = [];
  let journee = startJournee;
  while (list.length > 1) {
    const matches = [];
    const next = [];
    for (let i = 0; i < list.length; i += 2) {
      if (i + 1 < list.length) {
        matches.push({ home: list[i], away: list[i + 1] });
        next.push({ id: `W_${list[i].id}_${list[i + 1].id}`, name: `Vainqueur (${list[i].name} vs ${list[i + 1].name})` });
      } else {
        next.push(list[i]);
      }
    }
    rounds.push({ journee, label: getRoundLabel(list.length), matches });
    list = next;
    journee++;
  }
  return rounds;
}

function getRoundLabel(n) {
  if (n === 2) return 'Finale';
  if (n === 4) return 'Demi-finales';
  if (n === 8) return 'Quarts de finale';
  if (n === 16) return 'Huitièmes de finale';
  return `Tour (${n} équipes)`;
}

// ──────────────────────────────────────────
// Preview rendering
// ──────────────────────────────────────────

function MatchLine({ home, away }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-300">
      <span className="flex-1 text-right truncate">{home}</span>
      <span className="text-slate-600 text-xs shrink-0">vs</span>
      <span className="flex-1 truncate">{away}</span>
    </div>
  );
}

function RoundBlock({ round, color = 'emerald', label }) {
  return (
    <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-3">
      <p className={`text-${color}-400 text-xs font-bold mb-2`}>{label || `Journée ${round.journee}`}{round.label ? ` — ${round.label}` : ''}</p>
      <div className="space-y-1">
        {round.matches.map((m, i) => (
          <MatchLine key={i} home={m.home.name} away={m.away.name} />
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// Main component
// ──────────────────────────────────────────

/**
 * props:
 *   teams: Array<{ id, name }> — les équipes/clubs à inclure
 *   mode: 'club' | 'national' — pour savoir comment créer les matchs
 *   tournamentId: string|null — pour les matchs de type 'tournoi'
 *   tournamentName: string — nom du tournoi
 *   queryKeyToInvalidate: string[] — ex: ['matches'] ou ['national-league-matches', id]
 *   onDone: () => void
 */
const CHAPEAU_LS_KEY = 'chapeaux_ldc_config';

function loadChapeauxConfig(tournamentId) {
  try {
    const key = tournamentId ? `${CHAPEAU_LS_KEY}_${tournamentId}` : CHAPEAU_LS_KEY;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveChapeauxConfig(tournamentId, config) {
  try {
    const key = tournamentId ? `${CHAPEAU_LS_KEY}_${tournamentId}` : CHAPEAU_LS_KEY;
    localStorage.setItem(key, JSON.stringify(config));
  } catch {}
}

export default function LeagueFormatManager({ teams, mode = 'club', tournamentId = null, tournamentName = '', queryKeyToInvalidate = ['matches'], onDone, tournament = null }) {
  const queryClient = useQueryClient();

  const [format, setFormat] = useState(null);
  const [allerRetour, setAllerRetour] = useState(true);
  const [koCount, setKoCount] = useState(4);
  const [groupCount, setGroupCount] = useState(2);
  const [ldcMatchCount, setLdcMatchCount] = useState(6);
  const [ldcKoCount, setLdcKoCount] = useState(8);
  const [preview, setPreview] = useState(null);
  const [savingChapeaux, setSavingChapeaux] = useState(false);

  // Chapeaux LDC state — initialisé depuis tournoi (DB) ou localStorage
  const savedConfig = tournament?.chapeau_config || loadChapeauxConfig(tournamentId);
  const [chapeauCount, setChapeauCount] = useState(savedConfig?.chapeauCount || 4);
  const [chapeaux, setChapeaux] = useState(savedConfig?.chapeaux || {});
  const [chapeauxMatchCount, setChapeauxMatchCount] = useState(savedConfig?.chapeauxMatchCount || 8);
  const [chapeauxKoCount, setChapeauxKoCount] = useState(savedConfig?.chapeauxKoCount || 8);

  // Custom format state
  const [customMatches, setCustomMatches] = useState([]); // [{journee, homeId, awayId}]
  const [customJournee, setCustomJournee] = useState(1);
  const [customHome, setCustomHome] = useState('');
  const [customAway, setCustomAway] = useState('');

  const getName = (t) => mode === 'national' ? (t.country || t.name) : t.name;

  const teamsWithName = teams.map(t => ({ ...t, name: getName(t) }));

  // ── Génération ──

  const generatePreview = () => {
    if (teamsWithName.length < 2) { toast.error('Pas assez d\'équipes'); return; }

    if (format === 'champ') {
      const rounds = generateRoundRobin(teamsWithName, allerRetour);
      setPreview({ type: 'champ', rounds });
    }

    if (format === 'champ_ko') {
      if ((koCount & (koCount - 1)) !== 0) { toast.error('Le nombre de qualifiés doit être une puissance de 2'); return; }
      if (koCount > teamsWithName.length) { toast.error('Nombre de qualifiés supérieur au nombre d\'équipes'); return; }
      const all = generateRoundRobin(teamsWithName, allerRetour);
      const qualifiers = Array.from({ length: koCount }, (_, i) => ({
        id: `Q${i + 1}`,
        name: `${i + 1}${i === 0 ? 'er' : 'ème'} qualifié`,
      }));
      const koRounds = generateKnockout(shuffle(qualifiers), all[all.length - 1].journee + 1);
      setPreview({ type: 'champ_ko', rounds: all, koRounds, koCount });
    }

    if (format === 'ldc') {
      const n = teamsWithName.length;
      if (n < 4) { toast.error('Il faut au moins 4 équipes pour la phase de ligue LDC'); return; }
      if (ldcMatchCount < 2 || ldcMatchCount >= n) { toast.error(`Le nombre de matchs par équipe doit être entre 2 et ${n - 1}`); return; }
      if ((ldcKoCount & (ldcKoCount - 1)) !== 0) { toast.error('Le nombre de qualifiés doit être une puissance de 2'); return; }

      // Générer les paires uniques (pas de round-robin complet, juste les matchs nécessaires)
      // Pour ldcMatchCount matchs par équipe : total matchs = n * ldcMatchCount / 2
      const shuffledTeams = shuffle(teamsWithName);

      // Construire toutes les paires possibles
      const allPairs = [];
      for (let i = 0; i < shuffledTeams.length; i++) {
        for (let j = i + 1; j < shuffledTeams.length; j++) {
          allPairs.push({ home: shuffledTeams[i], away: shuffledTeams[j] });
        }
      }
      shuffle(allPairs);

      // Assigner exactement ldcMatchCount matchs par équipe
      const matchCounts = {};
      shuffledTeams.forEach(t => { matchCounts[t.id] = 0; });
      const selectedPairs = [];
      for (const pair of allPairs) {
        if (matchCounts[pair.home.id] < ldcMatchCount && matchCounts[pair.away.id] < ldcMatchCount) {
          selectedPairs.push(pair);
          matchCounts[pair.home.id]++;
          matchCounts[pair.away.id]++;
        }
        if (selectedPairs.length >= (n * ldcMatchCount) / 2) break;
      }

      // Répartir en journées — exactement ldcMatchCount journées
      const pairsForRounds = selectedPairs.map(p => ({ a: p.home.id, b: p.away.id, home: p.home, away: p.away }));
      const rawRounds = assignToRounds(pairsForRounds, ldcMatchCount);
      const rounds = rawRounds.map((r, i) => ({
        journee: i + 1,
        matches: r.matches.map(p => ({ home: p.home, away: p.away })),
      })).filter(r => r.matches.length > 0);

      const qualifiers = Array.from({ length: ldcKoCount }, (_, i) => ({
        id: `Q${i + 1}`,
        name: `${i + 1}${i === 0 ? 'er' : 'ème'} qualifié`,
      }));
      const koRounds = generateKnockout(shuffle(qualifiers), rounds.length + 1);
      setPreview({ type: 'ldc', rounds, koRounds, ldcMatchCount, ldcKoCount });
    }

    if (format === 'chapeaux_ldc') {
      // Validation
      const chapNames = Array.from({ length: chapeauCount }, (_, i) => `Chapeau ${i + 1}`);
      const allAssigned = chapNames.flatMap(c => chapeaux[c] || []);
      if (allAssigned.length < 4) { toast.error('Répartissez au moins 4 équipes dans les chapeaux'); return; }
      if (chapeauxMatchCount < 2) { toast.error('Il faut au moins 2 matchs par équipe'); return; }

      // matchs par chapeau = chapeauxMatchCount / chapeauCount
      // Chaque équipe joue matchsParChapeau matchs contre chaque chapeau (y compris le sien)
      const matchsParChapeau = chapeauxMatchCount / chapeauCount;
      if (!Number.isInteger(matchsParChapeau)) {
        toast.error(`${chapeauxMatchCount} matchs ne se divisent pas équitablement en ${chapeauCount} chapeaux`);
        return;
      }

      const chapTeams = chapNames.map(c => (chapeaux[c] || []).map(id => teamsWithName.find(t => t.id === id)).filter(Boolean));

      const allPairs = [];

      for (let ci = 0; ci < chapNames.length; ci++) {
        for (let cj = ci + 1; cj < chapNames.length; cj++) {
          // Générer les matchs entre chapeau ci et chapeau cj
          // Quota : matchsParChapeau matchs par équipe dans ce croisement
          const teamsA = shuffle([...chapTeams[ci]]);
          const teamsB = shuffle([...chapTeams[cj]]);

          const countA = {};
          const countB = {};
          teamsA.forEach(t => { countA[t.id] = 0; });
          teamsB.forEach(t => { countB[t.id] = 0; });

          const crossPairs = shuffle(teamsA.flatMap(a => teamsB.map(b => ({ a, b }))));

          for (const pair of crossPairs) {
            if (countA[pair.a.id] < matchsParChapeau && countB[pair.b.id] < matchsParChapeau) {
              allPairs.push({ a: pair.a.id, b: pair.b.id });
              countA[pair.a.id]++;
              countB[pair.b.id]++;
            }
          }
        }
      }

      // Pour le chapeau de l'équipe elle-même : matchsParChapeau matchs contre ses propres coéquipiers de chapeau
      for (let ci = 0; ci < chapNames.length; ci++) {
        const chapTeamList = shuffle([...chapTeams[ci]]);
        const countSelf = {};
        chapTeamList.forEach(t => { countSelf[t.id] = 0; });

        const selfPairs = shuffle(
          chapTeamList.flatMap((a, ai) => chapTeamList.slice(ai + 1).map(b => ({ a, b })))
        );

        for (const pair of selfPairs) {
          if (countSelf[pair.a.id] < matchsParChapeau && countSelf[pair.b.id] < matchsParChapeau) {
            allPairs.push({ a: pair.a.id, b: pair.b.id });
            countSelf[pair.a.id]++;
            countSelf[pair.b.id]++;
          }
        }
      }

      // Répartir les paires en journées — exactement chapeauxMatchCount journées
      const enrichedPairs = allPairs.map(p => ({
        ...p,
        home: teamsWithName.find(t => t.id === p.a),
        away: teamsWithName.find(t => t.id === p.b),
      })).filter(p => p.home && p.away);
      const rawRounds = assignToRounds(enrichedPairs, chapeauxMatchCount);
      const rounds = rawRounds.map((r, i) => ({
        journee: i + 1,
        matches: r.matches.map(p => ({ home: p.home, away: p.away })),
      })).filter(r => r.matches.length > 0);

      const qualifiers = Array.from({ length: chapeauxKoCount }, (_, i) => ({
        id: `Q${i + 1}`,
        name: `${i + 1}${i === 0 ? 'er' : 'ème'} qualifié`,
      }));
      const koRounds = generateKnockout(shuffle(qualifiers), rounds.length + 1);

      // Résumé par chapeau pour affichage
      setPreview({ type: 'chapeaux_ldc', rounds, koRounds, chapTeams, chapNames, chapeauxMatchCount, chapeauxKoCount, matchsParChapeau });
    }

    if (format === 'poules_simples') {
      if (teamsWithName.length < groupCount * 2) { toast.error('Pas assez d\'équipes pour ce nombre de poules'); return; }
      const shuffled = shuffle(teamsWithName);
      const groups = Array.from({ length: groupCount }, (_, i) => ({ name: `Groupe ${String.fromCharCode(65 + i)}`, clubs: [] }));
      shuffled.forEach((t, i) => groups[i % groupCount].clubs.push(t));

      let journee = 1;
      const groupRounds = [];
      groups.forEach(group => {
        const rr = generateRoundRobin(group.clubs, allerRetour);
        rr.forEach(round => {
          groupRounds.push({ journee: journee++, groupName: group.name, matches: round.matches });
        });
      });
      setPreview({ type: 'poules_simples', groups, groupRounds });
    }

    if (format === 'poules_ko') {
      if (teamsWithName.length < groupCount * 2) { toast.error('Pas assez d\'équipes pour ce nombre de poules'); return; }
      const shuffled = shuffle(teamsWithName);
      const groups = Array.from({ length: groupCount }, (_, i) => ({ name: `Groupe ${String.fromCharCode(65 + i)}`, clubs: [] }));
      shuffled.forEach((t, i) => groups[i % groupCount].clubs.push(t));

      let journee = 1;
      const groupRounds = [];
      groups.forEach(group => {
        const rr = generateRoundRobin(group.clubs, false); // aller simple dans les poules
        rr.forEach(round => {
          groupRounds.push({ journee: journee++, groupName: group.name, matches: round.matches });
        });
      });

      const qualifiers = groups.flatMap(g => [
        { id: `${g.name}_1`, name: `1er ${g.name}` },
        { id: `${g.name}_2`, name: `2ème ${g.name}` },
      ]);
      const koRounds = generateKnockout(shuffle(qualifiers), journee);
      setPreview({ type: 'poules_ko', groups, groupRounds, koRounds });
    }
  };

  // ── Import ──

  const buildMatch = (home, away, journee) => ({
    journee,
    match_type: tournamentId ? 'tournoi' : 'championnat',
    ...(tournamentId ? { tournament_id: tournamentId, tournament_name: tournamentName } : {}),
    // Pour le format LDC/Europa sans tournamentId, on stocke quand même le tournament_name
    ...((!tournamentId && tournamentName) ? { tournament_name: tournamentName } : {}),
    home_club_id: home.id,
    home_club_name: home.name,
    away_club_id: away.id,
    away_club_name: away.name,
    status: 'pending',
  });

  const importCustomMatches = useMutation({
    mutationFn: async (matches) => {
      const toCreate = matches.map(m => buildMatch(
        teamsWithName.find(t => t.id === m.homeId),
        teamsWithName.find(t => t.id === m.awayId),
        m.journee
      ));
      await base44.entities.Match.bulkCreate(toCreate);
      return toCreate.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} matchs créés avec succès !`);
      queryKeyToInvalidate.forEach(k => queryClient.invalidateQueries({ queryKey: Array.isArray(k) ? k : [k] }));
      setCustomMatches([]);
      onDone?.();
    },
    onError: (e) => toast.error(e.message),
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!preview) throw new Error('Génère d\'abord');
      let count = 0;

      if (preview.type === 'champ') {
        const toCreate = preview.rounds.flatMap(r => r.matches.map(m => buildMatch(m.home, m.away, r.journee)));
        await base44.entities.Match.bulkCreate(toCreate);
        count = toCreate.length;
      }

      if (preview.type === 'champ_ko') {
        // On crée seulement la phase de championnat, la phase KO sera à créer après
        const toCreate = preview.rounds.flatMap(r => r.matches.map(m => buildMatch(m.home, m.away, r.journee)));
        await base44.entities.Match.bulkCreate(toCreate);
        count = toCreate.length;
        toast.success(`${count} matchs de championnat créés ! La phase KO sera à générer après le classement final.`);
        return count;
      }

      if (preview.type === 'ldc') {
        const toCreate = preview.rounds.flatMap(r => r.matches.map(m => buildMatch(m.home, m.away, r.journee)));
        await base44.entities.Match.bulkCreate(toCreate);
        count = toCreate.length;
        toast.success(`${count} matchs de phase de ligue LDC créés ! La phase KO sera à générer après le classement.`);
        return count;
      }

      if (preview.type === 'chapeaux_ldc') {
        const toCreate = preview.rounds.flatMap(r => r.matches.map(m => buildMatch(m.home, m.away, r.journee)));
        await base44.entities.Match.bulkCreate(toCreate);
        count = toCreate.length;
        toast.success(`${count} matchs de phase de ligue (chapeaux LDC) créés ! La phase KO sera à générer après le classement.`);
        return count;
      }

      if (preview.type === 'poules_simples') {
        if (tournamentId) {
          const groups = preview.groups.map(g => ({
            group_name: g.name,
            club_ids: g.clubs.map(c => c.id),
            club_names: g.clubs.map(c => c.name),
          }));
          await base44.entities.Tournament.update(tournamentId, { groups });
        }
        const toCreate = preview.groupRounds.flatMap(r => r.matches.map(m => buildMatch(m.home, m.away, r.journee)));
        await base44.entities.Match.bulkCreate(toCreate);
        count = toCreate.length;
        toast.success(`${count} matchs de poules créés !`);
        return count;
      }

      if (preview.type === 'poules_ko') {
        // Sauvegarder les groupes dans le tournoi
        const groups = preview.groups.map(g => ({
          group_name: g.name,
          club_ids: g.clubs.map(c => c.id),
          club_names: g.clubs.map(c => c.name),
        }));
        await base44.entities.Tournament.update(tournamentId, { groups });

        const toCreate = preview.groupRounds.flatMap(r => r.matches.map(m => buildMatch(m.home, m.away, r.journee)));
        await base44.entities.Match.bulkCreate(toCreate);
        count = toCreate.length;
        toast.success(`${count} matchs de poules créés ! La phase KO sera à générer après les poules.`);
        return count;
      }



      return count;
    },
    onSuccess: (count) => {
      if (preview?.type === 'champ') toast.success(`${count} matchs créés avec succès !`);
      queryKeyToInvalidate.forEach(k => queryClient.invalidateQueries({ queryKey: Array.isArray(k) ? k : [k] }));
      setPreview(null);
      onDone?.();
    },
    onError: (e) => toast.error(e.message),
  });

  const FORMATS = [
    {
      key: 'champ',
      label: 'Ligue',
      desc: 'Tous jouent entre eux (aller ou aller-retour)',
      activeClass: 'border-emerald-500 bg-emerald-500/10',
      iconColor: 'text-white',
      Icon: () => (
        <svg viewBox="0 0 40 32" className="w-10 h-8" fill="white">
          <rect x="0" y="2" width="6" height="4" rx="1"/>
          <rect x="10" y="0" width="30" height="4" rx="1"/>
          <rect x="0" y="14" width="6" height="4" rx="1"/>
          <rect x="10" y="12" width="30" height="4" rx="1"/>
          <rect x="0" y="26" width="6" height="4" rx="1"/>
          <rect x="10" y="24" width="30" height="4" rx="1"/>
        </svg>
      ),
    },
    {
      key: 'champ_ko',
      label: 'Ligue + Éliminatoire',
      desc: 'Championnat puis les N premiers en KO direct',
      activeClass: 'border-blue-500 bg-blue-500/10',
      iconColor: 'text-white',
      Icon: () => (
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 40 32" className="w-8 h-7" fill="white">
            <rect x="0" y="2" width="5" height="3" rx="1"/>
            <rect x="8" y="0" width="22" height="3" rx="1"/>
            <rect x="0" y="12" width="5" height="3" rx="1"/>
            <rect x="8" y="10" width="22" height="3" rx="1"/>
            <rect x="0" y="22" width="5" height="3" rx="1"/>
            <rect x="8" y="20" width="22" height="3" rx="1"/>
          </svg>
          <svg viewBox="0 0 36 28" className="w-9 h-7" fill="white">
            <rect x="0" y="2" width="12" height="4" rx="1"/>
            <rect x="0" y="12" width="12" height="4" rx="1"/>
            <rect x="0" y="22" width="12" height="4" rx="1"/>
            <path d="M12 4 L18 4 L18 14 L24 14" stroke="white" strokeWidth="2" fill="none"/>
            <path d="M12 24 L18 24 L18 14" stroke="white" strokeWidth="2" fill="none"/>
            <rect x="24" y="12" width="12" height="4" rx="1"/>
          </svg>
        </div>
      ),
    },
    {
      key: 'poules_simples',
      label: 'Poules simples',
      desc: 'Répartition en poules, classement final sans phase KO',
      activeClass: 'border-teal-500 bg-teal-500/10',
      iconColor: 'text-white',
      Icon: () => (
        <svg viewBox="0 0 28 28" className="w-7 h-7" fill="white">
          <rect x="0" y="0" width="11" height="11" rx="1.5"/>
          <rect x="17" y="0" width="11" height="11" rx="1.5"/>
          <rect x="0" y="17" width="11" height="11" rx="1.5"/>
          <rect x="17" y="17" width="11" height="11" rx="1.5"/>
        </svg>
      ),
    },
    {
      key: 'poules_ko',
      label: 'Groupes + Éliminatoire',
      desc: 'Répartition en poules, puis KO avec les meilleurs',
      activeClass: 'border-purple-500 bg-purple-500/10',
      iconColor: 'text-white',
      Icon: () => (
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 28 28" className="w-7 h-7" fill="white">
            <rect x="0" y="0" width="11" height="11" rx="1.5"/>
            <rect x="17" y="0" width="11" height="11" rx="1.5"/>
            <rect x="0" y="17" width="11" height="11" rx="1.5"/>
            <rect x="17" y="17" width="11" height="11" rx="1.5"/>
          </svg>
          <svg viewBox="0 0 36 28" className="w-9 h-7" fill="white">
            <rect x="0" y="2" width="12" height="4" rx="1"/>
            <rect x="0" y="12" width="12" height="4" rx="1"/>
            <rect x="0" y="22" width="12" height="4" rx="1"/>
            <path d="M12 4 L18 4 L18 14 L24 14" stroke="white" strokeWidth="2" fill="none"/>
            <path d="M12 24 L18 24 L18 14" stroke="white" strokeWidth="2" fill="none"/>
            <rect x="24" y="12" width="12" height="4" rx="1"/>
          </svg>
        </div>
      ),
    },
    {
      key: 'ldc',
      label: 'Éliminatoire',
      desc: 'Phase de ligue LDC : N matchs par équipe, puis phase KO',
      activeClass: 'border-amber-500 bg-amber-500/10',
      iconColor: 'text-white',
      Icon: () => (
        <svg viewBox="0 0 36 28" className="w-10 h-8" fill="white">
          <rect x="0" y="2" width="12" height="4" rx="1"/>
          <rect x="0" y="12" width="12" height="4" rx="1"/>
          <rect x="0" y="22" width="12" height="4" rx="1"/>
          <path d="M12 4 L18 4 L18 14 L24 14" stroke="white" strokeWidth="2" fill="none"/>
          <path d="M12 24 L18 24 L18 14" stroke="white" strokeWidth="2" fill="none"/>
          <rect x="24" y="12" width="12" height="4" rx="1"/>
        </svg>
      ),
    },
    {
      key: 'chapeaux_ldc',
      label: 'Chapeaux LDC',
      desc: 'Tirage par chapeaux — chaque club affronte N équipes par chapeau',
      activeClass: 'border-yellow-500 bg-yellow-500/10',
      iconColor: 'text-white',
      Icon: () => (
        <div className="flex gap-1.5">
          {['#FCD34D','#A78BFA','#60A5FA','#34D399'].map((c, i) => (
            <div key={i} style={{ background: c }} className="w-6 h-8 rounded flex items-end justify-center pb-1">
              <span className="text-slate-900 text-[8px] font-black">{i+1}</span>
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Format choice — style visuel vertical */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FORMATS.map(f => {
          const isActive = format === f.key;
          return (
            <button
              key={f.key}
              onClick={() => { setFormat(f.key); setPreview(null); }}
              className={`relative flex flex-col items-center justify-center gap-3 py-7 px-4 rounded-2xl border-2 transition-all duration-200 ${isActive ? f.activeClass : 'bg-slate-800/60 border-slate-700 hover:border-slate-500 hover:bg-slate-800'}`}
            >
              {isActive && (
                <span className="absolute top-2.5 right-2.5 w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </span>
              )}
              <div className="opacity-90">
                <f.Icon />
              </div>
              <div className="text-center">
                <p className="text-white font-semibold text-sm">{f.label}</p>
                <p className="text-slate-400 text-xs mt-0.5 max-w-[180px]">{f.desc}</p>
              </div>
            </button>
          );
        })}
        {/* Personnalisé */}
        <button
          onClick={() => { setFormat('custom'); setPreview(null); setCustomMatches([]); }}
          className={`relative flex flex-col items-center justify-center gap-3 py-7 px-4 rounded-2xl border-2 transition-all duration-200 ${format === 'custom' ? 'border-rose-500 bg-rose-500/10' : 'bg-slate-800/60 border-slate-700 hover:border-slate-500 hover:bg-slate-800'}`}
        >
          {format === 'custom' && (
            <span className="absolute top-2.5 right-2.5 w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </span>
          )}
          <HelpCircle className="w-10 h-10 text-white opacity-90" />
          <div className="text-center">
            <p className="text-white font-semibold text-sm">Personnalisé</p>
            <p className="text-slate-400 text-xs mt-0.5">Créez vos matchs librement</p>
          </div>
        </button>
      </div>

      {/* Params */}
      {format === 'champ' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3">
          <Label className="text-slate-300">Format</Label>
          <div className="flex gap-2">
            <button onClick={() => setAllerRetour(false)} className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${!allerRetour ? 'bg-amber-500/20 border-amber-500/60 text-amber-400' : 'border-slate-600 text-slate-400'}`}>Aller simple</button>
            <button onClick={() => setAllerRetour(true)} className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${allerRetour ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400' : 'border-slate-600 text-slate-400'}`}>Aller-Retour</button>
          </div>
          <p className="text-slate-500 text-xs">{teamsWithName.length} équipes — {allerRetour ? (teamsWithName.length % 2 === 0 ? teamsWithName.length - 1 : teamsWithName.length) * 2 : (teamsWithName.length % 2 === 0 ? teamsWithName.length - 1 : teamsWithName.length)} journées</p>
        </div>
      )}

      {format === 'champ_ko' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3">
          <div className="space-y-2">
            <Label className="text-slate-300">Format championnat</Label>
            <div className="flex gap-2">
              <button onClick={() => setAllerRetour(false)} className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${!allerRetour ? 'bg-amber-500/20 border-amber-500/60 text-amber-400' : 'border-slate-600 text-slate-400'}`}>Aller simple</button>
              <button onClick={() => setAllerRetour(true)} className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${allerRetour ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400' : 'border-slate-600 text-slate-400'}`}>Aller-Retour</button>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Qualifiés pour la phase KO</Label>
            <div className="flex gap-2 flex-wrap">
              {[2, 4, 8, 16].filter(n => n <= teamsWithName.length).map(n => (
                <button key={n} onClick={() => setKoCount(n)}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${koCount === n ? 'bg-blue-500/20 border-blue-500/60 text-blue-400' : 'border-slate-600 text-slate-400'}`}>
                  Top {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {format === 'ldc' && (
        <div className="bg-slate-800/50 border border-amber-500/30 rounded-xl p-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-amber-300 font-semibold">🏆 Phase de ligue — Ligue des Champions</Label>
            <p className="text-slate-400 text-xs">Chaque équipe joue un nombre fixe de matchs contre des adversaires tirés au sort (comme l'actuelle LDC).</p>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Nombre de matchs par équipe</Label>
            <div className="flex gap-2 flex-wrap">
              {[4, 5, 6, 7, 8].filter(n => n < teamsWithName.length).map(n => (
                <button key={n} onClick={() => setLdcMatchCount(n)}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${ldcMatchCount === n ? 'bg-amber-500/20 border-amber-500/60 text-amber-400' : 'border-slate-600 text-slate-400'}`}>
                  {n} matchs
                </button>
              ))}
            </div>
            <p className="text-slate-500 text-xs">{teamsWithName.length} équipes · total ~{Math.floor(teamsWithName.length * ldcMatchCount / 2)} matchs</p>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Qualifiés pour la phase éliminatoire</Label>
            <div className="flex gap-2 flex-wrap">
              {[4, 8, 16].filter(n => n <= teamsWithName.length).map(n => (
                <button key={n} onClick={() => setLdcKoCount(n)}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${ldcKoCount === n ? 'bg-amber-500/20 border-amber-500/60 text-amber-400' : 'border-slate-600 text-slate-400'}`}>
                  Top {n} → {getRoundLabel(n)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {format === 'chapeaux_ldc' && (
        <div className="space-y-3">
          <ChapeauxLdcConfig
            teams={teamsWithName}
            chapeauCount={chapeauCount}
            setChapeauCount={(n) => {
              setChapeauCount(n);
              setChapeaux({});
              setPreview(null);
            }}
            chapeaux={chapeaux}
            setChapeaux={setChapeaux}
            chapeauxMatchCount={chapeauxMatchCount}
            setChapeauxMatchCount={setChapeauxMatchCount}
            chapeauxKoCount={chapeauxKoCount}
            setChapeauxKoCount={setChapeauxKoCount}
          />
          <Button
            variant="outline"
            className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
            disabled={savingChapeaux}
            onClick={async () => {
              setSavingChapeaux(true);
              const config = { chapeauCount, chapeaux, chapeauxMatchCount, chapeauxKoCount };
              // Toujours sauvegarder en localStorage
              saveChapeauxConfig(tournamentId, config);
              // Si tournoi lié, sauvegarder aussi en DB
              if (tournamentId) {
                await base44.entities.Tournament.update(tournamentId, { chapeau_config: config });
              }
              setSavingChapeaux(false);
              toast.success('Configuration des chapeaux sauvegardée !');
            }}
          >
            {savingChapeaux ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
            Sauvegarder les chapeaux
          </Button>
        </div>
      )}

      {format === 'poules_simples' && (
        <div className="bg-slate-800/50 border border-teal-500/30 rounded-xl p-4 space-y-3">
          <Label className="text-slate-300">Nombre de poules</Label>
          <div className="flex gap-2 flex-wrap">
            {[2, 3, 4, 6, 8].filter(n => teamsWithName.length >= n * 2).map(n => (
              <button key={n} onClick={() => setGroupCount(n)}
                className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${groupCount === n ? 'bg-teal-500/20 border-teal-500/60 text-teal-400' : 'border-slate-600 text-slate-400'}`}>
                {n} poule{n > 1 ? 's' : ''}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setAllerRetour(false)} className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${!allerRetour ? 'bg-amber-500/20 border-amber-500/60 text-amber-400' : 'border-slate-600 text-slate-400'}`}>Aller simple</button>
            <button onClick={() => setAllerRetour(true)} className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${allerRetour ? 'bg-teal-500/20 border-teal-500/60 text-teal-400' : 'border-slate-600 text-slate-400'}`}>Aller-Retour</button>
          </div>
          {teamsWithName.length >= groupCount * 2 && (
            <p className="text-slate-500 text-xs">~{Math.ceil(teamsWithName.length / groupCount)} équipes/poule · classement final par poule</p>
          )}
        </div>
      )}

      {format === 'poules_ko' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3">
          <Label className="text-slate-300">Nombre de poules</Label>
          <div className="flex gap-2 flex-wrap">
            {[2, 3, 4, 6, 8].filter(n => teamsWithName.length >= n * 2).map(n => (
              <button key={n} onClick={() => setGroupCount(n)}
                className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${groupCount === n ? 'bg-purple-500/20 border-purple-500/60 text-purple-400' : 'border-slate-600 text-slate-400'}`}>
                {n} poule{n > 1 ? 's' : ''}
              </button>
            ))}
          </div>
          {teamsWithName.length >= groupCount * 2 && (
            <p className="text-slate-500 text-xs">~{Math.ceil(teamsWithName.length / groupCount)} équipes/poule · {groupCount * 2} qualifiés pour le KO</p>
          )}
        </div>
      )}

      {/* ── MODE PERSONNALISÉ ── */}
      {format === 'custom' && (
        <div className="space-y-4">
          <div className="bg-slate-800/50 border border-rose-500/30 rounded-xl p-4 space-y-4">
            <p className="text-rose-300 font-semibold text-sm">✏️ Créer les matchs manuellement</p>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div className="space-y-1">
                <Label className="text-slate-400 text-xs">Journée</Label>
                <Input
                  type="number"
                  min={1}
                  value={customJournee}
                  onChange={e => setCustomJournee(parseInt(e.target.value) || 1)}
                  className="bg-slate-700 border-slate-600 text-white h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-slate-400 text-xs">Domicile</Label>
                <select
                  value={customHome}
                  onChange={e => setCustomHome(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 h-9 focus:outline-none focus:border-rose-500"
                >
                  <option value="">— Choisir —</option>
                  {teamsWithName.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-slate-400 text-xs">Extérieur</Label>
                <select
                  value={customAway}
                  onChange={e => setCustomAway(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 h-9 focus:outline-none focus:border-rose-500"
                >
                  <option value="">— Choisir —</option>
                  {teamsWithName.filter(t => t.id !== customHome).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <Button
                onClick={() => {
                  if (!customHome || !customAway) { toast.error('Choisissez les deux équipes'); return; }
                  setCustomMatches(prev => [...prev, { journee: customJournee, homeId: customHome, awayId: customAway }]);
                  setCustomAway('');
                }}
                className="bg-rose-500 hover:bg-rose-600 h-9"
              >
                + Ajouter
              </Button>
            </div>

            {/* Liste des matchs ajoutés */}
            {customMatches.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                <p className="text-slate-400 text-xs font-semibold">{customMatches.length} match{customMatches.length > 1 ? 's' : ''} ajouté{customMatches.length > 1 ? 's' : ''}</p>
                {Object.entries(
                  customMatches.reduce((acc, m, idx) => {
                    const key = `J.${m.journee}`;
                    if (!acc[key]) acc[key] = [];
                    acc[key].push({ ...m, idx });
                    return acc;
                  }, {})
                ).sort(([a], [b]) => parseInt(a.slice(2)) - parseInt(b.slice(2))).map(([journeeLabel, matches]) => (
                  <div key={journeeLabel} className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-3">
                    <p className="text-rose-400 text-xs font-bold mb-2">{journeeLabel}</p>
                    <div className="space-y-1">
                      {matches.map(m => {
                        const home = teamsWithName.find(t => t.id === m.homeId);
                        const away = teamsWithName.find(t => t.id === m.awayId);
                        return (
                          <div key={m.idx} className="flex items-center gap-2 text-sm text-slate-300">
                            <span className="flex-1 text-right truncate">{home?.name}</span>
                            <span className="text-slate-600 text-xs shrink-0">vs</span>
                            <span className="flex-1 truncate">{away?.name}</span>
                            <button onClick={() => setCustomMatches(prev => prev.filter((_, i) => i !== m.idx))}
                              className="text-slate-600 hover:text-red-400 transition-colors shrink-0 ml-1">✕</button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {customMatches.length > 0 && (
            <Button
              onClick={() => importCustomMatches.mutate(customMatches)}
              disabled={importCustomMatches.isPending}
              className="bg-rose-500 hover:bg-rose-600"
            >
              {importCustomMatches.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CalendarDays className="w-4 h-4 mr-2" />}
              Créer {customMatches.length} match{customMatches.length > 1 ? 's' : ''}
            </Button>
          )}
        </div>
      )}

      {format && format !== 'custom' && (
        <Button onClick={generatePreview} variant="outline" className="border-slate-600 text-slate-300">
          <Shuffle className="w-4 h-4 mr-2" /> Générer l'aperçu
        </Button>
      )}

      {/* Preview */}
      {preview && (
        <div className="space-y-4">
          {/* Championnat simple */}
          {preview.type === 'champ' && (
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {preview.rounds.map(r => <RoundBlock key={r.journee} round={r} color="emerald" />)}
            </div>
          )}

          {/* Championnat + KO */}
          {preview.type === 'champ_ko' && (
            <>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
                <p className="text-blue-300 font-semibold text-sm">Phase de championnat — {preview.rounds.length} journées</p>
                <p className="text-slate-400 text-xs mt-1">Top {preview.koCount} → Phase éliminatoire ({getRoundLabel(preview.koCount)})</p>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {preview.rounds.map(r => <RoundBlock key={r.journee} round={r} color="emerald" />)}
              </div>
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                <p className="text-amber-400 text-xs font-bold mb-3">Phase Éliminatoire — Arbre indicatif</p>
                <div className="space-y-3">
                  {preview.koRounds.map(r => (
                    <div key={r.journee}>
                      <p className="text-slate-400 text-xs mb-1 font-semibold">{r.label} (J.{r.journee})</p>
                      {r.matches.map((m, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-slate-500 pl-2">
                          <ChevronRight className="w-3 h-3 shrink-0" />
                          <span>{m.home.name}</span>
                          <span className="text-slate-700">vs</span>
                          <span>{m.away.name}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Chapeaux LDC */}
          {preview.type === 'chapeaux_ldc' && (
            <>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
                <p className="text-yellow-300 font-semibold text-sm">🎩 Phase de ligue — Tirage par chapeaux</p>
                <p className="text-slate-400 text-xs mt-1">
                  {preview.chapeauxMatchCount} matchs/équipe · {preview.matchsParChapeau} adversaire{preview.matchsParChapeau > 1 ? 's' : ''} par chapeau adverse · {preview.rounds.length} journées · Top {preview.chapeauxKoCount} → {getRoundLabel(preview.chapeauxKoCount)}
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {preview.chapNames.map((name, ci) => (
                  <div key={name} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3">
                    <p className="text-xs font-bold mb-1" style={{ color: ['#FCD34D','#A78BFA','#60A5FA','#34D399'][ci] || '#FCD34D' }}>{name}</p>
                    {preview.chapTeams[ci].map(c => <p key={c.id} className="text-slate-300 text-xs py-0.5 truncate">• {c.name}</p>)}
                  </div>
                ))}
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {preview.rounds.map(r => <RoundBlock key={r.journee} round={r} color="yellow" />)}
              </div>
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                <p className="text-yellow-400 text-xs font-bold mb-3">Phase Éliminatoire — Arbre indicatif</p>
                <div className="space-y-3">
                  {preview.koRounds.map(r => (
                    <div key={r.journee}>
                      <p className="text-slate-400 text-xs mb-1 font-semibold">{r.label} (J.{r.journee})</p>
                      {r.matches.map((m, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-slate-500 pl-2">
                          <ChevronRight className="w-3 h-3 shrink-0" />
                          <span>{m.home.name}</span>
                          <span className="text-slate-700">vs</span>
                          <span>{m.away.name}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Ligue des Champions */}
          {preview.type === 'ldc' && (
            <>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                <p className="text-amber-300 font-semibold text-sm">🏆 Phase de ligue — {preview.rounds.length} journées</p>
                <p className="text-slate-400 text-xs mt-1">Chaque équipe joue {preview.ldcMatchCount} matchs · Top {preview.ldcKoCount} → {getRoundLabel(preview.ldcKoCount)}</p>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {preview.rounds.map(r => <RoundBlock key={r.journee} round={r} color="amber" />)}
              </div>
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                <p className="text-amber-400 text-xs font-bold mb-3">Phase Éliminatoire — Arbre indicatif</p>
                <div className="space-y-3">
                  {preview.koRounds.map(r => (
                    <div key={r.journee}>
                      <p className="text-slate-400 text-xs mb-1 font-semibold">{r.label} (J.{r.journee})</p>
                      {r.matches.map((m, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-slate-500 pl-2">
                          <ChevronRight className="w-3 h-3 shrink-0" />
                          <span>{m.home.name}</span>
                          <span className="text-slate-700">vs</span>
                          <span>{m.away.name}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Poules simples */}
          {preview.type === 'poules_simples' && (
            <>
              <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-3">
                <p className="text-teal-300 font-semibold text-sm">Phase de poules — {preview.groups.length} groupe{preview.groups.length > 1 ? 's' : ''}</p>
                <p className="text-slate-400 text-xs mt-1">Classement final par poule · {allerRetour ? 'Aller-Retour' : 'Aller simple'}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {preview.groups.map(g => (
                  <div key={g.name} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3">
                    <p className="text-teal-400 text-xs font-bold mb-1">{g.name}</p>
                    {g.clubs.map(c => <p key={c.id} className="text-slate-300 text-xs py-0.5">• {c.name}</p>)}
                  </div>
                ))}
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {preview.groupRounds.map((r, i) => (
                  <RoundBlock key={i} round={r} color="teal" label={`J.${r.journee} — ${r.groupName}`} />
                ))}
              </div>
            </>
          )}

          {/* Poules + KO */}
          {preview.type === 'poules_ko' && (
            <>
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-3">
                <p className="text-purple-300 font-semibold text-sm">Phase de poules — {preview.groups.length} groupes</p>
                <p className="text-slate-400 text-xs mt-1">{preview.groups.length * 2} qualifiés (2 par poule) → Phase éliminatoire</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {preview.groups.map(g => (
                  <div key={g.name} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3">
                    <p className="text-purple-400 text-xs font-bold mb-1">{g.name}</p>
                    {g.clubs.map(c => <p key={c.id} className="text-slate-300 text-xs py-0.5">• {c.name}</p>)}
                  </div>
                ))}
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {preview.groupRounds.map((r, i) => (
                  <RoundBlock key={i} round={r} color="emerald" label={`J.${r.journee} — ${r.groupName}`} />
                ))}
              </div>
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                <p className="text-amber-400 text-xs font-bold mb-3">Phase Éliminatoire — Arbre indicatif</p>
                <div className="space-y-3">
                  {preview.koRounds.map(r => (
                    <div key={r.journee}>
                      <p className="text-slate-400 text-xs mb-1 font-semibold">{r.label} (J.{r.journee})</p>
                      {r.matches.map((m, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-slate-500 pl-2">
                          <ChevronRight className="w-3 h-3 shrink-0" />
                          <span>{m.home.name}</span>
                          <span className="text-slate-700">vs</span>
                          <span>{m.away.name}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <Button onClick={() => importMutation.mutate()} disabled={importMutation.isPending} className="bg-emerald-500 hover:bg-emerald-600">
            {importMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CalendarDays className="w-4 h-4 mr-2" />}
            Créer les matchs
          </Button>
        </div>
      )}
    </div>
  );
}