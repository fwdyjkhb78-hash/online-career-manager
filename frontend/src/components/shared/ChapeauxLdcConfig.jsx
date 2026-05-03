import React from 'react';
import { Label } from '@/components/ui/label';
import { X, Plus } from 'lucide-react';

const CHAPEAU_COLORS = ['#FCD34D', '#A78BFA', '#60A5FA', '#34D399', '#F87171', '#FB923C'];

export default function ChapeauxLdcConfig({
  teams,
  chapeauCount,
  setChapeauCount,
  chapeaux,
  setChapeaux,
  chapeauxMatchCount,
  setChapeauxMatchCount,
  chapeauxKoCount,
  setChapeauxKoCount,
}) {
  const chapNames = Array.from({ length: chapeauCount }, (_, i) => `Chapeau ${i + 1}`);

  // Toutes les équipes déjà assignées
  const assignedIds = new Set(chapNames.flatMap(c => chapeaux[c] || []));
  const unassigned = teams.filter(t => !assignedIds.has(t.id));

  const addTeamToChapeau = (chapName, teamId) => {
    setChapeaux(prev => ({
      ...prev,
      [chapName]: [...(prev[chapName] || []), teamId],
    }));
  };

  const removeTeamFromChapeau = (chapName, teamId) => {
    setChapeaux(prev => ({
      ...prev,
      [chapName]: (prev[chapName] || []).filter(id => id !== teamId),
    }));
  };

  const totalAssigned = chapNames.reduce((sum, c) => sum + (chapeaux[c]?.length || 0), 0);

  // matchs par équipe doit être divisible par chapeauCount (on joue contre chaque chapeau y compris le sien)
  const validMatchCounts = [4, 8, 12, 16].filter(n => n % chapeauCount === 0 && n < teams.length);

  return (
    <div className="space-y-5">
      {/* Nombre de chapeaux */}
      <div className="bg-slate-800/50 border border-yellow-500/30 rounded-xl p-4 space-y-3">
        <Label className="text-yellow-300 font-semibold">🎩 Configuration des Chapeaux LDC</Label>
        <div>
          <Label className="text-slate-400 text-xs mb-2 block">Nombre de chapeaux</Label>
          <div className="flex gap-2 flex-wrap">
            {[2, 3, 4].map(n => (
              <button
                key={n}
                onClick={() => setChapeauCount(n)}
                className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                  chapeauCount === n
                    ? 'bg-yellow-500/20 border-yellow-500/60 text-yellow-400'
                    : 'border-slate-600 text-slate-400'
                }`}
              >
                {n} chapeaux
              </button>
            ))}
          </div>
        </div>

        {/* Matchs par équipe */}
        <div>
          <Label className="text-slate-400 text-xs mb-2 block">Matchs par équipe</Label>
          {validMatchCounts.length > 0 ? (
            <div className="flex gap-2 flex-wrap">
              {validMatchCounts.map(n => (
                <button
                  key={n}
                  onClick={() => setChapeauxMatchCount(n)}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                    chapeauxMatchCount === n
                      ? 'bg-yellow-500/20 border-yellow-500/60 text-yellow-400'
                      : 'border-slate-600 text-slate-400'
                  }`}
                >
                  {n} matchs <span className="text-xs opacity-70">({n / chapeauCount}/chapeau)</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-xs">Aucune valeur disponible pour {chapeauCount} chapeaux</p>
          )}
          <p className="text-slate-500 text-xs mt-1">
            Chaque équipe affronte <strong className="text-slate-300">{chapeauxMatchCount / chapeauCount}</strong> équipe{chapeauxMatchCount / chapeauCount > 1 ? 's' : ''} de chaque chapeau (y compris le sien)
          </p>
        </div>

        {/* Qualifiés KO */}
        <div>
          <Label className="text-slate-400 text-xs mb-2 block">Qualifiés pour la phase éliminatoire</Label>
          <div className="flex gap-2 flex-wrap">
            {[4, 8, 16].filter(n => n <= totalAssigned).map(n => (
              <button
                key={n}
                onClick={() => setChapeauxKoCount(n)}
                className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                  chapeauxKoCount === n
                    ? 'bg-yellow-500/20 border-yellow-500/60 text-yellow-400'
                    : 'border-slate-600 text-slate-400'
                }`}
              >
                Top {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Répartition des équipes dans les chapeaux */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-slate-300 text-sm">Répartition des équipes</Label>
          <span className="text-slate-500 text-xs">{totalAssigned}/{teams.length} équipes assignées</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {chapNames.map((chapName, ci) => {
            const color = CHAPEAU_COLORS[ci] || '#FCD34D';
            const chapTeamIds = chapeaux[chapName] || [];
            const chapTeams = chapTeamIds.map(id => teams.find(t => t.id === id)).filter(Boolean);

            return (
              <div
                key={chapName}
                className="bg-slate-800/40 rounded-xl border p-3 space-y-2"
                style={{ borderColor: `${color}40` }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                  <p className="font-bold text-sm" style={{ color }}>{chapName}</p>
                  <span className="text-slate-500 text-xs ml-auto">{chapTeams.length} équipe{chapTeams.length > 1 ? 's' : ''}</span>
                </div>

                {/* Équipes dans ce chapeau */}
                <div className="space-y-1 min-h-[32px]">
                  {chapTeams.map(t => (
                    <div key={t.id} className="flex items-center gap-2 text-sm text-slate-300 bg-slate-700/40 rounded-lg px-2 py-1">
                      <span className="flex-1 truncate text-xs">{t.name}</span>
                      <button
                        onClick={() => removeTeamFromChapeau(chapName, t.id)}
                        className="text-slate-600 hover:text-red-400 transition-colors shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {chapTeams.length === 0 && (
                    <p className="text-slate-600 text-xs italic pl-1">Aucune équipe</p>
                  )}
                </div>

                {/* Sélecteur pour ajouter une équipe */}
                {unassigned.length > 0 && (
                  <select
                    value=""
                    onChange={e => { if (e.target.value) addTeamToChapeau(chapName, e.target.value); }}
                    className="w-full bg-slate-700 border text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none"
                    style={{ borderColor: `${color}50` }}
                  >
                    <option value="">+ Ajouter une équipe…</option>
                    {unassigned.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
        </div>

        {unassigned.length > 0 && (
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-3">
            <p className="text-slate-500 text-xs mb-2">Équipes non assignées ({unassigned.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {unassigned.map(t => (
                <span key={t.id} className="bg-slate-700 text-slate-400 text-xs px-2 py-1 rounded-lg">
                  {t.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}