import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Crown, MessageSquare, Users, Send, UserPlus, Shield, Trophy, Wallet, TicketIcon, UserX, CalendarDays, Building2, ShoppingCart, ArrowRight, Image } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import CreatePlayerTab from '@/components/staff/CreatePlayerTab';
import ManageStaffTab from '@/components/staff/ManageStaffTab';
import ManageUsersTab from '@/components/staff/ManageUsersTab';
import TournamentManagerTab from '@/components/staff/TournamentManagerTab';
import ManageBudgetsTab from '@/components/staff/ManageBudgetsTab';
import TicketsTab from '@/components/staff/TicketsTab';
import AwardsTab from '@/components/staff/AwardsTab';
import FreePlayersTab from '@/components/staff/FreePlayersTab';
import SeasonManagerTab from '@/components/staff/SeasonManagerTab';
import ClubManagerTab from '@/components/staff/ClubManagerTab';
import MercatoManagerTab from '@/components/staff/MercatoManagerTab';
import MovePlayersTab from '@/components/staff/MovePlayersTab';
import CalendarGeneratorTab from '@/components/staff/CalendarGeneratorTab';
import UpdatePhotosTab from '@/components/staff/UpdatePhotosTab';

export default function StaffRoom() {
  const [user, setUser] = useState(null);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  const { data: messages = [], refetch } = useQuery({
    queryKey: ['staff-messages'],
    queryFn: () => base44.entities.StaffMessage.list('-created_date', 50),
    enabled: !!user,
  });

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      await base44.entities.StaffMessage.create({
        content: newMessage,
        author_id: user.id,
        author_name: user.full_name,
        author_role: user.role,
      });

      setNewMessage('');
      refetch();
      toast.success('Message envoyé');
    } catch (error) {
      toast.error('Erreur lors de l\'envoi');
    }
  };

  if (!user || !['owner', 'admin', 'staff_mercato', 'staff_annonces', 'staff_championnat', 'staff_developpement', 'staff_formation'].includes(user.role)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="bg-slate-900 border-slate-800 text-white max-w-md">
          <CardContent className="pt-6 text-center">
            <Crown className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Accès Réservé au Staff</h2>
            <p className="text-slate-400">Cette zone est réservée aux membres du staff uniquement.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roleColors = {
    owner: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    admin: 'bg-red-500/10 text-red-400 border-red-500/20',
    staff_mercato: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    staff_annonces: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    staff_championnat: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    staff_developpement: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    staff_formation: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  };

  const roleLabels = {
    owner: 'Propriétaire',
    admin: 'Administrateur',
    staff_mercato: 'Staff Mercato',
    staff_annonces: 'Staff Annonces',
    staff_championnat: 'Staff Championnat',
    staff_developpement: 'Staff Développement',
    staff_formation: 'Staff Formation',
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Crown className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Staff Room</h1>
            <p className="text-slate-400">Espace de communication réservé au staff</p>
          </div>
        </div>

        <Tabs defaultValue="messages" className="w-full">
          <TabsList className="bg-slate-900 border border-slate-800 w-full flex flex-wrap gap-1 h-auto p-2">
            <TabsTrigger value="messages" className="data-[state=active]:bg-slate-800 flex-col gap-1 py-2 px-3 h-auto text-xs">
              <MessageSquare className="w-4 h-4" />
              <span>Messages</span>
            </TabsTrigger>
            <TabsTrigger value="create-player" className="data-[state=active]:bg-slate-800 flex-col gap-1 py-2 px-3 h-auto text-xs">
              <UserPlus className="w-4 h-4" />
              <span>Joueur</span>
            </TabsTrigger>
            <TabsTrigger value="manage-staff" className="data-[state=active]:bg-slate-800 flex-col gap-1 py-2 px-3 h-auto text-xs">
              <Crown className="w-4 h-4" />
              <span>Staff</span>
            </TabsTrigger>
            <TabsTrigger value="manage-users" className="data-[state=active]:bg-slate-800 flex-col gap-1 py-2 px-3 h-auto text-xs">
              <Users className="w-4 h-4" />
              <span>Utilisateurs</span>
            </TabsTrigger>
            <TabsTrigger value="tournaments" className="data-[state=active]:bg-slate-800 flex-col gap-1 py-2 px-3 h-auto text-xs">
              <Trophy className="w-4 h-4" />
              <span>Tournois</span>
            </TabsTrigger>
            <TabsTrigger value="budgets" className="data-[state=active]:bg-slate-800 flex-col gap-1 py-2 px-3 h-auto text-xs">
              <Wallet className="w-4 h-4" />
              <span>Budgets</span>
            </TabsTrigger>
            <TabsTrigger value="tickets" className="data-[state=active]:bg-slate-800 flex-col gap-1 py-2 px-3 h-auto text-xs">
              <TicketIcon className="w-4 h-4" />
              <span>Tickets</span>
            </TabsTrigger>
            <TabsTrigger value="awards" className="data-[state=active]:bg-slate-800 flex-col gap-1 py-2 px-3 h-auto text-xs">
              <Trophy className="w-4 h-4" />
              <span>Trophées</span>
            </TabsTrigger>
            <TabsTrigger value="free-players" className="data-[state=active]:bg-slate-800 flex-col gap-1 py-2 px-3 h-auto text-xs">
              <UserX className="w-4 h-4" />
              <span>Libres</span>
            </TabsTrigger>
            <TabsTrigger value="season" className="data-[state=active]:bg-slate-800 flex-col gap-1 py-2 px-3 h-auto text-xs">
              <CalendarDays className="w-4 h-4" />
              <span>Saisons</span>
            </TabsTrigger>
            <TabsTrigger value="clubs" className="data-[state=active]:bg-slate-800 flex-col gap-1 py-2 px-3 h-auto text-xs">
              <Building2 className="w-4 h-4" />
              <span>Clubs</span>
            </TabsTrigger>
            <TabsTrigger value="mercato" className="data-[state=active]:bg-slate-800 flex-col gap-1 py-2 px-3 h-auto text-xs">
              <ShoppingCart className="w-4 h-4" />
              <span>Mercato</span>
            </TabsTrigger>
            <TabsTrigger value="move-players" className="data-[state=active]:bg-slate-800 flex-col gap-1 py-2 px-3 h-auto text-xs">
              <ArrowRight className="w-4 h-4" />
              <span>Déplacer</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="data-[state=active]:bg-slate-800 flex-col gap-1 py-2 px-3 h-auto text-xs">
              <CalendarDays className="w-4 h-4" />
              <span>Calendrier</span>
            </TabsTrigger>
            <TabsTrigger value="photos" className="data-[state=active]:bg-slate-800 flex-col gap-1 py-2 px-3 h-auto text-xs">
              <Image className="w-4 h-4" />
              <span>Photos</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="messages" className="mt-6">
            <Card className="bg-slate-900 border-slate-800 mb-6">
              <CardContent className="pt-6">
                <div className="flex flex-col gap-3">
                  <Textarea
                    placeholder="Écrire un message au staff..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className="bg-emerald-500 hover:bg-emerald-600"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Envoyer
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {messages.length === 0 ? (
                <Card className="bg-slate-900 border-slate-800">
                  <CardContent className="py-12 text-center">
                    <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">Aucun message pour le moment</p>
                  </CardContent>
                </Card>
              ) : (
                messages.map((message) => (
                  <Card key={message.id} className="bg-slate-900 border-slate-800">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                            <Users className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-white">{message.author_name}</h3>
                              <Badge className={roleColors[message.author_role] || 'bg-slate-700 text-slate-300'}>
                                {roleLabels[message.author_role] || message.author_role}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500">
                              {new Date(message.created_date).toLocaleString('fr-FR')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate-300 whitespace-pre-wrap">{message.content}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="create-player" className="mt-6">
            <CreatePlayerTab />
          </TabsContent>

          <TabsContent value="manage-staff" className="mt-6">
            <ManageStaffTab />
          </TabsContent>

          <TabsContent value="manage-users" className="mt-6">
            <ManageUsersTab />
          </TabsContent>
          <TabsContent value="tournaments" className="mt-6">
            <TournamentManagerTab currentUser={user} />
          </TabsContent>
          <TabsContent value="budgets" className="mt-6">
            <ManageBudgetsTab />
          </TabsContent>
          <TabsContent value="tickets" className="mt-6">
            <TicketsTab currentUser={user} />
          </TabsContent>
          <TabsContent value="awards" className="mt-6">
            <AwardsTab />
          </TabsContent>
          <TabsContent value="free-players" className="mt-6">
            <FreePlayersTab />
          </TabsContent>
          <TabsContent value="season" className="mt-6">
            <SeasonManagerTab />
          </TabsContent>
          <TabsContent value="clubs" className="mt-6">
            <ClubManagerTab />
          </TabsContent>
          <TabsContent value="mercato" className="mt-6">
            <MercatoManagerTab currentUser={user} />
          </TabsContent>
          <TabsContent value="move-players" className="mt-6">
            <MovePlayersTab />
          </TabsContent>
          <TabsContent value="calendar" className="mt-6">
            <CalendarGeneratorTab />
          </TabsContent>
          <TabsContent value="photos" className="mt-6">
            <UpdatePhotosTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}