import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, RefreshCw, ChevronRight, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from 'sonner';

export default function SeasonManagerTab() {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [moraleLoading, setMoraleLoading] = useState(false);

  const handleResetMorale = async () => {
    setMoraleLoading(true);
    try {
      const allMessages = await base44.entities.PlayerMessage.list('-created_date', 1000);
      await Promise.all(allMessages.map(m =>
        base44.entities.PlayerMessage.update(m.id, { morale: 100, emotion: 'neutral', is_read: true })
      ));
      toast.success('✅ Moral de tous les joueurs remis au maximum !');
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setMoraleLoading(false);
    }
  };

  const { data: seasons = [] } = useQuery({
    queryKey: ['seasons'],
    queryFn: () => base44.entities.Season.list('-season_number', 20),
  });

  const activeSeason = seasons.find(s => s.is_active);
  const nextSeasonNumber = (activeSeason?.season_number || 0) + 1;

  const { data: evolutionsCount } = useQuery({
    queryKey: ['all-evolutions-count'],
    queryFn: async () => {
      const evos = await base44.entities.PlayerEvolution.list('-created_date', 1000);
      return evos.length;
    },
  });

  const handleNewSeason = async () => {
    setLoading(true);
    try {
      // 1. Désactiver la saison courante
      if (activeSeason) {
        await base44.entities.Season.update(activeSeason.id, { is_active: false });
      }

      // 2. Créer la nouvelle saison
      await base44.entities.Season.create({
        season_number: nextSeasonNumber,
        is_active: true,
        label: `Saison ${nextSeasonNumber}`,
      });

      // 3. Supprimer toutes les évolutions (réinitialise le compteur pour tous les clubs)
      const allEvos = await base44.entities.PlayerEvolution.list('-created_date', 1000);
      await Promise.all(allEvos.map(e => base44.entities.PlayerEvolution.delete(e.id)));

      // 4. Déclencher les options d'achat obligatoires sur les prêts
      try {
        await base44.functions.invoke('checkMandatoryBuyOptions', {});
      } catch (e) { /* non bloquant */ }

      // 5. Récupérer tous les clubs pour relégation + remise à zéro
      const allClubs = await base44.entities.Club.list();

      // 5b. Relégation / montée automatique (2 derniers de Ligue 1 ↔ 2 premiers de Ligue 2)
      const RELEGATION_SPOTS = 2;
      const ligue1Clubs = allClubs
        .filter(c => (c.championship || 'ligue1_serie_a') === 'ligue1_serie_a')
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          return ((b.goals_for || 0) - (b.goals_against || 0)) - ((a.goals_for || 0) - (a.goals_against || 0));
        });
      const ligue2Clubs = allClubs
        .filter(c => c.championship === 'bundesliga_liga_pl')
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          return ((b.goals_for || 0) - (b.goals_against || 0)) - ((a.goals_for || 0) - (a.goals_against || 0));
        });
      const relegated = ligue1Clubs.slice(-RELEGATION_SPOTS);
      const promoted = ligue2Clubs.slice(0, RELEGATION_SPOTS);
      await Promise.all([
        ...relegated.map(c => base44.entities.Club.update(c.id, { championship: 'bundesliga_liga_pl' })),
        ...promoted.map(c => base44.entities.Club.update(c.id, { championship: 'ligue1_serie_a' })),
      ]);

      // 6. Remettre les points de tous les clubs à zéro
      await Promise.all(allClubs.map(c => base44.entities.Club.update(c.id, {
        points: 0, wins: 0, draws: 0, losses: 0, goals_for: 0, goals_against: 0
      })));
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
      queryClient.invalidateQueries({ queryKey: ['clubs-staff'] });
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['all-evolutions-count'] });
      queryClient.invalidateQueries({ queryKey: ['season-evolutions'] });

      toast.success(`🎉 Saison ${nextSeasonNumber} démarrée ! Options obligatoires traitées, évolutions réinitialisées.`);
      setConfirmOpen(false);
    } catch (err) {
      toast.error('Erreur lors du changement de saison : ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-emerald-400" />
            Gestion des Saisons
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Saison active */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-400 font-bold text-lg">
                  {activeSeason ? activeSeason.label : 'Aucune saison active'}
                </p>
                <p className="text-slate-400 text-sm">Saison actuellement en cours</p>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Active
              </Badge>
            </div>
            <div className="mt-3 pt-3 border-t border-emerald-500/20">
              <p className="text-slate-400 text-sm">
                Évolutions enregistrées au total : <span className="text-white font-bold">{evolutionsCount ?? '...'}</span>
              </p>
            </div>
          </div>

          {/* Bouton reset moral */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">😊</span>
              <div className="flex-1">
                <p className="text-white font-semibold">Remettre le moral à 100</p>
                <p className="text-slate-400 text-sm mt-1">Tous les messages joueurs passent à moral maximum et émotion heureuse.</p>
              </div>
            </div>
            <Button
              className="mt-4 w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
              onClick={handleResetMorale}
              disabled={moraleLoading}
            >
              {moraleLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : '😊'}
              Remettre tout le monde heureux
            </Button>
          </div>

          {/* Bouton nouvelle saison */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-white font-semibold">Passer à la saison suivante</p>
                <p className="text-slate-400 text-sm mt-1">
                  Ceci va démarrer la <strong className="text-amber-400">Saison {nextSeasonNumber}</strong> et réinitialiser
                  le compteur d'évolutions de <strong>tous les clubs</strong> (les 10 évolutions remises à zéro).
                  Les notes des joueurs restent inchangées.
                </p>
              </div>
            </div>
            <Button
              className="mt-4 w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
              onClick={() => setConfirmOpen(true)}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Démarrer la Saison {nextSeasonNumber}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Historique des saisons */}
      {seasons.length > 1 && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-400 text-sm">Historique des saisons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {seasons.map(s => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                  <span className="text-white">{s.label}</span>
                  <Badge className={s.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}>
                    {s.is_active ? 'Active' : 'Terminée'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog confirmation */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-amber-400" />
              Confirmer le changement de saison
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <p className="text-amber-300 text-sm font-semibold">⚠️ Cette action est irréversible</p>
              <ul className="text-slate-300 text-sm mt-2 space-y-1 list-disc list-inside">
                <li>Toutes les évolutions de la saison actuelle sont effacées</li>
                <li>Chaque club récupère ses 10 évolutions disponibles</li>
                <li>Les notes des joueurs ne changent pas</li>
                <li>Les points / buts de tous les clubs sont remis à zéro</li>
                <li>Les 15e et 16e de Ligue 1 descendent en Ligue 2</li>
                <li>Les 1er et 2e de Ligue 2 montent en Ligue 1</li>
                <li>Les budgets ne sont pas modifiés</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-slate-600" onClick={() => setConfirmOpen(false)} disabled={loading}>
                Annuler
              </Button>
              <Button
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-bold"
                onClick={handleNewSeason}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Confirmer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}