import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Plus, Trash2, Loader2, Search, ArrowRightCircle } from 'lucide-react';
import { toast } from 'sonner';
import { fetchAll } from '@/utils/fetchAll';

const ALL_CLUBS = [
  "Paris Saint-Germain","Olympique de Marseille","Olympique Lyonnais","AS Monaco","LOSC Lille","Stade Rennais FC","RC Lens","OGC Nice","RC Strasbourg Alsace","Toulouse FC","Stade Brestois 29","FC Nantes","Le Havre AC","Angers SCO","AJ Auxerre","FC Lorient","Paris FC","FC Metz",
  "FC Barcelone","Real Madrid","Atlético de Madrid","Villarreal CF","Real Betis","Celta Vigo","Real Sociedad","Getafe CF","Athletic Bilbao","CA Osasuna","Rayo Vallecano","RCD Majorque","Valence CF","Séville FC","Espanyol Barcelone","Deportivo Alavés","Girona FC","Elche CF","Levante UD","Real Oviedo",
  "Arsenal FC","Aston Villa","AFC Bournemouth","Brentford FC","Brighton & Hove Albion","Burnley FC","Chelsea FC","Crystal Palace","Everton FC","Fulham FC","Leeds United","Liverpool FC","Manchester City","Manchester United","Newcastle United","Nottingham Forest","Sunderland AFC","Tottenham Hotspur","West Ham United","Wolverhampton Wanderers",
  "Inter Milan","AC Milan","Juventus","AS Roma","SS Lazio","SSC Napoli","Atalanta BC","Bologna FC","ACF Fiorentina","Torino FC","Genoa CFC","Udinese Calcio","Cagliari Calcio","Hellas Verona","US Lecce","Parma Calcio","Como 1907","US Sassuolo","Pisa SC","US Cremonese",
  "Bayern Munich","Borussia Dortmund","RB Leipzig","Bayer Leverkusen","Eintracht Frankfurt","VfB Stuttgart","VfL Wolfsburg","TSG Hoffenheim","Werder Bremen","SC Freiburg","Borussia Mönchengladbach","FC Augsburg","1. FSV Mainz 05","1. FC Köln","Hamburger SV","Union Berlin","FC St. Pauli","1. FC Heidenheim",
  "SL Benfica","FC Porto","Sporting CP","SC Braga","Vitória Guimarães","FC Famalicão","Rio Ave FC","Gil Vicente FC","Moreirense FC","Estoril Praia","FC Arouca","Casa Pia AC","Estrela Amadora","CD Santa Clara","CD Nacional","FC Alverca","AVS Futebol","CD Tondela",
];

