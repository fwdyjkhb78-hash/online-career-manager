import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import {
  Shield, Euro, Users, Trophy, ArrowRightLeft,
  Star, Bell, ChevronRight, Loader2, BarChart2,
  Sparkles, Send, TrendingUp, Crown
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MoneyTransferModal from '@/components/dashboard/MoneyTransferModal';
import DevelopmentPlanTab from '@/components/dashboard/DevelopmentPlanTab';
import AcademyTab from '@/components/dashboard/AcademyTab';
import NotificationCenter from '@/components/dashboard/NotificationCenter';

const STAFF_ROLES = ['owner', 'admin', 'staff_mercato', 'staff_championnat', 'staff_developpement', 'staff_formation'];

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [moneyTransferOpen, setMoneyTransferOpen] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        if (!userData.has_selected_club && !STAFF_ROLES.includes(userData.role)) {
          navigate(createPageUrl('SelectClub'));
        }
      } catch (e) {
        base44.auth.redirectToLogin(createPageUrl('Dashboard'));
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [navigate]);

  const { data: club, refetch: refetchClub, isLoading: clubLoading, isError: clubError } = useQuery({
    queryKey: ['my-club', user?.club_id],
    queryFn: async () => {
      try {
        const data = await base44.entities.Club.filter({ id: user.club_id });
        return data?.[0] || null;
      } catch (e) {
        console.error('Error loading my club:', e);
        return null;
      }
    },
    enabled: !!user?.club_id,
    staleTime: 120000,
    gcTime: 300000,
    retry: 1,
    refetchInterval: false,
  });

  const { data: players = [] } = useQuery({
    queryKey: ['my-players', user?.club_id],
    queryFn: async () => {
      try {
        return await base44.entities.Player.filter({ club_id: user.club_id });
      } catch (e) {
        console.error('Error loading players:', e);
        return [];
      }
    },
    enabled: !!user?.club_id,
    staleTime: 120000,
    gcTime: 300000,
    retry: 1,
    refetchInterval: false,
  });

  const { data: pendingOffers = [] } = useQuery({
    queryKey: ['pending-offers', user?.club_id],
    queryFn: async () => {
      try {
        return await base44.entities.Transfer.filter({ from_club_id: user.club_id, status: 'pending' });
      } catch (e) {
        console.error('Error loading pending offers:', e);
        return [];
      }
    },
    enabled: !!user?.club_id,
    staleTime: 120000,
    gcTime: 300000,
    retry: 1,
    refetchInterval: false,
  });

  const { data: allClubs = [] } = useQuery({
    queryKey: ['clubs'],
    queryFn: async () => {
      try {
        return await base44.entities.Club.list();
      } catch (e) {
        console.error('Error loading clubs:', e);
        return [];
      }
    },
    staleTime: 120000,
    gcTime: 300000,
    refetchInterval: false,
    retry: 1,
  });

  const { data: arrivals = [] } = useQuery({
    queryKey: ['arrivals', user?.club_id],
    queryFn: async () => {
      try {
        return await base44.entities.Transfer.filter({ to_club_id: user.club_id, status: 'completed' }, '-created_date', 20);
      } catch (e) {
        console.error('Error loading arrivals:', e);
        return [];
      }
    },
    enabled: !!user?.club_id,
    staleTime: 120000,
    gcTime: 300000,
    retry: 1,
    refetchInterval: false,
  });

  const { data: departures = [] } = useQuery({
    queryKey: ['departures', user?.club_id],
    queryFn: async () => {
      try {
        return await base44.entities.Transfer.filter({ from_club_id: user.club_id, status: 'completed' }, '-created_date', 20);
      } catch (e) {
        console.error('Error loading departures:', e);
        return [];
      }
    },
    enabled: !!user?.club_id,
    staleTime: 120000,
    gcTime: 300000,
    retry: 1,
    refetchInterval: false,
  });

  const { data: loans = [] } = useQuery({
    queryKey: ['loans', user?.club_id],
    queryFn: async () => {
      try {
        return await base44.entities.Player.filter({ loan_club_id: user.club_id });
      } catch (e) {
        console.error('Error loading loans:', e);
        return [];
      }
    },
    enabled: !!user?.club_id,
    staleTime: 120000,
    gcTime: 300000,
    retry: 1,
    refetchInterval: false,
  });

  const { data: moneyTransfers = [] } = useQuery({
    queryKey: ['money-transfers', user?.club_id],
    queryFn: async () => {
      try {
        const sent = await base44.entities.MoneyTransfer.filter({ from_club_id: user.club_id }, '-created_date', 20);
        const received = await base44.entities.MoneyTransfer.filter({ to_club_id: user.club_id }, '-created_date', 20);
        return { sent, received };
      } catch (e) {
        console.error('Error loading money transfers:', e);
        return { sent: [], received: [] };
      }
    },
    enabled: !!user?.club_id,
    staleTime: 120000,
    gcTime: 300000,
    retry: 1,
    refetchInterval: false,
  });

  if (loading || (clubLoading && !club)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (clubError) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-center px-4">
        <Shield className="w-16 h-16 text-red-600" />
        <h2 className="text-2xl font-bold text-white">Erreur de chargement</h2>
        <p className="text-slate-400">Impossible de charger votre club. Veuillez rafraîchir la page.</p>
        <Button onClick={() => window.location.reload()} className="bg-emerald-500 hover:bg-emerald-600">Rafraîchir</Button>
      </div>
    );
  }

  if (!club) return null;

  const sortedClubs = [...allClubs].sort((a, b) => {
    const ptsA = b.points - a.points;
    if (ptsA !== 0) return ptsA;
    return (b.goals_for - b.goals_against) - (a.goals_for - a.goals_against);
  });
  const rank = sortedClubs.findIndex(c => c.id === club.id) + 1;
  const totalClubs = allClubs.length;
  const goalDiff = (club.goals_for || 0) - (club.goals_against || 0);
  const avgOverall = players.length > 0
    ? Math.round(players.reduce((sum, p) => sum + (p.overall || 0), 0) / players.length) : 0;

  const isStaff = STAFF_ROLES.includes(user?.role);
  const isOwner = user?.role === 'owner' || user?.role === 'admin';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10" />
        <div className="relative max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {club.logo_url ? (
                <img src={club.logo_url} alt={club.name} className="w-16 h-16 rounded-2xl shadow-lg" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                  <Shield className="w-8 h-8 text-white" />
                </div>
              )}
              <div>
                <p className="text-slate-400 text-sm mb-1">Espace Privé</p>
                <h1 className="text-2xl font-bold text-white">{club.name}</h1>
                <p className="text-slate-400 text-sm">Manager: {user?.full_name}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setMoneyTransferOpen(true)} variant="outline" className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10">
                <Send className="w-4 h-4 mr-2" />
                Transfert Financier
              </Button>
              <Link to={createPageUrl('MyClub')}>
                <Button variant="outline" className="border-slate-600 text-white hover:bg-slate-800">
                  <Shield className="w-4 h-4 mr-2" />
                  Effectif
                </Button>
              </Link>
              {isOwner && (
                <Link to={createPageUrl('StaffRoom')}>
                  <Button variant="outline" className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10">
                    <Crown className="w-4 h-4 mr-2" />
                    Salon Staff
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Budget", value: `${((club.budget || 0) / 1e6).toFixed(0)}M€`, icon: Euro, color: "from-emerald-500 to-emerald-600", sub: "Disponible" },
            { label: "Classement", value: `${rank}/${totalClubs}`, icon: Trophy, color: "from-amber-500 to-amber-600", sub: `${club.points || 0} pts` },
            { label: "Effectif", value: players.length, icon: Users, color: "from-blue-500 to-blue-600", sub: `Moy. ${avgOverall}` },
            { label: "Offres en attente", value: pendingOffers.length, icon: Bell, color: pendingOffers.length > 0 ? "from-red-500 to-red-600" : "from-slate-500 to-slate-600", sub: "À traiter" },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-slate-300 text-sm font-medium">{stat.label}</p>
              <p className="text-slate-500 text-xs mt-1">{stat.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="overview" className="space-y-6 pb-10">
          <TabsList className="bg-slate-800/50 border border-slate-700/50 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              <BarChart2 className="w-4 h-4 mr-1" />Aperçu
            </TabsTrigger>
            <TabsTrigger value="squad" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-1" />Effectif
            </TabsTrigger>
            <TabsTrigger value="transfers" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <ArrowRightLeft className="w-4 h-4 mr-1" />Arrivées/Départs
            </TabsTrigger>
            <TabsTrigger value="finances" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <Euro className="w-4 h-4 mr-1" />Finances
            </TabsTrigger>
            <TabsTrigger value="development" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white">
              <TrendingUp className="w-4 h-4 mr-1" />Développement
            </TabsTrigger>
            <TabsTrigger value="academy" className="data-[state=active]:bg-pink-500 data-[state=active]:text-white">
              <Sparkles className="w-4 h-4 mr-1" />Centre de Formation
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-red-500 data-[state=active]:text-white relative">
              <Bell className="w-4 h-4 mr-1" />Notifications
              {pendingOffers.length > 0 && (
                <span className="ml-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {pendingOffers.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-5">
                  <BarChart2 className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-lg font-bold text-white">Performances</h2>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-5">
                  <div className="text-center p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <p className="text-3xl font-bold text-emerald-400">{club.wins || 0}</p>
                    <p className="text-slate-400 text-sm mt-1">Victoires</p>
                  </div>
                  <div className="text-center p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <p className="text-3xl font-bold text-amber-400">{club.draws || 0}</p>
                    <p className="text-slate-400 text-sm mt-1">Nuls</p>
                  </div>
                  <div className="text-center p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-3xl font-bold text-red-400">{club.losses || 0}</p>
                    <p className="text-slate-400 text-sm mt-1">Défaites</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Buts marqués", value: club.goals_for || 0, color: "text-white" },
                    { label: "Buts encaissés", value: club.goals_against || 0, color: "text-white" },
                    { label: "Différence", value: (goalDiff >= 0 ? '+' : '') + goalDiff, color: goalDiff >= 0 ? 'text-emerald-400' : 'text-red-400' }
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl">
                      <span className="text-slate-400 text-sm">{row.label}</span>
                      <span className={`font-bold ${row.color}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-400" />
                    <h2 className="text-lg font-bold text-white">Top 5 Joueurs</h2>
                  </div>
                  <Link to={createPageUrl('MyClub')}>
                    <Button variant="ghost" size="sm" className="text-emerald-400">Voir tout <ChevronRight className="w-4 h-4 ml-1" /></Button>
                  </Link>
                </div>
                <div className="space-y-3">
                  {[...players].sort((a, b) => b.overall - a.overall).slice(0, 5).map((player, i) => (
                    <div key={player.id} className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-xl">
                      <span className="text-slate-500 text-sm w-5 font-bold">{i + 1}</span>
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">{player.overall}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{player.name}</p>
                        <p className="text-slate-400 text-xs">{player.position}</p>
                      </div>
                    </div>
                  ))}
                  {players.length === 0 && <p className="text-slate-500 text-center py-6">Aucun joueur</p>}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* SQUAD */}
          <TabsContent value="squad">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white">Effectif complet ({players.length} joueurs)</h2>
                <Link to={createPageUrl('MyClub')}>
                  <Button size="sm" className="bg-blue-500 hover:bg-blue-600">Gérer l'effectif</Button>
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'].map(pos => {
                  const posPlayers = players.filter(p => p.position === pos);
                  if (posPlayers.length === 0) return null;
                  return (
                    <div key={pos} className="bg-slate-700/30 rounded-xl p-4">
                      <p className="text-slate-400 text-sm font-medium mb-3">{pos} ({posPlayers.length})</p>
                      <div className="space-y-2">
                        {posPlayers.map(p => (
                          <div key={p.id} className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                              <span className="text-white font-bold text-xs">{p.overall}</span>
                            </div>
                            <p className="text-white text-sm flex-1 truncate">{p.name}</p>
                            {p.is_on_transfer_list && <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">Vente</Badge>}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* ARRIVALS / DEPARTURES */}
          <TabsContent value="transfers">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />Arrivées cette saison
                </h3>
                <div className="space-y-3">
                  {arrivals.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl">
                      <div>
                        <p className="text-white font-medium text-sm">{t.player_name}</p>
                        <p className="text-slate-400 text-xs">de {t.from_club_name || 'Agent libre'}</p>
                      </div>
                      <span className="text-emerald-400 font-bold text-sm">{(t.amount / 1e6).toFixed(1)}M€</span>
                    </div>
                  ))}
                  {arrivals.length === 0 && <p className="text-slate-500 text-center py-6">Aucune arrivée</p>}
                </div>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500" />Départs cette saison
                </h3>
                <div className="space-y-3">
                  {departures.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl">
                      <div>
                        <p className="text-white font-medium text-sm">{t.player_name}</p>
                        <p className="text-slate-400 text-xs">vers {t.to_club_name}</p>
                      </div>
                      <span className="text-emerald-400 font-bold text-sm">+{(t.amount / 1e6).toFixed(1)}M€</span>
                    </div>
                  ))}
                  {departures.length === 0 && <p className="text-slate-500 text-center py-6">Aucun départ</p>}
                </div>
              </div>
            </div>
            {/* Prêts */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mt-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500" />Joueurs en prêt
              </h3>
              {loans.length === 0 ? (
                <p className="text-slate-500 text-center py-6">Aucun joueur en prêt</p>
              ) : (
                <div className="space-y-3">
                  {loans.map(p => (
                    <div key={p.id} className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-xl">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">{p.overall}</span>
                      </div>
                      <div className="flex-1"><p className="text-white font-medium">{p.name}</p><p className="text-slate-400 text-xs">{p.position}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* FINANCES */}
          <TabsContent value="finances">
            <div className="space-y-6">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <p className="text-slate-300 text-sm mb-1">Budget disponible</p>
                  <p className="text-4xl font-black text-white">{((club.budget || 0) / 1e6).toFixed(1)}M€</p>
                </div>
                <Button onClick={() => setMoneyTransferOpen(true)} className="bg-emerald-500 hover:bg-emerald-600">
                  <Send className="w-4 h-4 mr-2" />Transférer des fonds
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                  <h3 className="text-white font-bold mb-4">Fonds Envoyés</h3>
                  <div className="space-y-3">
                    {(moneyTransfers?.sent || []).map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl">
                        <div><p className="text-white text-sm font-medium">→ {t.to_club_name}</p>{t.reason && <p className="text-slate-500 text-xs">{t.reason}</p>}</div>
                        <span className="text-red-400 font-bold text-sm">-{(t.amount / 1e6).toFixed(1)}M€</span>
                      </div>
                    ))}
                    {(moneyTransfers?.sent || []).length === 0 && <p className="text-slate-500 text-center py-4">Aucun envoi</p>}
                  </div>
                </div>
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                  <h3 className="text-white font-bold mb-4">Fonds Reçus</h3>
                  <div className="space-y-3">
                    {(moneyTransfers?.received || []).map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl">
                        <div><p className="text-white text-sm font-medium">← {t.from_club_name}</p>{t.reason && <p className="text-slate-500 text-xs">{t.reason}</p>}</div>
                        <span className="text-emerald-400 font-bold text-sm">+{(t.amount / 1e6).toFixed(1)}M€</span>
                      </div>
                    ))}
                    {(moneyTransfers?.received || []).length === 0 && <p className="text-slate-500 text-center py-4">Aucune réception</p>}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* DEVELOPMENT */}
          <TabsContent value="development">
            <DevelopmentPlanTab club={club} onBudgetUpdate={() => refetchClub()} />
          </TabsContent>

          {/* ACADEMY */}
          <TabsContent value="academy">
            <AcademyTab club={club} />
          </TabsContent>

          {/* NOTIFICATIONS */}
          <TabsContent value="notifications">
            <NotificationCenter userId={user?.id} />
          </TabsContent>
        </Tabs>
      </div>

      <MoneyTransferModal
        open={moneyTransferOpen}
        onClose={() => setMoneyTransferOpen(false)}
        club={club}
        onSuccess={() => refetchClub()}
      />
    </div>
  );
}