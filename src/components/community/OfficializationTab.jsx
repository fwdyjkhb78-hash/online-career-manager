import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, Search, CheckCircle, Trash2, Trophy, Globe, Pencil, X, Check, RefreshCw, ShoppingCart, Plus, UserPlus, UserX } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from 'framer-motion';

const CAN_DELETE = ['owner', 'admin', 'staff_mercato'];
const CAN_CREATE_MANUAL = ['owner', 'admin', 'staff_mercato'];
const POSITIONS = ['GK','CB','LB','RB','CDM','CM','CAM','LW','RW','ST'];
const CAN_EDIT_CLUB = ['owner', 'admin', 'staff_championnat'];

const ALL_CLUBS = [
  { id: '699b20f460c429f21f435de0', name: 'Paris Saint-Germain' },
  { id: '699b20f460c429f21f435de1', name: 'Olympique de Marseille' },
  { id: '699b20f460c429f21f435de2', name: 'Olympique Lyonnais' },
  { id: '699b20f460c429f21f435de3', name: 'Paris FC' },
  { id: '699b20f460c429f21f435de4', name: 'Manchester City' },
  { id: '699b20f460c429f21f435de5', name: 'Manchester United' },
  { id: '699b20f460c429f21f435de6', name: 'Liverpool FC' },
  { id: '699b20f460c429f21f435de7', name: 'Chelsea FC' },
  { id: '699b20f460c429f21f435de8', name: 'Arsenal FC' },
  { id: '699b20f460c429f21f435de9', name: 'Newcastle United' },
  { id: '699b20f460c429f21f435dea', name: 'Real Madrid' },
  { id: '699b20f460c429f21f435deb', name: 'FC Barcelone' },
  { id: '699b20f460c429f21f435dec', name: 'Atletico Madrid' },
  { id: '699b20f460c429f21f435ded', name: 'Athletic Bilbao' },
  { id: '699b20f460c429f21f435dee', name: 'Bayern Munich' },
  { id: '699b20f460c429f21f435def', name: 'Borussia Dortmund' },
  { id: '699b20f460c429f21f435df0', name: 'Juventus' },
  { id: '699b20f460c429f21f435df1', name: 'Inter Milan' },
  { id: '699b20f460c429f21f435df2', name: 'AC Milan' },
  { id: '699b20f460c429f21f435df3', name: 'SSC Naples' },
];

