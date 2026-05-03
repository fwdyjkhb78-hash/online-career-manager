import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowUpCircle, ArrowDownCircle, Trophy, Link, Save, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Composant qui permet :
 * 1. De lier deux championnats (L1 <-> L2) pour la promotion/relégation
 * 2. De définir combien de clubs montent et descendent
 * 3. De choisir les places LDC depuis chaque championnat
 *
 * La config est stockée dans l'entité Championship via les champs:
 *   - promotion_to: slug du championnat supérieur
 *   - promotion_spots: nombre de clubs qui montent
 *   - relegation_to: slug du championnat inférieur
 *   - relegation_spots: nombre de clubs qui descendent
 *   - ldc_spots: nombre de places LDC (positions ex: [1,2,3])
 */
export default function PromotionRelegationConfig({ championships, clubs }) {
  const queryClient = useQueryClient();
  const [selectedChamp, setSelectedChamp] = useState(championships[0]?.slug || '');

  const champ = championships.find(c => c.slug === selectedChamp);

  // État local éditable
  const [promotionTo, setPromotionTo] = useState('');
  const [promotionSpots, setPromotionSpots] = useState(2);
  const [relegationTo, setRelegationTo] = useState('');
  const [relegationSpots, setRelegationSpots] = useState(2);
  const [ldcSpots, setLdcSpots] = useState([]);
  const [newLdcPos, setNewLdcPos] = useState('');

  // Charger la config du championnat sélectionné
  useEffect(() => {
    if (!champ) return;
    setPromotionTo(champ.promotion_to || '');
    setPromotionSpots(champ.promotion_spots || 2);
    setRelegationTo(champ.relegation_to || '');
    setRelegationSpots(champ.relegation_spots || 2);
    setLdcSpots(champ.ldc_spots || []);
  }, [selectedChamp, champ]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Championship.update(champ.id, {
        promotion_to: promotionTo || null,
        promotion_spots: promotionTo ? promotionSpots : null,
        relegation_to: relegationTo || null,
        relegation_spots: relegationTo ? relegationSpots : null,
        ldc_spots: ldcSpots,
      });
    },
    onSuccess: () => {
      toast.success('Configuration sauvegardée !');
      queryClient.invalidateQueries({ queryKey: ['championships'] });
    },
    onError: (e) => toast.error(e.message),
  });

  const champClubs = clubs.filter(c => {
    const arr = c.championships?.length > 0 ? c.championships : (c.championship ? [c.championship] : []);
    return arr.includes(selectedChamp);
  }).sort((a, b) => (b.points - a.points) || ((b.goals_for - b.goals_against) - (a.goals_for - a.goals_against)));

  const addLdcPos = () => {
    const pos = parseInt(newLdcPos);
    if (!pos || pos < 1 || pos > champClubs.length) return;
    if (!ldcSpots.includes(pos)) setLdcSpots([...ldcSpots, pos].sort((a, b) => a - b));
    setNewLdcPos('');
  };

  const removeLdcPos = (pos) => setLdcSpots(ldcSpots.filter(p => p !== pos));

  const otherChamps = championships.filter(c => c.slug !== selectedChamp);

  return (
    <div className="space-y-6">
      {/* Sélection championnat */}
      <div className="flex gap-2 flex-wrap">
        {championships.map(c => (
          <button
            key={c.slug}
            onClick={() => setSelectedChamp(c.slug)}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${selectedChamp === c.slug ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400' : 'border-slate-600 text-slate-400 hover:border-slate-500'}`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {champ && (
        <div className="space-y-5">

          {/* ── PROMOTION ── */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5 text-emerald-400" />
              <h3 className="text-emerald-300 font-semibold">Montée (Promotion)</h3>
            </div>
            <p className="text-slate-400 text-xs">Les N premiers du classement montent dans le championnat supérieur.</p>

            <div className="space-y-3">
              <label className="text-slate-400 text-sm">Championnat destination (supérieur)</label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setPromotionTo('')}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${!promotionTo ? 'bg-slate-600 border-slate-500 text-white' : 'border-slate-700 text-slate-500 hover:border-slate-500'}`}
                >
                  Aucune
                </button>
                {otherChamps.map(c => (
                  <button
                    key={c.slug}
                    onClick={() => setPromotionTo(c.slug)}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${promotionTo === c.slug ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>

              {promotionTo && (
                <div className="space-y-2">
                  <label className="text-slate-400 text-sm">Nombre de places de montée</label>
                  <div className="flex gap-2 items-center">
                    {[1, 2, 3, 4].map(n => (
                      <button key={n} onClick={() => setPromotionSpots(n)}
                        className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${promotionSpots === n ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300' : 'border-slate-600 text-slate-400'}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                  {champClubs.length > 0 && (
                    <div className="bg-slate-800/40 rounded-lg p-3 space-y-1">
                      <p className="text-slate-500 text-xs font-semibold mb-2">Actuellement qualifiés pour la montée :</p>
                      {champClubs.slice(0, promotionSpots).map((c, i) => (
                        <div key={c.id} className="flex items-center gap-2">
                          <span className="text-emerald-400 font-bold text-xs w-4">{i + 1}.</span>
                          <span className="text-slate-300 text-xs">{c.name}</span>
                          <span className="text-slate-500 text-xs ml-auto">{c.points || 0} pts</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── RELÉGATION ── */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <ArrowDownCircle className="w-5 h-5 text-red-400" />
              <h3 className="text-red-300 font-semibold">Descente (Relégation)</h3>
            </div>
            <p className="text-slate-400 text-xs">Les N derniers du classement descendent dans le championnat inférieur.</p>

            <div className="space-y-3">
              <label className="text-slate-400 text-sm">Championnat destination (inférieur)</label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setRelegationTo('')}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${!relegationTo ? 'bg-slate-600 border-slate-500 text-white' : 'border-slate-700 text-slate-500 hover:border-slate-500'}`}
                >
                  Aucune
                </button>
                {otherChamps.map(c => (
                  <button
                    key={c.slug}
                    onClick={() => setRelegationTo(c.slug)}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${relegationTo === c.slug ? 'bg-red-500/20 border-red-500/60 text-red-400' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>

              {relegationTo && (
                <div className="space-y-2">
                  <label className="text-slate-400 text-sm">Nombre de places de descente</label>
                  <div className="flex gap-2 items-center">
                    {[1, 2, 3, 4].map(n => (
                      <button key={n} onClick={() => setRelegationSpots(n)}
                        className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${relegationSpots === n ? 'bg-red-500/20 border-red-500/60 text-red-300' : 'border-slate-600 text-slate-400'}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                  {champClubs.length > 0 && (
                    <div className="bg-slate-800/40 rounded-lg p-3 space-y-1">
                      <p className="text-slate-500 text-xs font-semibold mb-2">Actuellement en zone de relégation :</p>
                      {champClubs.slice(-relegationSpots).map((c, i) => (
                        <div key={c.id} className="flex items-center gap-2">
                          <span className="text-red-400 font-bold text-xs w-6">{champClubs.length - relegationSpots + i + 1}.</span>
                          <span className="text-slate-300 text-xs">{c.name}</span>
                          <span className="text-slate-500 text-xs ml-auto">{c.points || 0} pts</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── PLACES LDC ── */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <h3 className="text-amber-300 font-semibold">Places LDC / Compétitions européennes</h3>
            </div>
            <p className="text-slate-400 text-xs">Définissez quelles positions du classement sont qualifiées pour la LDC.</p>

            <div className="space-y-3">
              <div className="flex gap-2 items-end">
                <div className="space-y-1">
                  <label className="text-slate-400 text-xs">Ajouter la position</label>
                  <Input
                    type="number"
                    min={1}
                    max={champClubs.length || 20}
                    value={newLdcPos}
                    onChange={e => setNewLdcPos(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addLdcPos()}
                    placeholder="Ex: 1"
                    className="bg-slate-800 border-slate-600 text-white h-9 w-28"
                  />
                </div>
                <Button size="sm" onClick={addLdcPos} className="bg-amber-500 hover:bg-amber-600 h-9">
                  <Plus className="w-4 h-4 mr-1" /> Ajouter
                </Button>
              </div>

              {ldcSpots.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {ldcSpots.map(pos => (
                    <div key={pos} className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 border border-amber-500/40 rounded-lg">
                      <Trophy className="w-3 h-3 text-amber-400" />
                      <span className="text-amber-300 text-sm font-semibold">{pos}{pos === 1 ? 'er' : 'ème'}</span>
                      <button onClick={() => removeLdcPos(pos)} className="ml-1 text-amber-500 hover:text-red-400 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {ldcSpots.length > 0 && champClubs.length > 0 && (
                <div className="bg-slate-800/40 rounded-lg p-3 space-y-1">
                  <p className="text-slate-500 text-xs font-semibold mb-2">Actuellement qualifiés LDC :</p>
                  {ldcSpots.map(pos => {
                    const club = champClubs[pos - 1];
                    return club ? (
                      <div key={pos} className="flex items-center gap-2">
                        <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
                        <span className="text-slate-500 text-xs">{pos}.</span>
                        <span className="text-slate-300 text-xs">{club.name}</span>
                        <span className="text-slate-500 text-xs ml-auto">{club.points || 0} pts</span>
                      </div>
                    ) : (
                      <div key={pos} className="flex items-center gap-2">
                        <span className="text-slate-500 text-xs">{pos}. —</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Save */}
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-emerald-500 hover:bg-emerald-600">
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Sauvegarder la configuration
          </Button>
        </div>
      )}
    </div>
  );
}