import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Euro, Loader2 } from 'lucide-react';
import { fetchAll } from '@/utils/fetchAll';

const fmt = (v) => {
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M€`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(0)}K€`;
  return `${v}€`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 shadow-xl text-sm">
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      <p className="text-emerald-400 font-bold">{fmt(payload[0]?.value)}</p>
      {payload[0]?.payload?.event && (
        <p className="text-slate-300 text-xs mt-1 max-w-[180px]">{payload[0].payload.event}</p>
      )}
    </div>
  );
};

export default function BudgetChart({ club }) {
  const clubId = club?.id;
  const currentBudget = club?.budget || 0;

  const { data: transfers = [], isLoading: loadingT } = useQuery({
    queryKey: ['budget-transfers', clubId],
    queryFn: () => fetchAll('Transfer'),
    enabled: !!clubId,
    staleTime: 60000,
  });

  const { data: moneyTransfers = [], isLoading: loadingM } = useQuery({
    queryKey: ['budget-money', clubId],
    queryFn: () => base44.entities.MoneyTransfer.list('-created_date', 200),
    enabled: !!clubId,
    staleTime: 60000,
  });

  const isLoading = loadingT || loadingM;

  const chartData = useMemo(() => {
    if (!clubId) return [];

    // Collecter tous les événements financiers liés au club, du plus récent au plus ancien
    const events = [];

    // Transferts de joueurs complétés
    transfers
      .filter(t => t.status === 'completed' && (t.from_club_id === clubId || t.to_club_id === clubId) && t.created_date)
      .forEach(t => {
        const isSeller = t.from_club_id === clubId;
        const delta = isSeller ? t.amount : -t.amount;
        events.push({
          date: new Date(t.created_date),
          delta,
          event: isSeller
            ? `Vente : ${t.player_name} → ${t.to_club_name} (+${fmt(t.amount)})`
            : `Achat : ${t.player_name} ← ${t.from_club_name || 'Agent libre'} (-${fmt(t.amount)})`,
        });
      });

    // Transferts financiers
    moneyTransfers
      .filter(m => (m.from_club_id === clubId || m.to_club_id === clubId) && m.created_date)
      .forEach(m => {
        const isSender = m.from_club_id === clubId;
        const delta = isSender ? -m.amount : m.amount;
        events.push({
          date: new Date(m.created_date),
          delta,
          event: isSender
            ? `Virement envoyé (-${fmt(m.amount)})${m.reason ? ` : ${m.reason}` : ''}`
            : `Virement reçu (+${fmt(m.amount)})${m.reason ? ` : ${m.reason}` : ''}`,
        });
      });

    if (events.length === 0) {
      return [{ label: 'Aujourd\'hui', budget: currentBudget, event: 'Budget actuel' }];
    }

    // Trier du plus ancien au plus récent
    events.sort((a, b) => a.date - b.date);

    // Reconstituer l'historique en partant du budget actuel et en remontant
    let runningBudget = currentBudget;
    const reversed = [...events].reverse();
    const budgetHistory = [];

    // Point actuel
    budgetHistory.push({ date: new Date(), budget: currentBudget, event: 'Budget actuel' });

    for (const ev of reversed) {
      runningBudget -= ev.delta; // soustraire le delta pour revenir en arrière
      budgetHistory.push({ date: ev.date, budget: runningBudget, event: ev.event });
    }

    budgetHistory.reverse();

    // Formater pour le graphique
    return budgetHistory.map(p => ({
      label: p.date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      budget: Math.round(p.budget),
      event: p.event,
    }));
  }, [transfers, moneyTransfers, clubId, currentBudget]);

  const firstBudget = chartData[0]?.budget || currentBudget;
  const budgetDelta = currentBudget - firstBudget;
  const isPositive = budgetDelta >= 0;

  if (isLoading) return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 flex items-center justify-center h-48">
      <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
    </div>
  );

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Euro className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-bold text-white">Évolution du Budget</h2>
        </div>
        <div className="flex items-center gap-2">
          {isPositive
            ? <TrendingUp className="w-4 h-4 text-emerald-400" />
            : <TrendingDown className="w-4 h-4 text-red-400" />}
          <span className={`text-sm font-semibold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{fmt(budgetDelta)}
          </span>
          <span className="text-slate-500 text-xs">depuis le début</span>
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-3xl font-black text-white">{fmt(currentBudget)}</span>
        <span className="text-slate-400 text-sm">disponible</span>
      </div>

      {chartData.length <= 1 ? (
        <div className="h-32 flex items-center justify-center text-slate-500 text-sm">
          Aucun historique financier disponible
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="budgetGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="label"
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={fmt}
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={55}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="budget"
              stroke="#10b981"
              strokeWidth={2.5}
              fill="url(#budgetGrad)"
              dot={chartData.length <= 10}
              activeDot={{ r: 5, fill: '#10b981', stroke: '#0f172a', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}