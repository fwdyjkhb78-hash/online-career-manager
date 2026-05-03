import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Trophy, Wand2, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import LeagueFormatManager from '@/components/shared/LeagueFormatManager';
import PromotionRelegationConfig from '@/components/staff/PromotionRelegationConfig';

export default function ChampionshipFormatTab() {
  const queryClient = useQueryClient();
  const { data: clubs = [], isLoading: clubsLoading } = useQuery({
    queryKey: ['clubs'],
    queryFn: () => base44.entities.Club.list(),
  });

  const { data: championships = [], isLoading: champsLoading } = useQuery({
    queryKey: ['championships'],
    queryFn: () => base44.entities.Championship.list('order', 50),
  });

  const [championship, setChampionship] = useState(null);
  const [activeSection, setActiveSection] = useState('format'); // 'format' | 'promotion'

  // Patch matchs existants sans tournament_name pour les clubs du championnat sélectionné
  const patchMutation = useMutation({
    mutationFn: async () => {
      const champ = championships.find(c => c.slug === currentSlug);
      if (!champ) throw new Error('Championnat introuvable');
      const clubIds = champClubs.map(c => c.id);

      // Récupérer tous les matchs de tous les clubs du champ
      const allMatchSets = await Promise.all(
        clubIds.flatMap(id => [
          base44.entities.Match.filter({ home_club_id: id, match_type: 'championnat' }),
          base44.entities.Match.filter({ away_club_id: id, match_type: 'championnat' }),
        ])
      );
      // Dédupliquer
      const seen = new Set();
      const allMatches = [];
      allMatchSets.flat().forEach(m => { if (!seen.has(m.id)) { seen.add(m.id); allMatches.push(m); } });

      const clubIdSet = new Set(clubIds);
      // Ne mettre à jour que les matchs où les DEUX équipes appartiennent à ce championnat
      const toUpdate = allMatches.filter(m =>
        !m.tournament_name &&
        clubIdSet.has(m.home_club_id) &&
        clubIdSet.has(m.away_club_id)
      );
      for (const m of toUpdate) {
        await base44.entities.Match.update(m.id, { tournament_name: champ.name });
      }
      return toUpdate.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} match${count > 1 ? 's' : ''} mis à jour avec le nom "${championships.find(c => c.slug === currentSlug)?.name}"`);
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
    onError: (e) => toast.error(e.message),
  });

  const selectedChamp = championships.find(c => c.slug === championship) || championships[0];
  const currentSlug = championship || selectedChamp?.slug;

  const champClubs = clubs.filter(c => {
    const arr = c.championships && c.championships.length > 0 ? c.championships : (c.championship ? [c.championship] : []);
    return arr.includes(currentSlug);
  });

  if (clubsLoading || champsLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-slate-500 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Onglets section */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveSection('format')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${activeSection === 'format' ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}
        >
          <Trophy className="w-4 h-4" /> Format du championnat
        </button>
        <button
          onClick={() => setActiveSection('promotion')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${activeSection === 'promotion' ? 'bg-amber-500/20 border-amber-500/60 text-amber-400' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}
        >
          <ArrowUpDown className="w-4 h-4" /> Montée / Descente / LDC
        </button>
      </div>

      {/* Section Promotion/Relégation/LDC */}
      {activeSection === 'promotion' && championships.length >= 2 && (
        <PromotionRelegationConfig championships={championships} clubs={clubs || []} />
      )}
      {activeSection === 'promotion' && championships.length < 2 && (
        <div className="text-slate-500 text-sm p-4 bg-slate-800/40 rounded-xl">
          Il faut au moins 2 championnats pour configurer les montées/descentes.
        </div>
      )}

      {/* Section format — masquée si on est sur promotion */}
      {activeSection === 'format' && (
      <>
      {/* Sélection championnat */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-3">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" /> Championnat
        </h3>
        <div className="flex gap-2 flex-wrap">
          {championships.map(c => (
            <button
              key={c.slug}
              onClick={() => setChampionship(c.slug)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${currentSlug === c.slug ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400' : 'border-slate-600 text-slate-400 hover:border-slate-500'}`}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {champClubs.length === 0
            ? <p className="text-slate-500 text-sm">Aucun club dans ce championnat</p>
            : champClubs.map(c => <Badge key={c.id} variant="outline" className="border-slate-600 text-slate-300">{c.name}</Badge>)
          }
        </div>
        <p className="text-slate-500 text-xs">{champClubs.length} clubs</p>
        {champClubs.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
            onClick={() => patchMutation.mutate()}
            disabled={patchMutation.isPending}
          >
            {patchMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
            Corriger le nom sur les matchs existants
          </Button>
        )}
      </div>

      {/* Format manager */}
      {champClubs.length >= 2 && (
        <LeagueFormatManager
          teams={champClubs}
          mode="club"
          tournamentName={selectedChamp?.name || ''}
          queryKeyToInvalidate={[['matches']]}
        />
      )}
      {champClubs.length < 2 && currentSlug && (
        <p className="text-slate-500 text-sm">Ajoutez au moins 2 clubs dans ce championnat pour configurer le format.</p>
      )}
      </>
      )}
    </div>
  );
}