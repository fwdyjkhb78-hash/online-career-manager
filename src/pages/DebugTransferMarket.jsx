import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";

export default function DebugTransferMarket() {
  const [allPlayers, setAllPlayers] = useState(null);
  const [transferPlayers, setTransferPlayers] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const all = await base44.entities.Player.list();
        const transfer = await base44.entities.Player.filter({ is_on_transfer_list: true });
        setAllPlayers(all);
        setTransferPlayers(transfer);
      } catch (e) {
        console.error('Error:', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return <div className="p-8 text-white">Chargement...</div>;

  return (
    <div className="p-8 bg-slate-950 min-h-screen text-white">
      <h1 className="text-3xl font-bold mb-6">Debug Transfer Market</h1>
      
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-slate-800 p-6 rounded-lg">
          <p className="text-2xl font-bold text-emerald-400">{allPlayers?.length || 0}</p>
          <p className="text-slate-400">Total joueurs en base</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-lg">
          <p className="text-2xl font-bold text-cyan-400">{transferPlayers?.length || 0}</p>
          <p className="text-slate-400">Joueurs en mercato</p>
        </div>
      </div>

      {transferPlayers && transferPlayers.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Joueurs en mercato:</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {transferPlayers.slice(0, 10).map(p => (
              <div key={p.id} className="text-slate-300 text-sm border-b border-slate-700 pb-2">
                {p.name} ({p.position}) - {p.overall} - {p.asking_price ? (p.asking_price / 1000000).toFixed(1) + 'M€' : 'N/A'}
              </div>
            ))}
          </div>
          {transferPlayers.length > 10 && <p className="text-slate-400 text-sm mt-4">... et {transferPlayers.length - 10} autres</p>}
        </div>
      )}
    </div>
  );
}