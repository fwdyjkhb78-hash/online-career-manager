import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, CalendarDays, Check, Plus, Trash2, AlertCircle, Wand2, Shuffle } from 'lucide-react';
import { toast } from 'sonner';

const CHAMPIONSHIPS = [
  { value: 'ligue1_serie_a', label: 'Ligue 1 / Série A' },
  { value: 'bundesliga_liga_pl', label: 'Bundesliga / Liga / PL' },
];

// Génère un calendrier aller-retour (round-robin) équilibré
function generateRoundRobin(clubs) {
  const teams = [...clubs];
  if (teams.length % 2 !== 0) teams.push(null); // bye
  const n = teams.length;
  const rounds = [];

  for (let r = 0; r < n - 1; r++) {
    const round = [];
    for (let i = 0; i < n / 2; i++) {
      const home = teams[i];
      const away = teams[n - 1 - i];
      if (home && away) round.push({ home, away });
    }
    rounds.push(round);
    // Rotation: fix first, rotate others
    teams.splice(1, 0, teams.pop());
  }

  // Aller + Retour (inverser dom/ext)
  const allRounds = [];
  rounds.forEach((round, i) => {
    allRounds.push({ journee: i + 1, matches: round });
  });
  rounds.forEach((round, i) => {
    allRounds.push({ journee: rounds.length + i + 1, matches: round.map(m => ({ home: m.away, away: m.home })) });
  });

  return allRounds;
}

const emptyRow = () => ({ home_club_id: '', away_club_id: '', journee: '' });

