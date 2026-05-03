import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, Loader2, Euro } from 'lucide-react';
import { fetchAll } from '@/utils/fetchAll';

const COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#a855f7',
  '#14b8a6', '#e11d48', '#0ea5e9', '#d97706', '#7c3aed',
];

const fmt = (v) => {
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(0)}M€`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(0)}K€`;
  return `${v}€`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const sorted = [...payload].sort((a, b) => (b.value || 0) - (a.value || 0));
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 shadow-xl text-xs max-w-[220px]">
      <p className="text-slate-400 mb-2 font-semibold">{label}</p>
      {sorted.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-3 mb-1">
          <span style={{ color: p.color }} className="truncate font-medium">{p.name}</span>
          <span className="text-white font-bold shrink-0">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function ClubsBudgetChart() {
  const [selectedChamp, setSelectedChamp] = useState('all');
  const [selectedClubs, setSelectedClubs] = useState(new Set());

  const { data: clubs = [], isLoading: loadingClubs } = useQuery({
    queryKey: ['all-clubs-budget-chart'],
    queryFn: () => base44.entities.Club.list('name', 200),
    staleTime: 60000,
  });

  const { data: championships = [] } = useQuery({
    queryKey: ['championships'],
    queryFn: () => base44.entities.Championship.list('order', 50),
    staleTime: 60000,
  });

  const { data: transfers = [], isLoading: loadingT } = useQuery({
    queryKey: ['all-transfers-budget-chart'],
    queryFn: () => fetchAll('Transfer'),
    staleTime: 60000,
  });

  const { data: moneyTransfers = [], isLoading: loadingM } = useQuery({
    queryKey: ['all-money-transfers-budget-chart'],
    queryFn: () => base44.entities.MoneyTransfer.list('-created_date', 500),
    staleTime: 60000,
  });

  const isLoading = loadingClubs || loadingT || loadingM;

  // Filter clubs by championship
  const filteredClubs = useMemo(() => {
    if (selectedChamp === 'all') return clubs;
    return clubs.filter(c => {
      const arr = c.championships?.length > 0 ? c.championships : (c.championship ? [c.championship] : []);
      return arr.includes(selectedChamp);
    });
  }, [clubs, selectedChamp]);

  // Init selection to all visible clubs
  const displayClubs = useMemo(() => {
    if (selectedClubs.size === 0) return filteredClubs;
    return filteredClubs.filter(c => selectedClubs.has(c.id));
  }, [filteredClubs, selectedClubs]);

  // Build timeline for each club
  const chartData = useMemo(() => {
    if (!displayClubs.length || !transfers.length && !moneyTransfers.length) return [];

    // Collect all dates from financial events
    const dateSet = new Set();
    dateSet.add(new Date().toDateString());

    const clubEvents = {}; // clubId -> [{date, delta}]
    displayClubs.forEach(c => { clubEvents[c.id] = []; });

    transfers
      .filter(t => t.status === 'completed' && t.created_date)
      .forEach(t => {
        if (clubEvents[t.from_club_id]) {
          clubEvents[t.from_club_id].push({ date: new Date(t.created_date), delta: t.amount });
          dateSet.add(new Date(t.created_date).toDateString());
        }
        if (clubEvents[t.to_club_id]) {
          clubEvents[t.to_club_id].push({ date: new Date(t.created_date), delta: -t.amount });
          dateSet.add(new Date(t.created_date).toDateString());
        }
      });

    moneyTransfers
      .filter(m => m.created_date)
      .forEach(m => {
        if (clubEvents[m.from_club_id]) {
          clubEvents[m.from_club_id].push({ date: new Date(m.created_date), delta: -m.amount });
          dateSet.add(new Date(m.created_date).toDateString());
        }
        if (clubEvents[m.to_club_id]) {
          clubEvents[m.to_club_id].push({ date: new Date(m.created_date), delta: m.amount });
          dateSet.add(new Date(m.created_date).toDateString());
        }
      });

    // Get sorted unique dates
    const dates = [...dateSet]
      .map(d => new Date(d))
      .sort((a, b) => a - b)
      .slice(-30); // max 30 points

    if (dates.length < 2) {
      // Just show current budgets
      return [{
        label: "Aujourd'hui",
        ...Object.fromEntries(displayClubs.map(c => [c.id, c.budget || 0]))
      }];
    }

    // Build budget at each date per club (backwards from current)
    return dates.map(date => {
      const point = {
        label: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      };
      displayClubs.forEach(c => {
        // Start from current budget, subtract events that happened AFTER this date
        let budget = c.budget || 0;
        (clubEvents[c.id] || [])
          .filter(ev => ev.date > date)
          .forEach(ev => { budget -= ev.delta; });
        point[c.id] = Math.round(budget);
      });
      return point;
    });
  }, [displayClubs, transfers, moneyTransfers]);

  const toggleClub = (clubId) => {
    setSelectedClubs(prev => {
      const next = new Set(prev);
      if (next.has(clubId)) {
        next.delete(clubId);
      } else {
        next.add(clubId);
      }
      return next;
    });
  };

  const selectAll = () => setSelectedClubs(new Set());
  const deselectAll = () => setSelectedClubs(new Set(filteredClubs.map(c => c.id)));

  if (isLoading) return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 flex items-center justify-center h-48">
      <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
    </div>
  );

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Euro className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-bold text-white">Évolution des budgets</h2>
          <TrendingUp className="w-4 h-4 text-slate-500" />
        </div>
        <select
          value={selectedChamp}
          onChange={e => { setSelectedChamp(e.target.value); setSelectedClubs(new Set()); }}
          className="bg-slate-700 text-white text-xs rounded-lg px-3 py-1.5 border border-slate-600 focus:outline-none focus:border-emerald-500"
        >
          <option value="all">Tous les championnats</option>
          {championships.map(c => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Club toggles */}
      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={selectAll} className="text-xs text-slate-400 hover:text-white transition-colors px-2 py-1 rounded bg-slate-700/50">Tous</button>
        <button onClick={deselectAll} className="text-xs text-slate-400 hover:text-white transition-colors px-2 py-1 rounded bg-slate-700/50">Aucun</button>
        {filteredClubs.map((c, i) => {
          const color = COLORS[i % COLORS.length];
          const active = selectedClubs.size === 0 || selectedClubs.has(c.id);
          return (
            <button
              key={c.id}
              onClick={() => toggleClub(c.id)}
              className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border transition-all ${active ? 'border-transparent' : 'border-slate-700 opacity-40'}`}
              style={{ backgroundColor: active ? `${color}20` : undefined }}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span style={{ color: active ? color : '#64748b' }} className="font-medium max-w-[80px] truncate">{c.name}</span>
            </button>
          );
        })}
      </div>

      {/* Chart */}
      {chartData.length < 2 ? (
        <div className="h-48 flex items-center justify-center">
          <div className="text-center">
            <p className="text-slate-500 text-sm mb-3">Pas assez d'historique financier</p>
            {/* Barres statiques */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
              {displayClubs.sort((a, b) => (b.budget || 0) - (a.budget || 0)).map((c, i) => (
                <div key={c.id} className="bg-slate-700/40 rounded-xl p-3 text-center">
                  {c.logo_url ? (
                    <img src={c.logo_url} alt={c.name} className="w-8 h-8 rounded-lg object-cover mx-auto mb-1" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center mx-auto mb-1">
                      <span className="text-slate-400 text-xs font-bold">{c.name?.substring(0, 2).toUpperCase()}</span>
                    </div>
                  )}
                  <p className="text-white font-bold text-sm">{fmt(c.budget || 0)}</p>
                  <p className="text-slate-400 text-xs truncate">{c.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tickFormatter={fmt} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={55} />
            <Tooltip content={<CustomTooltip />} />
            {displayClubs.map((c, i) => (
              <Line
                key={c.id}
                type="monotone"
                dataKey={c.id}
                name={c.name}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Current standings */}
      <div className="border-t border-slate-700/50 pt-4">
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3">Budget actuel</p>
        <div className="space-y-2">
          {[...displayClubs]
            .sort((a, b) => (b.budget || 0) - (a.budget || 0))
            .map((c, i) => {
              const color = COLORS[filteredClubs.findIndex(fc => fc.id === c.id) % COLORS.length];
              const maxBudget = Math.max(...displayClubs.map(x => x.budget || 0), 1);
              const pct = ((c.budget || 0) / maxBudget) * 100;
              return (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="text-slate-500 text-xs w-4 shrink-0">{i + 1}</span>
                  {c.logo_url ? (
                    <img src={c.logo_url} alt={c.name} className="w-6 h-6 rounded object-cover shrink-0" />
                  ) : (
                    <div className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center shrink-0">
                      <span className="text-slate-400 text-[9px] font-bold">{c.name?.substring(0, 2).toUpperCase()}</span>
                    </div>
                  )}
                  <span className="text-white text-xs font-medium w-28 truncate shrink-0">{c.name}</span>
                  <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                  <span className="text-white text-xs font-bold w-16 text-right shrink-0">{fmt(c.budget || 0)}</span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}