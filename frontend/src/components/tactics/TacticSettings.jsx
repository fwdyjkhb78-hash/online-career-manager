import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MENTALITIES = [
  { value: 'ultra_defensive', label: '🛡️ Ultra Défensif', color: 'text-blue-400' },
  { value: 'defensive', label: '🔒 Défensif', color: 'text-cyan-400' },
  { value: 'balanced', label: '⚖️ Équilibré', color: 'text-slate-300' },
  { value: 'attacking', label: '⚡ Offensif', color: 'text-amber-400' },
  { value: 'ultra_attacking', label: '🔥 Ultra Offensif', color: 'text-red-400' },
];

function SliderRow({ label, value, onChange, min = 1, max = 10, leftLabel, rightLabel }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-300 font-medium">{label}</span>
        <span className="text-emerald-400 font-bold text-sm w-6 text-center">{value}</span>
      </div>
      <Slider
        min={min} max={max} step={1}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        className="w-full"
      />
      {(leftLabel || rightLabel) && (
        <div className="flex justify-between text-xs text-slate-500">
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      )}
    </div>
  );
}

export default function TacticSettings({ tactic, onChange }) {
  const set = (key, val) => onChange({ ...tactic, [key]: val });

  return (
    <div className="space-y-6">
      {/* Mentalité */}
      <div>
        <label className="text-sm text-slate-400 mb-2 block font-medium">Mentalité de l'équipe</label>
        <div className="grid grid-cols-5 gap-1">
          {MENTALITIES.map(m => (
            <button
              key={m.value}
              onClick={() => set('mentality', m.value)}
              className={`p-2 rounded-lg text-center transition-all border text-xs font-medium ${
                tactic.mentality === m.value
                  ? 'bg-emerald-500 border-emerald-400 text-white'
                  : 'bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500'
              }`}
            >
              {m.label.split(' ').map((w, i) => <div key={i}>{w}</div>)}
            </button>
          ))}
        </div>
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SliderRow
          label="Pressing"
          value={tactic.pressing || 5}
          onChange={(v) => set('pressing', v)}
          leftLabel="Bas"
          rightLabel="Intense"
        />
        <SliderRow
          label="Ligne défensive"
          value={tactic.defensive_line || 5}
          onChange={(v) => set('defensive_line', v)}
          leftLabel="Basse"
          rightLabel="Haute"
        />
        <SliderRow
          label="Largeur"
          value={tactic.width || 5}
          onChange={(v) => set('width', v)}
          leftLabel="Étroit"
          rightLabel="Large"
        />
        <SliderRow
          label="Tempo"
          value={tactic.tempo || 5}
          onChange={(v) => set('tempo', v)}
          leftLabel="Lent"
          rightLabel="Rapide"
        />
      </div>

      {/* Relances et forme défensive */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-slate-400 mb-2 block">Style de relance</label>
          <Select value={tactic.build_up || 'mixed'} onValueChange={(v) => set('build_up', v)}>
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="short" className="text-white">⚽ Passes courtes</SelectItem>
              <SelectItem value="mixed" className="text-white">🔄 Mixte</SelectItem>
              <SelectItem value="long" className="text-white">📏 Longs ballons</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm text-slate-400 mb-2 block">Forme défensive</label>
          <Select value={tactic.defensive_shape || 'balanced'} onValueChange={(v) => set('defensive_shape', v)}>
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="compact" className="text-white">🧱 Compact (bloc bas)</SelectItem>
              <SelectItem value="balanced" className="text-white">⚖️ Équilibré</SelectItem>
              <SelectItem value="spread" className="text-white">📡 Étalé (pression haute)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Coups de pied arrêtés */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-slate-400 mb-2 block">⚽ Corners / Coups francs (Attaque)</label>
          <textarea
            value={tactic.set_pieces_attack || ''}
            onChange={(e) => set('set_pieces_attack', e.target.value)}
            rows={2}
            placeholder="Ex: Corner court + tir de la tête côté proche..."
            className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="text-sm text-slate-400 mb-2 block">🛡️ Défense sur coups de pied arrêtés</label>
          <textarea
            value={tactic.set_pieces_defense || ''}
            onChange={(e) => set('set_pieces_defense', e.target.value)}
            rows={2}
            placeholder="Ex: Marquage à la zone, 2 joueurs au poteau..."
            className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>
    </div>
  );
}