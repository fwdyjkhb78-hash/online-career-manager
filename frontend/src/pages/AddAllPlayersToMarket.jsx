import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function AddAllPlayersToMarket() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const handleAddToMarket = async () => {
    setLoading(true);
    setStatus(null);

    try {
      const allPlayers = await base44.entities.Player.list();
      const playersToUpdate = allPlayers.filter(p => !p.is_on_transfer_list);

      if (playersToUpdate.length === 0) {
        setStatus({ type: 'info', message: 'Tous les joueurs sont déjà en mercato!' });
        setLoading(false);
        return;
      }

      // Update par batches de 50
      for (let i = 0; i < playersToUpdate.length; i += 50) {
        const batch = playersToUpdate.slice(i, i + 50);
        for (const player of batch) {
          await base44.entities.Player.update(player.id, {
            is_on_transfer_list: true,
            asking_price: player.asking_price || player.value || 0
          });
        }
      }

      setStatus({
        type: 'success',
        message: `✓ ${playersToUpdate.length} joueurs ajoutés au mercato!`
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: `Erreur: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-slate-800/50 backdrop-blur-lg border border-slate-700 rounded-2xl p-8">
          <h1 className="text-3xl font-bold text-white mb-2">Ajouter tous les joueurs au Mercato</h1>
          <p className="text-slate-400 mb-8">Marquer les joueurs existants comme disponibles à la vente</p>

          <Button
            onClick={handleAddToMarket}
            disabled={loading}
            size="lg"
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Mise à jour en cours...
              </>
            ) : (
              'Ajouter tous les joueurs'
            )}
          </Button>

          {status && (
            <div className={`mt-6 flex items-start gap-3 p-4 rounded-lg ${
              status.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30'
                : status.type === 'info'
                ? 'bg-blue-500/10 border border-blue-500/30'
                : 'bg-red-500/10 border border-red-500/30'
            }`}>
              {status.type === 'success' && (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
              )}
              <p className={
                status.type === 'success' ? 'text-emerald-400' : 
                status.type === 'info' ? 'text-blue-400' :
                'text-red-400'
              }>
                {status.message}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}