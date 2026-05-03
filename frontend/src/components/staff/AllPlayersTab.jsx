import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAll } from '@/utils/fetchAll';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Loader2, Edit2, Users, X, Trophy, Star, Trash2 } from 'lucide-react';

const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];

const SORT_OPTIONS = [
  { value: 'overall_desc', label: 'OVR ↓' },
  { value: 'overall_asc', label: 'OVR ↑' },
  { value: 'value_desc', label: 'Valeur ↓' },
  { value: 'value_asc', label: 'Valeur ↑' },
  { value: 'name_asc', label: 'Nom A→Z' },
  { value: 'age_asc', label: 'Âge ↑' },
  { value: 'age_desc', label: 'Âge ↓' },
];

function EditPlayerDialog({ player, onClose }) {
  const [stats, setStats] = useState({ ...player });
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Player.update(player.id, data);
      if (data.overall && data.overall > player.overall) {
        await base44.entities.PlayerEvolution.create({
          player_id: player.id,
          player_name: data.name || player.name,
          player_position: data.position || player.position,
          player_image_url: data.image_url || player.image_url || '',
          club_id: player.club_id || '',
          club_name: player.club_name || '',
          overall_before: player.overall,
          overall_after: data.overall,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-players-staff'] });
      onClose();
    }
  });

  const potential = stats.potential || 99;
  const overallExceedsPotential = stats.overall > potential;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier — {player.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {overallExceedsPotential && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              ⚠️ La note ({stats.overall}) dépasse le potentiel ({potential}).
            </div>
          )}

          {[
            { label: 'Nom', key: 'name', type: 'text' },
            { label: 'Nationalité', key: 'nationality', type: 'text' },
            { label: 'Note globale', key: 'overall', type: 'number', min: 1, max: 99 },
            { label: 'Potentiel max', key: 'potential', type: 'number', min: 1, max: 99 },
            { label: 'Âge', key: 'age', type: 'number', min: 15, max: 50 },
            { label: 'Valeur (€)', key: 'value', type: 'number', min: 0 },
            { label: 'Clause lib. (€)', key: 'release_clause', type: 'number', min: 0 },
          ].map(({ label, key, type, min, max }) => (
            <div key={key} className="flex items-center gap-3">
              <label className="w-36 text-sm text-slate-300 shrink-0">{label}</label>
              <Input
                type={type}
                min={min}
                max={max}
                value={stats[key] || ''}
                onChange={e => setStats({ ...stats, [key]: type === 'number' ? (parseInt(e.target.value) || 0) : e.target.value })}
                className="bg-slate-800 border-slate-600 flex-1"
              />
              {key === 'value' && <span className="text-slate-500 text-xs whitespace-nowrap">{((stats.value || 0) / 1e6).toFixed(1)}M€</span>}
              {key === 'release_clause' && <span className="text-slate-500 text-xs whitespace-nowrap">{((stats.release_clause || 0) / 1e6).toFixed(1)}M€</span>}
            </div>
          ))}

          <div className="flex items-center gap-3">
            <label className="w-36 text-sm text-slate-300 shrink-0">Poste</label>
            <select
              value={stats.position || ''}
              onChange={e => setStats({ ...stats, position: e.target.value })}
              className="bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white text-sm flex-1"
            >
              {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="w-36 text-sm text-slate-300 shrink-0">Rôle</label>
            <select
              value={stats.player_role || 'rotation'}
              onChange={e => setStats({ ...stats, player_role: e.target.value })}
              className="bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white text-sm flex-1"
            >
              <option value="espoir">🌱 Espoir</option>
              <option value="reserviste">🔵 Réserviste</option>
              <option value="rotation">🟡 Rotation</option>
              <option value="important">🟠 Important</option>
              <option value="titulaire_indiscutable">⭐ Titulaire indiscutable</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-300">URL Photo</label>
            <div className="flex items-center gap-3">
              {stats.image_url && (
                <img src={stats.image_url} alt="" className="w-10 h-10 rounded-full object-cover bg-slate-700 shrink-0" onError={e => e.currentTarget.style.display = 'none'} />
              )}
              <Input
                value={stats.image_url || ''}
                onChange={e => setStats({ ...stats, image_url: e.target.value })}
                placeholder="https://..."
                className="bg-slate-800 border-slate-600 flex-1 text-xs"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={onClose} className="border-slate-600">Annuler</Button>
          <Button
            onClick={() => updateMutation.mutate(stats)}
            disabled={updateMutation.isPending || overallExceedsPotential}
            className="bg-blue-500 hover:bg-blue-600"
          >
            {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Sauvegarder
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AllPlayersTab() {
  const [search, setSearch] = useState('');
  const [filterPos, setFilterPos] = useState('');
  const [filterMinOvr, setFilterMinOvr] = useState('');
  const [filterMaxOvr, setFilterMaxOvr] = useState('');
  const [filterMinPot, setFilterMinPot] = useState('');
  const [filterMaxPot, setFilterMaxPot] = useState('');
  const [filterNationality, setFilterNationality] = useState('');
  const [nationalityInput, setNationalityInput] = useState('');
  const [showNatSuggestions, setShowNatSuggestions] = useState(false);
  const [filterOnSale, setFilterOnSale] = useState(false);
  const [filterHasClause, setFilterHasClause] = useState(false);
  const [filterNoClub, setFilterNoClub] = useState(false);
  const [filterClubId, setFilterClubId] = useState('');
  const [sortBy, setSortBy] = useState('overall_desc');
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [deletingPlayer, setDeletingPlayer] = useState(null);

  const queryClient = useQueryClient();

  const { data: allPlayers = [], isLoading } = useQuery({
    queryKey: ['all-players-staff'],
    queryFn: () => fetchAll('Player'),
    staleTime: 30000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Player.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-players-staff'] });
      setDeletingPlayer(null);
    }
  });

  const { data: allClubs = [] } = useQuery({
    queryKey: ['all-clubs-staff'],
    queryFn: () => base44.entities.Club.list(),
    staleTime: 30000,
  });

  const nationalitySuggestions = useMemo(() => {
    if (!nationalityInput || nationalityInput.length < 2) return [];
    const normalize = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const query = normalize(nationalityInput);
    const seen = new Set();
    return allPlayers
      .map(p => p.nationality)
      .filter(n => n && normalize(n).includes(query) && !seen.has(n) && seen.add(n))
      .slice(0, 6);
  }, [allPlayers, nationalityInput]);

  const filtered = useMemo(() => {
    let result = allPlayers.filter(p => {
      if (filterPos && p.position !== filterPos) return false;
      if (filterMinOvr && p.overall < parseInt(filterMinOvr)) return false;
      if (filterMaxOvr && p.overall > parseInt(filterMaxOvr)) return false;
      if (filterMinPot && (p.potential || p.overall) < parseInt(filterMinPot)) return false;
      if (filterMaxPot && (p.potential || p.overall) > parseInt(filterMaxPot)) return false;
      if (filterOnSale && !p.is_on_transfer_list) return false;
      if (filterHasClause && !(p.release_clause > 0)) return false;
      if (filterNoClub && p.club_id) return false;
      if (filterClubId === '__no_club__' && p.club_id) return false;
      if (filterClubId && filterClubId !== '__no_club__' && p.club_id !== filterClubId) return false;
      if (filterNationality) {
        const normalize = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (!normalize(p.nationality || '').includes(normalize(filterNationality))) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return (
          p.name?.toLowerCase().includes(q) ||
          p.club_name?.toLowerCase().includes(q) ||
          p.nationality?.toLowerCase().includes(q) ||
          p.position?.toLowerCase().includes(q)
        );
      }
      return true;
    });

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'overall_desc': return (b.overall || 0) - (a.overall || 0);
        case 'overall_asc': return (a.overall || 0) - (b.overall || 0);
        case 'value_desc': return (b.value || 0) - (a.value || 0);
        case 'value_asc': return (a.value || 0) - (b.value || 0);
        case 'name_asc': return (a.name || '').localeCompare(b.name || '');
        case 'age_asc': return (a.age || 0) - (b.age || 0);
        case 'age_desc': return (b.age || 0) - (a.age || 0);
        default: return 0;
      }
    });

    return result;
  }, [allPlayers, search, filterPos, filterMinOvr, filterMaxOvr, filterMinPot, filterMaxPot, filterNationality, filterOnSale, filterHasClause, filterNoClub, filterClubId, sortBy]);

  const hasFilters = search || filterPos || filterMinOvr || filterMaxOvr || filterMinPot || filterMaxPot || filterNationality || filterOnSale || filterHasClause || filterNoClub || filterClubId;

  const resetFilters = () => {
    setSearch(''); setFilterPos(''); setFilterMinOvr(''); setFilterMaxOvr('');
    setFilterMinPot(''); setFilterMaxPot(''); setFilterNationality(''); setNationalityInput('');
    setFilterOnSale(false); setFilterHasClause(false); setFilterNoClub(false); setFilterClubId('');
  };

  return (
    <div className="space-y-5">

      {/* ── FILTRES STYLE MERCATO ── */}
      <div className="bg-slate-900 border border-violet-500/30 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-500 flex items-center justify-center">
              <Search className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-white font-bold text-sm uppercase tracking-wider">Filtres</h2>
          </div>
          {hasFilters && (
            <button onClick={resetFilters} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
              <X className="w-3 h-3" /> Réinitialiser
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

          {/* Nom */}
          <div className="col-span-2 sm:col-span-1 bg-slate-800 border-2 border-yellow-500/60 rounded-xl p-3 flex flex-col gap-2">
            <p className="text-yellow-400 text-xs font-bold uppercase tracking-wider">Nom / Club</p>
            <div className="flex items-center gap-2 bg-slate-700 rounded-lg px-2 py-1.5">
              <Search className="w-3 h-3 text-slate-400 shrink-0" />
              <input type="text" placeholder="Tous" value={search} onChange={e => setSearch(e.target.value)}
                className="bg-transparent text-white text-xs focus:outline-none w-full" />
              {search && <button onClick={() => setSearch('')}><X className="w-3 h-3 text-slate-500 hover:text-white" /></button>}
            </div>
          </div>

          {/* OVR */}
          <div className="bg-slate-800 border border-slate-600 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                <Trophy className="w-3 h-3 text-white" />
              </div>
              <p className="text-slate-300 text-xs font-bold uppercase tracking-wider">OVR</p>
            </div>
            <div className="flex items-center gap-1">
              <input type="number" placeholder="Min" value={filterMinOvr} onChange={e => setFilterMinOvr(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 text-white text-xs text-center rounded-lg px-1 py-1.5 focus:outline-none focus:border-yellow-500" />
              <span className="text-slate-500 text-xs">-</span>
              <input type="number" placeholder="Max" value={filterMaxOvr} onChange={e => setFilterMaxOvr(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 text-white text-xs text-center rounded-lg px-1 py-1.5 focus:outline-none focus:border-yellow-500" />
            </div>
            <p className="text-slate-500 text-xs text-center">{filterMinOvr || filterMaxOvr ? `${filterMinOvr || '?'} - ${filterMaxOvr || '?'}` : 'Tous'}</p>
          </div>

          {/* Potentiel */}
          <div className="bg-slate-800 border border-slate-600 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                <Star className="w-3 h-3 text-white" />
              </div>
              <p className="text-slate-300 text-xs font-bold uppercase tracking-wider">Potentiel</p>
            </div>
            <div className="flex items-center gap-1">
              <input type="number" placeholder="Min" value={filterMinPot} onChange={e => setFilterMinPot(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 text-white text-xs text-center rounded-lg px-1 py-1.5 focus:outline-none focus:border-violet-500" />
              <span className="text-slate-500 text-xs">-</span>
              <input type="number" placeholder="Max" value={filterMaxPot} onChange={e => setFilterMaxPot(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 text-white text-xs text-center rounded-lg px-1 py-1.5 focus:outline-none focus:border-violet-500" />
            </div>
            <p className="text-slate-500 text-xs text-center">{filterMinPot || filterMaxPot ? `${filterMinPot || '?'} - ${filterMaxPot || '?'}` : 'Tous'}</p>
          </div>

          {/* Position */}
          <div className="bg-slate-800 border border-slate-600 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                <Users className="w-3 h-3 text-white" />
              </div>
              <p className="text-slate-300 text-xs font-bold uppercase tracking-wider">Position</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {POSITIONS.map(pos => (
                <button key={pos} onClick={() => setFilterPos(filterPos === pos ? '' : pos)}
                  className={`px-1.5 py-0.5 rounded text-xs font-bold transition-all ${filterPos === pos ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'}`}>
                  {pos}
                </button>
              ))}
            </div>
          </div>

          {/* Statuts */}
          <div className="flex flex-col gap-2">
            <div onClick={() => setFilterOnSale(!filterOnSale)}
              className={`bg-slate-800 border rounded-xl p-2.5 flex items-center gap-2 cursor-pointer transition-all ${filterOnSale ? 'border-red-500/60 bg-red-500/10' : 'border-slate-600 hover:border-slate-500'}`}>
              <span className="text-xs">🏷️</span>
              <p className={`text-xs font-bold ${filterOnSale ? 'text-red-300' : 'text-slate-400'}`}>À vendre</p>
            </div>
            <div onClick={() => setFilterHasClause(!filterHasClause)}
              className={`bg-slate-800 border rounded-xl p-2.5 flex items-center gap-2 cursor-pointer transition-all ${filterHasClause ? 'border-amber-500/60 bg-amber-500/10' : 'border-slate-600 hover:border-slate-500'}`}>
              <span className="text-xs">⚡</span>
              <p className={`text-xs font-bold ${filterHasClause ? 'text-amber-300' : 'text-slate-400'}`}>Avec clause</p>
            </div>
            <div onClick={() => setFilterNoClub(!filterNoClub)}
              className={`bg-slate-800 border rounded-xl p-2.5 flex items-center gap-2 cursor-pointer transition-all ${filterNoClub ? 'border-blue-500/60 bg-blue-500/10' : 'border-slate-600 hover:border-slate-500'}`}>
              <span className="text-xs">👤</span>
              <p className={`text-xs font-bold ${filterNoClub ? 'text-blue-300' : 'text-slate-400'}`}>Sans club</p>
            </div>
          </div>

          {/* Club */}
          <div className="bg-slate-800 border border-slate-600 rounded-xl p-3 flex flex-col gap-2">
            <p className="text-slate-300 text-xs font-bold uppercase tracking-wider">🏟️ Club</p>
            <select
              value={filterClubId}
              onChange={e => setFilterClubId(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none"
            >
              <option value="">Tous</option>
              <option value="__no_club__">Sans club</option>
              {allClubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Nationalité */}
          <div className="col-span-2 bg-slate-800 border border-slate-600 rounded-xl p-3 flex flex-col gap-2">
            <p className="text-slate-300 text-xs font-bold uppercase tracking-wider">🌍 Nationalité</p>
            <div className="relative">
              <div className="flex items-center gap-2 bg-slate-700 rounded-lg px-2 py-1.5">
                <input
                  type="text"
                  placeholder="Ex: Français, Brésilien..."
                  value={nationalityInput}
                  onChange={e => { setNationalityInput(e.target.value); setShowNatSuggestions(true); if (!e.target.value) setFilterNationality(''); }}
                  onFocus={() => setShowNatSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowNatSuggestions(false), 150)}
                  className="bg-transparent text-white text-xs focus:outline-none w-full"
                />
                {nationalityInput && (
                  <button onClick={() => { setNationalityInput(''); setFilterNationality(''); }}>
                    <X className="w-3 h-3 text-slate-500 hover:text-white" />
                  </button>
                )}
              </div>
              {showNatSuggestions && nationalitySuggestions.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg overflow-hidden shadow-xl">
                  {nationalitySuggestions.map(nat => (
                    <button key={nat} onMouseDown={() => { setNationalityInput(nat); setFilterNationality(nat); setShowNatSuggestions(false); }}
                      className="w-full text-left px-3 py-2 text-xs text-white hover:bg-slate-700 transition-colors">
                      {nat}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {filterNationality && <p className="text-emerald-400 text-xs">Filtre actif : {filterNationality}</p>}
          </div>

        </div>
      </div>

      {/* ── RÉSULTATS ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-slate-400 text-sm">
          <span className="text-white font-semibold">{filtered.length}</span> joueur{filtered.length !== 1 ? 's' : ''}
          {filtered.length > 100 && <span className="text-slate-500"> — affichage limité à 100</span>}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs">Trier :</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucun joueur trouvé</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="divide-y divide-slate-800 max-h-[60vh] overflow-y-auto">
            {filtered.slice(0, 100).map(p => (
              <div key={p.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-800/60 transition-all">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-black text-sm text-white ${p.overall >= 85 ? 'bg-amber-500' : p.overall >= 75 ? 'bg-emerald-600' : p.overall >= 65 ? 'bg-blue-600' : 'bg-slate-600'}`}>
                  {p.overall}
                </div>
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-9 h-9 rounded-full object-cover border-2 border-slate-700 shrink-0" onError={e => e.currentTarget.style.display = 'none'} />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-slate-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-semibold text-sm truncate">{p.name}</p>
                    {p.is_on_transfer_list && <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs px-1.5 py-0">À vendre</Badge>}
                    {p.release_clause > 0 && <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs px-1.5 py-0">⚡ Clause</Badge>}
                  </div>
                  <p className="text-slate-400 text-xs">
                    {p.position} · {p.age ? `${p.age} ans` : ''}{p.nationality ? ` · ${p.nationality}` : ''}
                    {p.potential ? ` · POT ${p.potential}` : ''}
                  </p>
                </div>
                <div className="hidden sm:block text-right shrink-0 mr-2">
                  {p.club_name ? (
                    <Badge className="bg-emerald-500/20 text-emerald-300 text-xs">{p.club_name}</Badge>
                  ) : (
                    <Badge className="bg-slate-600 text-slate-300 text-xs">Sans club</Badge>
                  )}
                  <p className="text-emerald-400 font-bold text-sm mt-1">{((p.value || 0) / 1e6).toFixed(1)}M€</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => setEditingPlayer(p)} className="text-blue-400 hover:text-blue-300">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeletingPlayer(p)} className="text-red-400 hover:text-red-300">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {editingPlayer && (
        <EditPlayerDialog player={editingPlayer} onClose={() => setEditingPlayer(null)} />
      )}

      {deletingPlayer && (
        <Dialog open onOpenChange={() => setDeletingPlayer(null)}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-red-400">Supprimer ce joueur ?</DialogTitle>
            </DialogHeader>
            <p className="text-slate-300 text-sm">
              Êtes-vous sûr de vouloir supprimer <span className="font-bold text-white">{deletingPlayer.name}</span> ? Cette action est irréversible.
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setDeletingPlayer(null)} className="border-slate-600">Annuler</Button>
              <Button
                onClick={() => deleteMutation.mutate(deletingPlayer.id)}
                disabled={deleteMutation.isPending}
                className="bg-red-500 hover:bg-red-600"
              >
                {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Supprimer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}