export default function SansLigueManagerTab() {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [integrateClub, setIntegrateClub] = useState(null); // club hors-ligue à intégrer
  const [selectedChampionship, setSelectedChampionship] = useState('');

  const { data: sansLigueClubs = [], isLoading } = useQuery({
    queryKey: ['sans-ligue-clubs'],
    queryFn: () => base44.entities.SansLigueClub.list(),
  });

  const { data: championships = [] } = useQuery({
    queryKey: ['championships'],
    queryFn: () => base44.entities.Championship.list('order'),
  });

  const existingNames = new Set(sansLigueClubs.map(c => c.name.toLowerCase()));

  const addMutation = useMutation({
    mutationFn: (name) => base44.entities.SansLigueClub.create({ name, is_active: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sans-ligue-clubs'] });
      toast.success('Club ajouté !');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SansLigueClub.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sans-ligue-clubs'] });
      toast.success('Club supprimé');
      setDeleteConfirm(null);
    },
  });

  // Intégrer en ligue : crée un Club, migre les joueurs, supprime le SansLigueClub
  const integrateMutation = useMutation({
    mutationFn: async ({ club, championship }) => {
      // 1. Créer le Club officiel
      const newClub = await base44.entities.Club.create({
        name: club.name,
        logo_url: club.logo_url || '',
        budget: 100000000,
        championship: championship.slug,
        championships: [championship.slug],
      });

      // 2. Migrer tous les joueurs de ce club hors-ligue
      const allPlayers = await fetchAll('Player');
      const clubPlayers = allPlayers.filter(
        p => p.club_name === club.name || p.club_id === club.id
      );
      await Promise.all(
        clubPlayers.map(p =>
          base44.entities.Player.update(p.id, {
            club_id: newClub.id,
            club_name: newClub.name,
          })
        )
      );

      // 3. Supprimer le SansLigueClub
      await base44.entities.SansLigueClub.delete(club.id);

      return { newClub, migratedCount: clubPlayers.length };
    },
    onSuccess: ({ newClub, migratedCount }) => {
      queryClient.invalidateQueries({ queryKey: ['sans-ligue-clubs'] });
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
      toast.success(`${newClub.name} intégré en ligue ! ${migratedCount} joueur(s) migré(s).`);
      setIntegrateClub(null);
      setSelectedChampionship('');
    },
    onError: () => toast.error("Erreur lors de l'intégration"),
  });

  const handleIntegrate = () => {
    const champ = championships.find(c => c.id === selectedChampionship);
    if (!champ) return toast.error('Sélectionne un championnat');
    integrateMutation.mutate({ club: integrateClub, championship: champ });
  };

  const filteredAll = ALL_CLUBS.filter(name =>
    !existingNames.has(name.toLowerCase()) &&
    name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-orange-400" />
            Clubs Sans Ligue
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Ces clubs ne sont pas sélectionnables. Les managers peuvent faire des offres pour acheter leurs joueurs au prix de base.
          </p>
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => { setSearch(''); setAddOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Ajouter des clubs
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : sansLigueClubs.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="py-10 text-center">
            <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Aucun club sans ligue configuré</p>
            <p className="text-slate-500 text-sm mt-1">Cliquez sur "Ajouter des clubs" pour commencer.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-sm flex items-center gap-2">
              {sansLigueClubs.length} clubs hors-ligue
              <Badge className="bg-orange-500/20 text-orange-300 text-xs">Offres uniquement</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {sansLigueClubs.map(club => (
                <div key={club.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="w-4 h-4 text-orange-400 shrink-0" />
                    <span className="text-white text-sm truncate">{club.name}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm" variant="ghost"
                      className="text-emerald-400 hover:bg-emerald-500/10 h-7 px-2 text-xs"
                      title="Intégrer dans une ligue"
                      onClick={() => { setIntegrateClub(club); setSelectedChampionship(''); }}
                    >
                      <ArrowRightCircle className="w-3.5 h-3.5 mr-1" /> Ligue
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/10 h-7 w-7 p-0"
                      onClick={() => setDeleteConfirm(club)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog ajouter depuis la liste */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-orange-400" />
              Ajouter des clubs hors-ligue
            </DialogTitle>
          </DialogHeader>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..." className="bg-slate-800 border-slate-700 text-white pl-10" />
          </div>
          <div className="overflow-y-auto flex-1 space-y-1 pr-1">
            {filteredAll.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-4">Tous les clubs de la liste sont déjà ajoutés.</p>
            )}
            {filteredAll.map(name => (
              <button key={name} onClick={() => addMutation.mutate(name)}
                disabled={addMutation.isPending}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-slate-700 hover:border-orange-500/50 hover:bg-orange-500/5 text-sm text-slate-300 transition-colors">
                <span>{name}</span>
                <Plus className="w-4 h-4 text-orange-400 shrink-0" />
              </button>
            ))}
          </div>
          <Button variant="outline" className="border-slate-600 mt-3" onClick={() => setAddOpen(false)}>Fermer</Button>
        </DialogContent>
      </Dialog>

      {/* Dialog intégrer en ligue */}
      <Dialog open={!!integrateClub} onOpenChange={() => setIntegrateClub(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-400">
              <ArrowRightCircle className="w-5 h-5" />
              Intégrer dans une ligue
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-slate-300 text-sm">
              <span className="font-semibold text-white">{integrateClub?.name}</span> va être converti en club officiel. Ses joueurs seront automatiquement migrés.
            </p>
            <div>
              <label className="text-slate-400 text-xs mb-1.5 block">Championnat cible</label>
              <Select value={selectedChampionship} onValueChange={setSelectedChampionship}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue placeholder="Choisir un championnat..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  {championships.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1 border-slate-600" onClick={() => setIntegrateClub(null)}>Annuler</Button>
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              onClick={handleIntegrate}
              disabled={!selectedChampionship || integrateMutation.isPending}
            >
              {integrateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Intégrer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog supprimer */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400">Supprimer {deleteConfirm?.name} ?</DialogTitle>
          </DialogHeader>
          <p className="text-slate-400 text-sm">Ce club ne sera plus disponible pour les offres hors-ligue.</p>
          <div className="flex gap-3 mt-3">
            <Button variant="outline" className="flex-1 border-slate-600" onClick={() => setDeleteConfirm(null)}>Annuler</Button>
            <Button className="flex-1 bg-red-500 hover:bg-red-600"
              onClick={() => deleteMutation.mutate(deleteConfirm.id)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Supprimer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}