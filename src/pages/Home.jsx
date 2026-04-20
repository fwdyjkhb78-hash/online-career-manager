import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { 
  Trophy, Users, ArrowRightLeft, 
  ChevronRight, Zap, Shield, Check, Loader2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LeagueTable from '@/components/LeagueTable';
import ClubSelector from '@/components/ClubSelector';
import CommunityChat from '@/components/community/CommunityChat';

const STAFF_ROLES = ['owner', 'admin', 'staff_mercato', 'staff_championnat', 'staff_developpement', 'staff_formation', 'staff_annonce'];

export default function Home() {
  const [user, setUser] = useState(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('accueil');
  const [selectedClub, setSelectedClub] = useState(null);
  const [selectError, setSelectError] = useState(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();

        // Vérifier que le club_id enregistré existe vraiment
        if (userData?.club_id) {
          try {
            const allClubs = await base44.entities.Club.list();
            const clubExists = allClubs.some(c => c.id === userData.club_id);
            if (!clubExists) {
              await base44.auth.updateMe({ club_id: null, club_name: null, has_selected_club: false });
              const freshUser = await base44.auth.me();
              setUser(freshUser);
              setActiveTab('choisir');
              setUserLoaded(true);
              return;
            }
          } catch (e) {
            // Ignore l'erreur de vérification, on continue normalement
          }
        }

        setUser(userData);
        if (userData && !userData.has_selected_club && !STAFF_ROLES.includes(userData.role)) {
          setActiveTab('choisir');
        }
      } catch (e) {
        base44.auth.redirectToLogin(createPageUrl('Home'));
        return;
      } finally {
        setUserLoaded(true);
      }
    };
    loadUser();
  }, []);

  const { data: clubs = [], isLoading: clubsLoading } = useQuery({
    queryKey: ['clubs'],
    queryFn: async () => {
      try {
        return await base44.entities.Club.list();
      } catch (e) {
        console.error('Error loading clubs:', e);
        return [];
      }
    },
    staleTime: 45000,
    gcTime: 300000,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  const { data: recentTransfers = [] } = useQuery({
    queryKey: ['recent-transfers'],
    queryFn: async () => {
      try {
        return await base44.entities.Transfer.filter({ status: 'completed' }, '-created_date', 5);
      } catch (e) {
        return [];
      }
    },
    staleTime: 30000,
    gcTime: 180000,
    refetchInterval: 45000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  // Ne calculer les clubs pris qu'une fois le user chargé
  const takenClubIds = (userLoaded && user)
    ? clubs.filter(c => c.manager_id && c.manager_id !== user.id).map(c => c.id)
    : [];

  const selectMutation = useMutation({
    mutationFn: async (club) => {
      await base44.entities.Club.update(club.id, {
        manager_id: user.id,
        manager_name: user.full_name
      });
      await base44.auth.updateMe({
        club_id: club.id,
        club_name: club.name,
        has_selected_club: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
      navigate(createPageUrl('Dashboard'));
    },
    onError: () => {
      setSelectError("Erreur lors de la sélection. Réessayez.");
    }
  });

  const stats = [
    { icon: Shield, label: "Clubs en compétition", value: clubs.length, color: "from-blue-500 to-blue-600" },
    { icon: Users, label: "Managers actifs", value: clubs.filter(c => c.manager_id).length, color: "from-emerald-500 to-emerald-600" },
    { icon: ArrowRightLeft, label: "Transferts récents", value: recentTransfers.length, color: "from-purple-500 to-purple-600" },
  ];

  // Ne bloquer l'affichage que si le user n'est pas encore chargé
  if (!userLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1920')] bg-cover bg-center opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/80 to-slate-950" />
        <div className="relative max-w-7xl mx-auto px-4 py-16 sm:py-24 text-center">
          <div className="flex justify-center mb-6">
            <img src="https://media.base44.com/images/public/69790b43349a3dc5b9facd93/23515486b_IMG_3759.jpeg" alt="OCM Logo" className="w-24 h-24 rounded-2xl object-cover" />
          </div>
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-4 py-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 text-sm font-medium">Saison 2025/2026</span>
            </div>
          </div>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white mb-4 sm:mb-6 tracking-tight">
            Online <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Career Manager</span>
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-slate-400 max-w-2xl mx-auto mb-8 sm:mb-10 px-2">
            Le mode carrière manager ultime. Gérez votre club, faites des transferts et dominez la compétition.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
            {user?.has_selected_club ? (
              <>
                <Link to={createPageUrl('Dashboard')} className="w-full sm:w-auto">
                  <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg rounded-xl w-full sm:w-auto">
                    <Shield className="w-4 sm:w-5 h-4 sm:h-5 mr-2" />Mon Espace Club
                  </Button>
                </Link>
                <Link to={createPageUrl('TransferMarket')} className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="border-slate-600 text-white hover:bg-slate-800 px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg rounded-xl w-full sm:w-auto">
                    <ArrowRightLeft className="w-4 sm:w-5 h-4 sm:h-5 mr-2" />Mercato
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Button
                  size="lg"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg rounded-xl w-full sm:w-auto"
                  onClick={() => setActiveTab('choisir')}
                >
                  <Shield className="w-4 sm:w-5 h-4 sm:h-5 mr-2" />Choisir Mon Club
                </Button>
                <Link to={createPageUrl('TransferMarket')} className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="border-slate-600 text-white hover:bg-slate-800 px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg rounded-xl w-full sm:w-auto">
                    <ArrowRightLeft className="w-4 sm:w-5 h-4 sm:h-5 mr-2" />Mercato
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Discord Banner */}
          <div className="mt-6 flex justify-center px-4">
            <a
              href="https://discord.gg/TTUvKRthff"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-[#5865F2]/20 hover:bg-[#5865F2]/30 border border-[#5865F2]/50 rounded-2xl px-6 py-3 transition-all group"
            >
              <svg className="w-6 h-6 text-[#5865F2]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.003.024.015.046.03.06a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              <div className="text-left">
                <p className="text-white font-bold text-sm">Rejoindre le Discord OCM</p>
                <p className="text-[#5865F2] text-xs">discord.gg/TTUvKRthff</p>
              </div>
              <svg className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mt-10 sm:mt-14 max-w-2xl mx-auto px-4">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className={`w-10 sm:w-12 h-10 sm:h-12 mx-auto rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-2`}>
                  <stat.icon className="w-5 sm:w-6 h-5 sm:h-6 text-white" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</p>
                <p className="text-slate-500 text-xs sm:text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-800/50 border border-slate-700/50 p-1">
            <TabsTrigger value="accueil" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              <Trophy className="w-4 h-4 mr-1.5" />Classement
            </TabsTrigger>
            {!user?.has_selected_club && !STAFF_ROLES.includes(user?.role) && (
              <TabsTrigger value="choisir" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                <Shield className="w-4 h-4 mr-1.5" />Choisir un club
              </TabsTrigger>
            )}
          </TabsList>

          {/* Classement */}
          <TabsContent value="accueil">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-8">
                <LeagueTable clubs={clubs} currentClubId={user?.club_id} />

                {recentTransfers.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-bold text-white">Derniers Transferts officialisés</h2>
                        <p className="text-slate-500 text-sm">Les 5 derniers transferts complétés dans la ligue</p>
                      </div>
                      <Link to={createPageUrl('TransferMarket')}>
                        <Button variant="ghost" className="text-emerald-400 hover:text-emerald-300">
                          Voir le mercato <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                    </div>
                    <div className="space-y-3">
                      {recentTransfers.map((t, i) => (
                        <motion.div
                          key={t.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50"
                        >
                          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                            <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shrink-0">
                              <ArrowRightLeft className="w-4 sm:w-5 h-4 sm:h-5 text-white" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-white font-semibold text-sm sm:text-base truncate">{t.player_name}</p>
                              <p className="text-slate-400 text-xs sm:text-sm truncate">
                                <span className="text-red-400">{t.from_club_name || "Libre"}</span>
                                <span className="text-slate-500"> → </span>
                                <span className="text-emerald-400">{t.to_club_name}</span>
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-emerald-400 font-bold text-sm sm:text-base whitespace-nowrap">{(t.amount / 1e6).toFixed(1)}M€</span>
                            <p className="text-slate-500 text-xs">Transfert officiel ✓</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="lg:col-span-1">
                <CommunityChat currentUser={user} />
              </div>
            </div>
          </TabsContent>

          {/* Choisir un club */}
          <TabsContent value="choisir">
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">Choisissez votre club</h2>
                <p className="text-slate-400">Sélectionnez le club que vous souhaitez manager cette saison.</p>
                {selectError && <p className="text-red-400 text-sm mt-2">{selectError}</p>}
              </div>

              <ClubSelector
                clubs={clubs}
                selectedId={selectedClub?.id}
                onSelect={(club) => { setSelectedClub(club); setSelectError(null); }}
                takenClubIds={takenClubIds}
              />

              {selectedClub && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900/95 backdrop-blur-lg border-t border-slate-700 z-50">
                  <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 px-4">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      {selectedClub.logo_url ? (
                        <img src={selectedClub.logo_url} alt="" className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl bg-slate-700 flex items-center justify-center shrink-0">
                          <span className="text-white font-bold text-xs sm:text-sm">{selectedClub.name?.substring(0, 2).toUpperCase()}</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-white font-bold text-sm sm:text-base truncate">{selectedClub.name}</p>
                        <p className="text-slate-400 text-xs sm:text-sm">Budget : {((selectedClub.budget || 0) / 1e6).toFixed(0)}M€</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => selectMutation.mutate(selectedClub)}
                      disabled={selectMutation.isPending}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 sm:px-8 py-2 sm:py-3 w-full sm:w-auto text-sm sm:text-base"
                    >
                      {selectMutation.isPending ? (
                        <Loader2 className="w-3 sm:w-4 h-3 sm:h-4 animate-spin mr-2" />
                      ) : (
                        <Check className="w-3 sm:w-4 h-3 sm:h-4 mr-2" />
                      )}
                      Confirmer
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}