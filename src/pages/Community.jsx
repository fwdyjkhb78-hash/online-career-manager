import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MessageSquare, Flame, Loader2, LogIn, Trophy, GraduationCap, TrendingUp, Wifi, Shield, Calendar } from 'lucide-react';
import { Button } from "@/components/ui/button";
import PostCard from '@/components/community/PostCard';
import CreatePost from '@/components/community/CreatePost';


import TournamentTab from '@/components/community/TournamentTab';
import CommunityChat from '@/components/community/CommunityChat';
import TrophiesTab from '@/components/community/TrophiesTab';
import OfficializationAcademyTab from '@/components/community/OfficializationAcademyTab';
import OfficializationDevelopmentTab from '@/components/community/OfficializationDevelopmentTab';
import OnlineManagersTab from '@/components/community/OnlineManagersTab';
import ClubsTab from '@/components/community/ClubsTab';
import CalendrierTab from '@/components/community/CalendrierTab';

const TABS = [
  { id: 'feed', label: 'Feed', icon: MessageSquare },
  { id: 'calendrier', label: 'Calendrier', icon: Calendar },
  { id: 'clubs', label: 'Clubs', icon: Shield },
  { id: 'online', label: 'En ligne', icon: Wifi },
  { id: 'offic_academy', label: 'Joueurs CDF', icon: GraduationCap },
  { id: 'offic_dev', label: 'Plans Évolution', icon: TrendingUp },
  { id: 'tournaments', label: 'Tournois', icon: Trophy },
  { id: 'trophies', label: 'Palmarès', icon: Trophy },
];

export default function Community() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('feed');

  useEffect(() => {
    base44.auth.me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setUserLoading(false));
  }, []);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      try {
        return await base44.entities.Post.list('-created_date', 50);
      } catch (e) {
        console.error('Error loading posts:', e);
        return [];
      }
    },
    enabled: activeTab === 'feed',
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  const deleteMutation = useMutation({
    mutationFn: (postId) => base44.entities.Post.delete(postId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] })
  });

  const totalLikes = posts.reduce((sum, p) => sum + (p.likes?.length || 0), 0);
  const totalComments = posts.reduce((sum, p) => sum + (p.comments_count || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10" />
        <div className="relative max-w-3xl mx-auto px-4 py-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mb-4">
            <MessageSquare className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Communauté</h1>
          <p className="text-slate-400 mb-6">Partagez vos stats, vos transferts, vos victoires !</p>
          <div className="flex justify-center gap-8">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{posts.length}</p>
              <p className="text-slate-500 text-sm">Posts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{totalLikes}</p>
              <p className="text-slate-500 text-sm">Likes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{totalComments}</p>
              <p className="text-slate-500 text-sm">Commentaires</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800 sticky top-16 z-10 bg-slate-950/90 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${activeTab === tab.id ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'}`}>
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Feed Tab */}
        {activeTab === 'feed' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {userLoading ? null : user ? (
                <CreatePost currentUser={user} />
              ) : (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 text-center">
                  <LogIn className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                  <p className="text-slate-300 font-medium mb-4">Connectez-vous pour poster</p>
                  <Button onClick={() => base44.auth.redirectToLogin(window.location.href)} className="bg-emerald-500 hover:bg-emerald-600">
                    Se connecter
                  </Button>
                </div>
              )}
              {isLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
              ) : posts.length === 0 ? (
                <div className="text-center py-16">
                  <Flame className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg">Soyez le premier à poster !</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map(post => (
                    <PostCard key={post.id} post={post} currentUser={user} onDelete={(id) => deleteMutation.mutate(id)} />
                  ))}
                </div>
              )}
            </div>
            <div className="lg:col-span-1">
              <CommunityChat currentUser={user} />
            </div>
          </div>
        )}

        {activeTab === 'calendrier' && <CalendrierTab />}
        {activeTab === 'clubs' && <ClubsTab />}
        {activeTab === 'online' && <OnlineManagersTab />}
        {activeTab === 'offic_academy' && <OfficializationAcademyTab />}
        {activeTab === 'offic_dev' && <OfficializationDevelopmentTab />}

        {/* Tournaments Tab */}
        {activeTab === 'tournaments' && <TournamentTab />}

        {/* Trophies Tab */}
        {activeTab === 'trophies' && <TrophiesTab />}
      </div>
    </div>
  );
}