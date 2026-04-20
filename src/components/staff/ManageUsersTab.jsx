import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Search, Loader2, ShieldOff, Bell } from 'lucide-react';
import { toast } from 'sonner';

export default function ManageUsersTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: users = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    refetchInterval: 30000,
  });

  const { data: clubs = [] } = useQuery({
    queryKey: ['clubs-staff'],
    queryFn: () => base44.entities.Club.list(),
  });

  const updateUserClubMutation = useMutation({
    mutationFn: async ({ userId, oldClubId, clubId, clubName }) => {
      await base44.functions.invoke('updateUserClub', { userId, oldClubId, clubId, clubName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      queryClient.invalidateQueries({ queryKey: ['clubs-staff'] });
      toast.success('Club modifié avec succès');
    },
    onError: (error) => {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la modification');
    },
  });

  const freeClubMutation = useMutation({
    mutationFn: async (clubId) => {
      const club = clubs.find(c => c.id === clubId);
      await base44.functions.invoke('updateUserClub', {
        userId: club?.manager_id,
        oldClubId: clubId,
        clubId: null,
        clubName: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      queryClient.invalidateQueries({ queryKey: ['clubs-staff'] });
      toast.success('Club libéré avec succès');
    },
    onError: () => toast.error('Erreur lors de la libération du club'),
  });

  const [sendingNotif, setSendingNotif] = useState(false);

  const sendEAPseudoNotifications = async () => {
    setSendingNotif(true);
    try {
      const managers = users.filter(u => u.has_selected_club && !u.intro_submitted);
      await Promise.all(managers.map(u =>
        base44.entities.Notification.create({
          user_id: u.id,
          club_id: u.club_id || '',
          type: 'announcement',
          title: '🎮 Renseignez votre pseudo EA FC',
          message: 'Merci de renseigner votre pseudo EA FC et votre pseudo du site dans Mon Espace Club (onglet Profil).',
          is_read: false,
          link_page: 'ClubSpace',
        })
      ));
      toast.success(`${managers.length} notification(s) envoyée(s)`);
    } catch (e) {
      toast.error('Erreur lors de l\'envoi');
    }
    setSendingNotif(false);
  };

  const isOnline = (user) => {
    if (!user.last_seen) return false;
    return new Date() - new Date(user.last_seen) < 5 * 60 * 1000;
  };

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.club_name?.toLowerCase().includes(search.toLowerCase())
  );

  const regularUsers = filteredUsers.filter(u => u.role === 'user');
  const takenClubs = clubs.filter(c => c.manager_id);

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            Gérer les Utilisateurs ({regularUsers.length})
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
            onClick={sendEAPseudoNotifications}
            disabled={sendingNotif}
          >
            {sendingNotif ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Bell className="w-3 h-3 mr-2" />}
            Notifier pseudo EA
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, email ou club..."
            className="bg-slate-800 border-slate-700 text-white pl-10"
          />
        </div>

        {/* Section libérer un club */}
        <div className="border-t border-slate-700 pt-4">
          <p className="text-slate-300 font-medium mb-3 flex items-center gap-2">
            <ShieldOff className="w-4 h-4" />
            Libérer un club
          </p>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {takenClubs.length === 0 ? (
              <p className="text-slate-500 text-sm">Tous les clubs sont libres</p>
            ) : (
              takenClubs.map(club => (
                <div key={club.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div>
                    <p className="text-white text-sm font-medium">{club.name}</p>
                    <p className="text-slate-400 text-xs">Manager : {club.manager_name}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => freeClubMutation.mutate(club.id)}
                    disabled={freeClubMutation.isPending}
                  >
                    {freeClubMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Libérer'}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {regularUsers.length === 0 ? (
            <p className="text-slate-400 text-center py-8">Aucun utilisateur trouvé</p>
          ) : (
            regularUsers.map(user => (
              <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-800 rounded-lg">
                <div className="flex-1">
                  <p className="text-white font-medium flex items-center gap-2">
                    {user.full_name}
                    {isOnline(user) && <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" title="En ligne" />}
                  </p>
                  <p className="text-sm text-slate-400">{user.email}</p>
                  {user.club_name && (
                    <Badge className="mt-1 bg-emerald-500/10 text-emerald-400">
                      {user.club_name}
                    </Badge>
                  )}
                  {user.site_pseudo && (
                    <p className="text-xs text-cyan-400 mt-1">@{user.site_pseudo}</p>
                  )}
                  {!user.site_pseudo && user.has_selected_club && (
                    <p className="text-xs text-amber-500 mt-1">⚠️ Pseudo non renseigné</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={user.club_id || 'none'}
                    onValueChange={(clubId) => {
                      const club = clubs.find(c => c.id === clubId);
                      updateUserClubMutation.mutate({
                        userId: user.id,
                        oldClubId: user.club_id || null,
                        clubId: clubId === 'none' ? null : clubId,
                        clubName: clubId === 'none' ? null : club?.name,
                      });
                    }}
                    disabled={updateUserClubMutation.isPending}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white w-[200px]">
                      <SelectValue placeholder="Assigner un club" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="none" className="text-white">
                        Aucun club
                      </SelectItem>
                      {clubs.map(club => (
                        <SelectItem key={club.id} value={club.id} className="text-white">
                          {club.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {updateUserClubMutation.isPending && (
                    <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}