export default function CalendarGeneratorTab() {
  const queryClient = useQueryClient();
  const [championship, setChampionship] = useState('ligue1_serie_a');
  const [preview, setPreview] = useState(null);
  const [allerRetour, setAllerRetour] = useState(true);
  const [mode, setMode] = useState('auto');
  const [rows, setRows] = useState([emptyRow()]);
  const [globalJournee, setGlobalJournee] = useState('');

  const { data: clubs = [] } = useQuery({
    queryKey: ['clubs'],
    queryFn: () => base44.entities.Club.list(),
  });

  const championshipClubs = clubs.filter(c => c.championship === championship);

  const generatePreview = () => {
    if (championshipClubs.length < 2) {
      toast.error('Pas assez de clubs dans ce championnat');
      return;
    }
    const all = generateRoundRobin(championshipClubs);
    const rounds = allerRetour ? all : all.slice(0, all.length / 2);
    setPreview(rounds);
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      if (mode === 'auto') {
        if (!preview || preview.length === 0) throw new Error('Génère d\'abord le calendrier');
        let count = 0;
        for (const round of preview) {
          for (const m of round.matches) {
            await base44.entities.Match.create({
              journee: round.journee,
              match_type: 'championnat',
              home_club_id: m.home.id,
              home_club_name: m.home.name,
              away_club_id: m.away.id,
              away_club_name: m.away.name,
              status: 'pending',
            });
            count++;
          }
        }
        return count;
      } else {
        const valid = rows.filter(r => r.home_club_id && r.away_club_id && r.home_club_id !== r.away_club_id);
        if (valid.length === 0) throw new Error('Aucun match valide à importer');
        let count = 0;
        for (const r of valid) {
          const home = clubs.find(c => c.id === r.home_club_id);
          const away = clubs.find(c => c.id === r.away_club_id);
          await base44.entities.Match.create({
            journee: parseInt(r.journee) || 1,
            match_type: 'championnat',
            home_club_id: r.home_club_id,
            home_club_name: home?.name || '',
            away_club_id: r.away_club_id,
            away_club_name: away?.name || '',
            status: 'pending',
          });
          count++;
        }
        return count;
      }
    },
    onSuccess: (count) => {
      toast.success(`${count} matchs créés avec succès !`);
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      setPreview(null);
      setRows([emptyRow()]);
    },
    onError: (e) => toast.error(e.message),
  });

  // Manual mode helpers
  const addRow = () => setRows(prev => [...prev, emptyRow()]);
  const removeRow = (i) => setRows(prev => prev.filter((_, idx) => idx !== i));
  const updateRow = (i, field, value) => setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  const applyJournee = () => {
    if (!globalJournee) return;
    setRows(prev => prev.map(r => ({ ...r, journee: globalJournee })));
  };

  const validManualRows = rows.filter(r => r.home_club_id && r.away_club_id && r.home_club_id !== r.away_club_id);

  return (
    <div className="space-y-6">
      {/* Mode tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('auto')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'auto' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'text-slate-400 hover:text-white border border-slate-700'}`}
        >
          <Wand2 className="w-4 h-4" /> Génération automatique
        </button>
        <button
          onClick={() => setMode('manual')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'manual' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'text-slate-400 hover:text-white border border-slate-700'}`}
        >
          <Plus className="w-4 h-4" /> Saisie manuelle
        </button>
      </div>

      {mode === 'auto' && (
        <div className="space-y-5">
          {/* Championnat selection */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4">
            <h3 className="text-white font-semibold">Sélectionner le championnat</h3>
            <div className="flex gap-3 flex-wrap">
              {CHAMPIONSHIPS.map(c => (
                <button
                  key={c.value}
                  onClick={() => { setChampionship(c.value); setPreview(null); }}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${championship === c.value ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400' : 'border-slate-600 text-slate-400 hover:border-slate-500'}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {championshipClubs.length === 0
                ? <p className="text-slate-500 text-sm">Aucun club dans ce championnat</p>
                : championshipClubs.map(c => (
                  <Badge key={c.id} variant="outline" className="border-slate-600 text-slate-300">{c.name}</Badge>
                ))}
            </div>
            {/* Aller / Aller-Retour toggle */}
            <div className="flex items-center gap-3">
              <span className="text-slate-400 text-sm">Format :</span>
              <button
                onClick={() => { setAllerRetour(false); setPreview(null); }}
                className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${!allerRetour ? 'bg-amber-500/20 border-amber-500/60 text-amber-400' : 'border-slate-600 text-slate-400 hover:border-slate-500'}`}
              >Aller simple</button>
              <button
                onClick={() => { setAllerRetour(true); setPreview(null); }}
                className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${allerRetour ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400' : 'border-slate-600 text-slate-400 hover:border-slate-500'}`}
              >Aller-Retour</button>
            </div>
            <p className="text-slate-500 text-xs">{championshipClubs.length} club(s) — calendrier aller-retour : {championshipClubs.length >= 2 ? (championshipClubs.length % 2 === 0 ? championshipClubs.length - 1 : championshipClubs.length) * 2 : 0} journées, {championshipClubs.length >= 2 ? Math.floor(championshipClubs.length / 2) * (championshipClubs.length % 2 === 0 ? championshipClubs.length - 1 : championshipClubs.length) * 2 : 0} matchs total</p>
          </div>

          <Button
            onClick={generatePreview}
            disabled={championshipClubs.length < 2}
            variant="outline"
            className="border-slate-600 text-slate-300"
          >
            <Shuffle className="w-4 h-4 mr-2" /> Générer le calendrier
          </Button>

          {/* Preview */}
          {preview && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold">Aperçu — {preview.length} journées</h3>
                <Button
                  onClick={() => importMutation.mutate()}
                  disabled={importMutation.isPending}
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  {importMutation.isPending
                    ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    : <CalendarDays className="w-4 h-4 mr-2" />
                  }
                  Confirmer et créer tous les matchs
                </Button>
              </div>
              <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
                {preview.map(round => (
                  <div key={round.journee} className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-3">
                    <p className="text-emerald-400 text-xs font-bold mb-2">Journée {round.journee}</p>
                    <div className="space-y-1">
                      {round.matches.map((m, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                          <span className="flex-1 text-right">{m.home.name}</span>
                          <span className="text-slate-600 text-xs">vs</span>
                          <span className="flex-1">{m.away.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'manual' && (
        <div className="space-y-4">
          {/* Journée globale */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label className="text-slate-300 text-sm">Appliquer la journée à tous les matchs</Label>
                <Input
                  type="number"
                  value={globalJournee}
                  onChange={e => setGlobalJournee(e.target.value)}
                  placeholder="Ex: 5"
                  className="bg-slate-700 border-slate-600 text-white mt-1 h-9"
                />
              </div>
              <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 h-9" onClick={applyJournee}>
                Appliquer à tous
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="hidden md:grid grid-cols-[60px_1fr_40px_1fr_40px_40px] gap-2 px-1">
              <span className="text-slate-500 text-xs">J.</span>
              <span className="text-slate-500 text-xs">Domicile</span>
              <span></span>
              <span className="text-slate-500 text-xs">Extérieur</span>
              <span></span>
              <span></span>
            </div>
            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-[55px_1fr_20px_1fr_36px] md:grid-cols-[60px_1fr_40px_1fr_40px_40px] gap-2 items-center bg-slate-800/40 rounded-xl p-3 border border-slate-700/50">
                <Input type="number" value={row.journee} onChange={e => updateRow(i, 'journee', e.target.value)} placeholder="J." className="bg-slate-700 border-slate-600 text-white h-9 text-sm" />
                <select value={row.home_club_id} onChange={e => updateRow(i, 'home_club_id', e.target.value)} className="bg-slate-700 border border-slate-600 text-white rounded-md px-2 py-1.5 text-sm h-9 w-full">
                  <option value="">-- Domicile --</option>
                  {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <span className="text-slate-500 text-center text-xs font-bold">vs</span>
                <select value={row.away_club_id} onChange={e => updateRow(i, 'away_club_id', e.target.value)} className="bg-slate-700 border border-slate-600 text-white rounded-md px-2 py-1.5 text-sm h-9 w-full">
                  <option value="">-- Extérieur --</option>
                  {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="hidden md:flex items-center justify-center">
                  {row.home_club_id && row.away_club_id && row.home_club_id !== row.away_club_id
                    ? <Check className="w-4 h-4 text-emerald-400" />
                    : (row.home_club_id || row.away_club_id) ? <AlertCircle className="w-4 h-4 text-amber-400" /> : null}
                </div>
                <button onClick={() => removeRow(i)} className="text-slate-600 hover:text-red-400 transition-colors flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="outline" size="sm" className="border-slate-600 text-slate-300" onClick={addRow}>
              <Plus className="w-4 h-4 mr-1" /> Ajouter un match
            </Button>
            <Button
              onClick={() => importMutation.mutate()}
              disabled={validManualRows.length === 0 || importMutation.isPending}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              {importMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CalendarDays className="w-4 h-4 mr-2" />}
              Créer {validManualRows.length} match{validManualRows.length > 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}