function OfficialCard({ a, canDelete, canEditClub, onDelete, onUpdateClub, currentUser, onExerciseBuyOption }) {
  const isHorsLigue = a.transfer_type === 'hors_ligue' || a.is_external_player;
  const [editing, setEditing] = useState(false);
  const [selectedClubId, setSelectedClubId] = useState('');
  const isBuyingClub = currentUser && (a.current_bidder_id === currentUser.id || a.current_bidder_club === currentUser.club_name);

  const formatPrice = (price) => {
    if (!price) return '—';
    if (price >= 1000000) return `${(price / 1000000).toFixed(2)}M€`;
    return `${(price / 1000).toFixed(0)}K€`;
  };

  const handleSave = () => {
    const club = ALL_CLUBS.find(c => c.id === selectedClubId);
    if (club) onUpdateClub(a.id, club.id, club.name);
    setEditing(false);
  };

  const recruitedClub = a.current_bidder_club || a.seller_club_name || '—';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-slate-800/60 border rounded-2xl p-4 flex items-center gap-4 ${
        isHorsLigue ? 'border-purple-500/20' : 'border-emerald-500/20'
      }`}
    >
      {a.player_image_url ? (
        <img src={a.player_image_url} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
      ) : (
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 border ${
          isHorsLigue
            ? 'bg-purple-500/20 border-purple-500/20'
            : 'bg-emerald-500/20 border-emerald-500/20'
        }`}>
          <span className="text-white font-bold text-lg">{a.player_name?.charAt(0)}</span>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-white font-bold text-base">{a.player_name}</p>
          {a.player_position && <Badge className="bg-slate-700 text-slate-300 text-xs">{a.player_position}</Badge>}
          {a.player_overall && <Badge className="bg-amber-500/20 text-amber-300 text-xs">⭐ {a.player_overall}</Badge>}
          <CheckCircle className={`w-4 h-4 shrink-0 ${isHorsLigue ? 'text-purple-400' : 'text-emerald-400'}`} />
        </div>

        <div className="text-slate-300 text-sm mt-1">
          {isHorsLigue ? (
            <span className="text-slate-500">Recruté par </span>
          ) : a.is_loan ? (
            <span className="text-slate-500">Prêté à </span>
          ) : (
            <span className="text-slate-500">Acquis par </span>
          )}
          {editing && canEditClub ? (
            <span className="inline-flex items-center gap-1 mt-1">
              <select
                value={selectedClubId}
                onChange={e => setSelectedClubId(e.target.value)}
                className="bg-slate-700 text-white text-sm rounded px-2 py-0.5 border border-slate-600 outline-none"
              >
                <option value="">-- Choisir un club --</option>
                {ALL_CLUBS.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-400 hover:text-emerald-300" onClick={handleSave}>
                <Check className="w-3.5 h-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400 hover:text-slate-300" onClick={() => setEditing(false)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </span>
          ) : (
            <>
              <span className={`font-semibold ${isHorsLigue ? 'text-purple-300' : a.is_loan ? 'text-blue-300' : 'text-emerald-300'}`}>{recruitedClub}</span>
              {isHorsLigue && <span className="text-slate-500"> · depuis l'extérieur de la ligue</span>}
              {!isHorsLigue && !a.is_loan && a.seller_club_name && <span className="text-slate-500"> · vendu par {a.seller_club_name}</span>}
              {a.is_loan && a.seller_club_name && <span className="text-slate-500"> · prêté par {a.seller_club_name}</span>}
              {canEditClub && (
                <button onClick={() => { setSelectedClubId(''); setEditing(true); }} className="ml-2 text-slate-500 hover:text-purple-300 inline-flex items-center">
                  <Pencil className="w-3 h-3" />
                </button>
              )}
            </>
          )}
        </div>
        {/* Loan options info */}
        {a.is_loan && (a.loan_buy_option > 0 || a.loan_mandatory_buy_option > 0) && (
          <div className="text-xs mt-1 space-y-0.5">
            {a.loan_buy_option > 0 && !a.loan_buy_option_exercised && (
              <p className="text-blue-400">🔵 Option facultative : {(a.loan_buy_option/1e6).toFixed(2)}M€</p>
            )}
            {a.loan_mandatory_buy_option > 0 && !a.loan_buy_option_exercised && (
              <p className="text-amber-400">⚠️ Option obligatoire J.19 : {(a.loan_mandatory_buy_option/1e6).toFixed(2)}M€</p>
            )}
          </div>
        )}
        <p className="text-slate-500 text-xs mt-0.5">
          {a.ends_at ? formatDistanceToNow(new Date(a.ends_at), { addSuffix: true, locale: fr }) : ''}
        </p>
      </div>

      <div className="text-right shrink-0 flex flex-col items-end gap-2">
        <p className={`font-bold text-lg ${isHorsLigue ? 'text-purple-300' : 'text-emerald-400'}`}>
          {formatPrice(a.current_price)}
        </p>
        {a.is_loan ? (
          <Badge className="bg-blue-500/20 text-blue-300 text-xs">
            <RefreshCw className="w-3 h-3 mr-1" />Prêt
          </Badge>
        ) : (
          <Badge className={isHorsLigue ? 'bg-purple-500/20 text-purple-300 text-xs' : 'bg-emerald-500/20 text-emerald-300 text-xs'}>
            Officiel ✓
          </Badge>
        )}
        {/* Options d'achat pour le club prêteur */}
        {a.is_loan && !a.loan_buy_option_exercised && isBuyingClub && a.loan_buy_option > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-blue-500/50 text-blue-300 hover:bg-blue-500/10"
            onClick={() => onExerciseBuyOption(a, false)}
          >
            <ShoppingCart className="w-3 h-3 mr-1" />
            Option {(a.loan_buy_option/1e6).toFixed(1)}M€
          </Button>
        )}
        {a.is_loan && a.loan_buy_option_exercised && (
          <Badge className="bg-emerald-500/20 text-emerald-300 text-xs">✅ Option exercée</Badge>
        )}
        {canDelete && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-red-400"
            onClick={() => onDelete(a.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function ManualOfficializationForm({ allClubs, onSave, onClose }) {
  const emptyRow = () => ({ seller_club_id: '', seller_club_name: '', player_id: '', player_name: '', player_position: 'ST', player_overall: '', current_bidder_club: '', current_price: '', transfer_type: 'ligue', is_loan: false });
  const [rows, setRows] = useState([emptyRow()]);

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['all-players-for-offic'],
    queryFn: () => base44.entities.Player.list('-overall', 2000),
    staleTime: 60000,
  });

  const updateRow = (i, patch) => setRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  const addRow = () => setRows(prev => [...prev, emptyRow()]);
  const removeRow = (i) => setRows(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = () => {
    const valid = rows.filter(r => r.player_name.trim());
    if (!valid.length) return;
    onSave(valid);
  };

  return (
    <div className="bg-slate-800/80 border border-emerald-500/30 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-bold flex items-center gap-2"><UserPlus className="w-4 h-4 text-emerald-400" />Officialisations manuelles</h3>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" onClick={onClose}><X className="w-4 h-4" /></Button>
      </div>
      <div className="space-y-3">
        {rows.map((row, i) => {
          const clubPlayers = row.transfer_type === 'ligue' && row.seller_club_id
            ? allPlayers.filter(p => p.club_id === row.seller_club_id)
            : [];
          return (
            <div key={i} className="bg-slate-700/40 rounded-xl p-3 space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Type</label>
                  <select value={row.transfer_type} onChange={e => updateRow(i, { transfer_type: e.target.value, player_name: '', player_id: '', player_position: 'ST', player_overall: '', seller_club_id: '', seller_club_name: '' })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm outline-none">
                    <option value="ligue">Ligue</option>
                    <option value="hors_ligue">Hors Ligue</option>
                  </select>
                </div>
                {row.transfer_type === 'ligue' ? (
                  <div>
                    <label className="text-slate-400 text-xs mb-1 block">Club vendeur *</label>
                    <select value={row.seller_club_id}
                      onChange={e => {
                        const club = allClubs.find(c => c.id === e.target.value);
                        updateRow(i, { seller_club_id: e.target.value, seller_club_name: club?.name || '', player_name: '', player_id: '', player_position: 'ST', player_overall: '' });
                      }}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm outline-none">
                      <option value="">-- Choisir --</option>
                      {allClubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="text-slate-400 text-xs mb-1 block">Nom du joueur *</label>
                    <input value={row.player_name} onChange={e => updateRow(i, { player_name: e.target.value })}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm outline-none focus:border-emerald-500" placeholder="Nom" />
                  </div>
                )}
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">
                    {row.transfer_type === 'ligue' ? 'Joueur *' : 'Poste'}
                  </label>
                  {row.transfer_type === 'ligue' ? (
                    <select value={row.player_id}
                      onChange={e => {
                        const player = allPlayers.find(p => p.id === e.target.value);
                        updateRow(i, { player_id: e.target.value, player_name: player?.name || '', player_position: player?.position || 'ST', player_overall: player?.overall || '' });
                      }}
                      disabled={!row.seller_club_id}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm outline-none disabled:opacity-50">
                      <option value="">{row.seller_club_id ? '-- Choisir --' : '(choisir club d abord)'}</option>
                      {clubPlayers.map(p => <option key={p.id} value={p.id}>{p.name} ({p.position}, {p.overall})</option>)}
                    </select>
                  ) : (
                    <select value={row.player_position} onChange={e => updateRow(i, { player_position: e.target.value })}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm outline-none">
                      {POSITIONS.map(pos => <option key={pos}>{pos}</option>)}
                    </select>
                  )}
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Club acheteur</label>
                  <select value={row.current_bidder_club} onChange={e => updateRow(i, { current_bidder_club: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm outline-none">
                    <option value="">-- Sélectionner --</option>
                    {allClubs.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 items-end">
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Prix (M€)</label>
                  <input type="number" value={row.current_price} onChange={e => updateRow(i, { current_price: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm outline-none" placeholder="Ex: 25" step="0.1" />
                </div>
                <div className="flex items-center gap-2 pt-4">
                  <label className="flex items-center gap-1 text-slate-400 text-xs cursor-pointer">
                    <input type="checkbox" checked={row.is_loan} onChange={e => updateRow(i, { is_loan: e.target.checked })} className="accent-blue-500" />
                    Prêt
                  </label>
                </div>
                <div className="flex justify-end">
                  {rows.length > 1 && (
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => removeRow(i)}><X className="w-3.5 h-3.5" /></Button>
                  )}
                </div>
              </div>
              {row.player_name && (
                <p className="text-emerald-400 text-xs">✅ {row.player_name}{row.player_position ? ` · ${row.player_position}` : ''}{row.player_overall ? ` · ${row.player_overall}` : ''}</p>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between">
        <Button size="sm" variant="outline" className="border-slate-600 text-slate-300" onClick={addRow}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Ajouter un joueur
        </Button>
        <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={handleSave}
          disabled={!rows.some(r => r.player_name.trim())}>
          <Check className="w-3.5 h-3.5 mr-1" /> Officialiser ({rows.filter(r => r.player_name.trim()).length})
        </Button>
      </div>
    </div>
  );
}

export default function OfficializationTab({ currentUser, initialSection }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeSection, setActiveSection] = useState(initialSection || 'ligue');
  const [showManualForm, setShowManualForm] = useState(false);
  const canDelete = currentUser && CAN_DELETE.includes(currentUser.role);
  const canCreate = currentUser && CAN_CREATE_MANUAL.includes(currentUser.role);
  const canEditClub = currentUser && CAN_EDIT_CLUB.includes(currentUser.role);
  const { data: allClubs = [] } = useQuery({
    queryKey: ['all-clubs-official'],
    queryFn: () => base44.entities.Club.list(),
    staleTime: 60000,
  });

  const exerciseBuyOption = useMutation({
    mutationFn: async (auction) => {
      const amount = auction.loan_buy_option;
      const buyerClub = allClubs.find(c => c.name === auction.current_bidder_club || c.id === auction.current_bidder_id);
      const sellerClub = allClubs.find(c => c.id === auction.seller_club_id);
      if (!buyerClub || !sellerClub) throw new Error('Clubs introuvables');
      if ((buyerClub.budget || 0) < amount) throw new Error('Budget insuffisant');
      await base44.entities.Club.update(buyerClub.id, { budget: (buyerClub.budget || 0) - amount });
      await base44.entities.Club.update(sellerClub.id, { budget: (sellerClub.budget || 0) + amount });
      await base44.entities.Auction.update(auction.id, { loan_buy_option_exercised: true });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['auctions-ended'] })
  });

  const { data: auctions = [], isLoading } = useQuery({
    queryKey: ['auctions-ended'],
    queryFn: async () => {
      try {
        return await base44.entities.Auction.list('-updated_date', 200);
      } catch (e) {
        return [];
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const createManualMutation = useMutation({
    mutationFn: async (players) => {
      for (const p of players) {
        await base44.entities.Auction.create({
          player_name: p.player_name.trim(),
          player_position: p.player_position,
          player_overall: p.player_overall ? Number(p.player_overall) : undefined,
          seller_club_name: p.seller_club_name || undefined,
          current_bidder_club: p.current_bidder_club || undefined,
          current_price: p.current_price ? Number(p.current_price) * 1e6 : 0,
          transfer_type: p.transfer_type,
          is_loan: p.is_loan,
          status: 'completed',
          starting_price: 0,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auctions-ended'] });
      setShowManualForm(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Auction.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['auctions-ended'] })
  });

  const updateClubMutation = useMutation({
    mutationFn: ({ id, clubId, clubName }) => base44.entities.Auction.update(id, {
      current_bidder_club: clubName,
      current_bidder_id: clubId,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['auctions-ended'] })
  });

  const isHorsLigue = (a) => a.transfer_type === 'hors_ligue' || a.is_external_player;
  const isAgentLibre = (a) => a.seller_club_name === 'Agent libre' || a.current_bidder_club === 'Agent libre';

  // Seules les enchères officiellement complétées (status=completed) apparaissent ici
  const agentLibreItems = auctions.filter(a => a.status === 'completed' && isAgentLibre(a));
  const ligueItems = auctions.filter(a => a.status === 'completed' && !isHorsLigue(a) && !isAgentLibre(a));
  const horsLigueItems = auctions.filter(a => a.status === 'completed' && isHorsLigue(a) && !isAgentLibre(a));
  const [agentLibreFilter, setAgentLibreFilter] = useState('all'); // 'all' | 'liberations' | 'signatures'

  const filterItems = (items) => {
    let filtered = items;
    if (activeSection === 'agent_libre') {
      if (agentLibreFilter === 'liberations') filtered = filtered.filter(a => a.current_bidder_club === 'Agent libre');
      if (agentLibreFilter === 'signatures') filtered = filtered.filter(a => a.seller_club_name === 'Agent libre');
    }
    const q = search.toLowerCase();
    if (!q) return filtered;
    return filtered.filter(a =>
      a.player_name?.toLowerCase().includes(q) ||
      a.current_bidder_club?.toLowerCase().includes(q) ||
      a.current_bidder_name?.toLowerCase().includes(q) ||
      a.seller_club_name?.toLowerCase().includes(q)
    );
  };

  const displayedItems = filterItems(
    activeSection === 'ligue' ? ligueItems
    : activeSection === 'hors_ligue' ? horsLigueItems
    : agentLibreItems
  );

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-emerald-500 animate-spin" /></div>;

  return (
    <div className="space-y-5">
      {/* Manual create button for staff */}
      {canCreate && (
        <div className="flex justify-end">
          <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600" onClick={() => setShowManualForm(v => !v)}>
            <UserPlus className="w-4 h-4 mr-1" /> Officialisation manuelle
          </Button>
        </div>
      )}
      {showManualForm && (
        <ManualOfficializationForm
          allClubs={allClubs}
          onSave={(players) => createManualMutation.mutate(players)}
          onClose={() => setShowManualForm(false)}
        />
      )}
      {/* Section tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveSection('ligue')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
            activeSection === 'ligue'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:text-white'
          }`}
        >
          <Trophy className="w-4 h-4" />
          Ligue
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeSection === 'ligue' ? 'bg-emerald-500/30' : 'bg-slate-700'}`}>
            {ligueItems.length}
          </span>
        </button>
        <button
          onClick={() => setActiveSection('hors_ligue')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
            activeSection === 'hors_ligue'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
              : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:text-white'
          }`}
        >
          <Globe className="w-4 h-4" />
          Hors Ligue
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeSection === 'hors_ligue' ? 'bg-purple-500/30' : 'bg-slate-700'}`}>
            {horsLigueItems.length}
          </span>
        </button>
        <button
          onClick={() => setActiveSection('agent_libre')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
            activeSection === 'agent_libre'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:text-white'
          }`}
        >
          <UserX className="w-4 h-4" />
          Agent libre
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeSection === 'agent_libre' ? 'bg-amber-500/30' : 'bg-slate-700'}`}>
            {agentLibreItems.length}
          </span>
        </button>
      </div>

      {/* Agent libre sub-filters */}
      {activeSection === 'agent_libre' && (
        <div className="flex gap-2">
          {[{id:'all',label:'Tous'},{id:'liberations',label:'🔴 Libérations (sans club)'},{id:'signatures',label:'🟢 Signatures de libres'}].map(f => (
            <button
              key={f.id}
              onClick={() => setAgentLibreFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                agentLibreFilter === f.id
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un joueur, un club..."
          className="pl-9 bg-slate-800 border-slate-700 text-white"
        />
      </div>

      {displayedItems.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          {activeSection === 'ligue' ? <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
            : activeSection === 'hors_ligue' ? <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
            : <UserX className="w-12 h-12 mx-auto mb-3 opacity-30" />}
          <p>{search ? 'Aucun résultat.' : `Aucune officialisation ${activeSection === 'ligue' ? 'en ligue' : activeSection === 'hors_ligue' ? 'hors ligue' : 'agent libre'} pour le moment.`}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedItems.map(a => (
            <OfficialCard
              key={a.id}
              a={a}
              canDelete={canDelete}
              canEditClub={canEditClub}
              currentUser={currentUser}
              onDelete={(id) => deleteMutation.mutate(id)}
              onUpdateClub={(id, clubId, clubName) => updateClubMutation.mutate({ id, clubId, clubName })}
              onExerciseBuyOption={(auction) => exerciseBuyOption.mutate(auction)}
            />
          ))}
        </div>
      )}
    </div>
  );
}