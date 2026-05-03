import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Loader2, Globe, Users, Eye, EyeOff, BarChart2, Star,
  ArrowRightLeft, Euro, Bell, MessageSquare, TrendingUp, TrendingDown,
  UserCircle, Sparkles, Swords, Send
} from 'lucide-react';
import { fetchAll } from '@/utils/fetchAll';
import SquadTable from '@/components/clubspace/SquadTable';
import ClubChat from '@/components/clubspace/ClubChat';
import InboxPanel from '@/components/clubspace/InboxPanel';
import ProfileTab from '@/components/clubspace/ProfileTab';
import EvolutionTab from '@/components/clubspace/EvolutionTab';
import AcademyTab from '@/components/dashboard/AcademyTab';
import MatchTab from '@/components/clubspace/MatchTab';
import PlayerMessagesPanel from '@/components/clubspace/PlayerMessagesPanel';
import MakeOfferModal from '@/components/clubspace/MakeOfferModal';

export default function HorsLigueStaffView({ sansLigueClub, headerExtra, isOwner, user }) {
  const queryClient = useQueryClient();
  const [makeOfferOpen, setMakeOfferOpen] = useState(false);

  const { data: players = [], isLoading: playersLoading } = useQuery({
    queryKey: ['hors-ligue-players', sansLigueClub?.name],
    queryFn: async () => {
      const all = await fetchAll('Player');
      return all.filter(p => p.club_name === sansLigueClub?.name || p.club_id === sansLigueClub?.id);
    },
    enabled: !!sansLigueClub,
  });

  const { data: allClubs = [] } = useQuery({
    queryKey: ['all-clubs'],
    queryFn: () => base44.entities.Club.list(),
    staleTime: 30000,
  });

  const { data: arrivals = [] } = useQuery({
    queryKey: ['hl-arrivals', sansLigueClub?.id],
    queryFn: async () => {
      const all = await fetchAll('Transfer');
      return all.filter(t => t.to_club_id === sansLigueClub?.id && t.status === 'completed');
    },
    enabled: !!sansLigueClub?.id,
  });

  const { data: departures = [] } = useQuery({
    queryKey: ['hl-departures', sansLigueClub?.id],
    queryFn: async () => {
      const all = await fetchAll('Transfer');
      return all.filter(t => t.from_club_id === sansLigueClub?.id && t.status === 'completed');
    },
    enabled: !!sansLigueClub?.id,
  });

  const updateClub = useMutation({
    mutationFn: (data) => base44.entities.SansLigueClub.update(sansLigueClub.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sans-ligue-clubs-staff'] });
      queryClient.invalidateQueries({ queryKey: ['sans-ligue-clubs'] });
    }
  });

  if (!sansLigueClub) return null;

  const avgOverall = players.length > 0
    ? Math.round(players.reduce((s, p) => s + (p.overall || 0), 0) / players.length) : 0;

  // Fake club object pour les composants qui attendent un Club
  const fakeClub = {
    id: sansLigueClub.id,
    name: sansLigueClub.name,
    logo_url: sansLigueClub.logo_url || '',
    budget: 0,
    points: 0, wins: 0, draws: 0, losses: 0,
    goals_for: 0, goals_against: 0,
    manager_name: '—',
    championship: 'hors-ligue',
    championships: [],
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10" />
        <div className="relative max-w-7xl mx-auto px-4 py-6">
          {headerExtra}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {sansLigueClub.logo_url ? (
                <img src={sansLigueClub.logo_url} alt={sansLigueClub.name} className="w-16 h-16 rounded-2xl object-cover shadow-lg" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                  <Globe className="w-8 h-8 text-white" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">Hors-Ligue</Badge>
                  {sansLigueClub.country && <span className="text-slate-400 text-sm">{sansLigueClub.country}</span>}
                </div>
                <h1 className="text-2xl font-bold text-white">{sansLigueClub.name}</h1>
                <p className="text-slate-400 text-sm">Club hors-ligue</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: "Statut", icon: sansLigueClub.is_active !== false ? Eye : EyeOff,
              value: sansLigueClub.is_active !== false ? 'Actif' : 'Inactif',
              color: sansLigueClub.is_active !== false ? "from-emerald-500 to-emerald-600" : "from-slate-500 to-slate-600",
              sub: "Disponible aux offres"
            },
            { label: "Effectif", value: playersLoading ? '…' : players.length, icon: Users, color: "from-blue-500 to-blue-600", sub: `Moy. ${avgOverall}` },
            { label: "En vente", value: players.filter(p => p.is_on_transfer_list).length, icon: ArrowRightLeft, color: "from-amber-500 to-amber-600", sub: "Joueurs listés" },
            { label: "Valeur totale", value: `${(players.reduce((s, p) => s + (p.value || 0), 0) / 1e6).toFixed(0)}M€`, icon: Euro, color: "from-purple-500 to-purple-600", sub: "Effectif total" },
          ].map((stat, i) => (
            <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-slate-300 text-sm font-medium">{stat.label}</p>
              <p className="text-slate-500 text-xs mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Tabs — identiques aux clubs normaux */}
        <Tabs defaultValue="overview" className="space-y-6 pb-10">
          <TabsList className="bg-slate-800/50 border border-slate-700/50 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              <BarChart2 className="w-4 h-4 mr-1.5" />Aperçu
            </TabsTrigger>
            <TabsTrigger value="squad" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-1.5" />Effectif
            </TabsTrigger>
            <TabsTrigger value="transfers" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <ArrowRightLeft className="w-4 h-4 mr-1.5" />Transferts
            </TabsTrigger>
            <TabsTrigger value="finances" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <Euro className="w-4 h-4 mr-1.5" />Finances
            </TabsTrigger>
            <TabsTrigger value="matches" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              <Swords className="w-4 h-4 mr-1.5" />Matchs
            </TabsTrigger>
            <TabsTrigger value="academy" className="data-[state=active]:bg-pink-500 data-[state=active]:text-white">
              <Sparkles className="w-4 h-4 mr-1.5" />Formation
            </TabsTrigger>
            <TabsTrigger value="evolutions" className="data-[state=active]:bg-violet-500 data-[state=active]:text-white">
              <TrendingUp className="w-4 h-4 mr-1.5" />Évolutions
            </TabsTrigger>
            <TabsTrigger value="chat" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white">
              <MessageSquare className="w-4 h-4 mr-1.5" />Chat Staff
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
              <Bell className="w-4 h-4 mr-1.5" />Notifications
            </TabsTrigger>
            <TabsTrigger value="player-messages" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <MessageSquare className="w-4 h-4 mr-1.5" />Joueurs
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-slate-500 data-[state=active]:text-white">
              <UserCircle className="w-4 h-4 mr-1.5" />Profil
            </TabsTrigger>
          </TabsList>

          {/* ── APERÇU ── */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Star className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg font-bold text-white">Top 5 Joueurs</h2>
                </div>
                <div className="space-y-3">
                  {[...players].sort((a, b) => (b.overall || 0) - (a.overall || 0)).slice(0, 5).map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-xl">
                      <span className="text-slate-500 text-sm w-5 font-bold">{i + 1}</span>
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">{p.overall}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{p.name}</p>
                        <p className="text-slate-400 text-xs">{p.position} · {p.age} ans · {p.nationality}</p>
                      </div>
                      <p className="text-blue-300 text-sm font-semibold shrink-0">{((p.value || 0) / 1e6).toFixed(1)}M€</p>
                    </div>
                  ))}
                  {players.length === 0 && !playersLoading && <p className="text-slate-500 text-center py-6">Aucun joueur</p>}
                  {playersLoading && <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-blue-400" /></div>}
                </div>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />Répartition par poste
                </h2>
                <div className="space-y-2">
                  {['GK','CB','LB','RB','CDM','CM','CAM','LW','RW','ST'].map(pos => {
                    const count = players.filter(p => p.position === pos).length;
                    if (count === 0) return null;
                    return (
                      <div key={pos} className="flex items-center justify-between p-2.5 bg-slate-700/30 rounded-xl">
                        <span className="text-slate-400 text-sm font-medium">{pos}</span>
                        <span className="text-white font-bold text-sm">{count}</span>
                      </div>
                    );
                  })}
                  {players.length === 0 && <p className="text-slate-500 text-center py-4 text-sm">Aucun joueur</p>}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── EFFECTIF ── */}
          <TabsContent value="squad">
            {playersLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-blue-400 animate-spin" /></div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Joueurs', value: players.length, color: 'text-blue-400' },
                    { label: 'Note moy.', value: avgOverall, color: 'text-emerald-400' },
                    { label: 'En vente', value: players.filter(p => p.is_on_transfer_list).length, color: 'text-amber-400' },
                    { label: 'Avec clause', value: players.filter(p => p.release_clause > 0).length, color: 'text-purple-400' },
                  ].map(s => (
                    <div key={s.label} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 text-center">
                      <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                      <p className="text-slate-400 text-sm mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
                <SquadTable
                  players={players}
                  clubId={sansLigueClub.id}
                  canEdit={isOwner}
                  canDelete={isOwner}
                  onManage={() => {}}
                  onDelete={() => {}}
                  playerMorales={{}}
                />
                {players.length === 0 && (
                  <div className="text-center py-16">
                    <Users className="w-14 h-14 mx-auto text-slate-600 mb-4" />
                    <p className="text-slate-400 text-lg">Aucun joueur dans l'effectif</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── TRANSFERTS ── */}
          <TabsContent value="transfers">
            <div className="space-y-6">
              <div className="flex justify-end">
                <Button onClick={() => setMakeOfferOpen(true)} className="bg-purple-500 hover:bg-purple-600">
                  <ArrowRightLeft className="w-4 h-4 mr-2" />Faire une offre
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />Arrivées <span className="text-slate-500 font-normal text-base">({arrivals.length})</span>
                  </h3>
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {arrivals.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl">
                        <div>
                          <p className="text-white font-medium text-sm">{t.player_name}</p>
                          <p className="text-slate-400 text-xs">de {t.from_club_name || 'Agent libre'}</p>
                        </div>
                        <span className="text-emerald-400 font-bold text-sm">{(t.amount / 1e6).toFixed(1)}M€</span>
                      </div>
                    ))}
                    {arrivals.length === 0 && <p className="text-slate-500 text-center py-6 text-sm">Aucune arrivée</p>}
                  </div>
                </div>
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-red-400" />Départs <span className="text-slate-500 font-normal text-base">({departures.length})</span>
                  </h3>
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {departures.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl">
                        <div>
                          <p className="text-white font-medium text-sm">{t.player_name}</p>
                          <p className="text-slate-400 text-xs">vers {t.to_club_name}</p>
                        </div>
                        <span className="text-emerald-400 font-bold text-sm">+{(t.amount / 1e6).toFixed(1)}M€</span>
                      </div>
                    ))}
                    {departures.length === 0 && <p className="text-slate-500 text-center py-6 text-sm">Aucun départ</p>}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── FINANCES ── */}
          <TabsContent value="finances">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6 text-center">
              <Euro className="w-12 h-12 text-blue-400 mx-auto mb-3" />
              <p className="text-white font-bold text-lg">Club hors-ligue</p>
              <p className="text-slate-400 text-sm mt-1">Les clubs hors-ligue n'ont pas de budget géré dans la ligue.</p>
            </div>
          </TabsContent>

          {/* ── MATCHS ── */}
          <TabsContent value="matches">
            <MatchTab club={fakeClub} user={user} clubs={allClubs} />
          </TabsContent>

          {/* ── FORMATION ── */}
          <TabsContent value="academy">
            <AcademyTab club={fakeClub} />
          </TabsContent>

          {/* ── ÉVOLUTIONS ── */}
          <TabsContent value="evolutions">
            <EvolutionTab club={fakeClub} user={user} />
          </TabsContent>

          {/* ── CHAT STAFF ── */}
          <TabsContent value="chat">
            <ClubChat club={fakeClub} user={user} />
          </TabsContent>

          {/* ── NOTIFICATIONS ── */}
          <TabsContent value="notifications">
            <InboxPanel userId={user?.id} />
          </TabsContent>

          {/* ── MESSAGES JOUEURS ── */}
          <TabsContent value="player-messages">
            <PlayerMessagesPanel club={fakeClub} players={players} />
          </TabsContent>

          {/* ── PROFIL ── */}
          <TabsContent value="profile">
            <ProfileTab user={user} onSaved={() => window.location.reload()} />
          </TabsContent>

          {/* ── PARAMÈTRES ── */}
          <TabsContent value="settings">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-4 max-w-xl">
              <h2 className="text-white font-bold text-lg">🛡️ Paramètres Staff</h2>
              <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl">
                <div>
                  <p className="text-white font-medium flex items-center gap-2">
                    {sansLigueClub.is_active !== false ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                    Disponible pour les offres
                  </p>
                  <p className="text-slate-400 text-xs mt-0.5">Les managers peuvent faire des offres aux joueurs de ce club</p>
                </div>
                <Switch
                  checked={sansLigueClub.is_active !== false}
                  onCheckedChange={(v) => updateClub.mutate({ is_active: v })}
                  disabled={updateClub.isPending}
                />
              </div>
              {updateClub.isPending && (
                <p className="text-slate-400 text-xs flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Mise à jour...
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <MakeOfferModal
        open={makeOfferOpen}
        onClose={() => setMakeOfferOpen(false)}
        myClub={fakeClub}
        user={user}
      />
    </div>
  );
}