import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Loader2, Mail, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function ManageStaffTab() {
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('staff_mercato');

  const { data: users = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list('-created_date', 5000),
  });

  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }) => {
      // Charger tous les users et chercher par email
      const allUsers = await base44.entities.User.list('-created_date', 5000);
      const existingUser = allUsers.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        await base44.entities.User.update(existingUser.id, { role });
        return { existing: true };
      }
      // Sinon on invite
      await base44.users.inviteUser(email, role);
      return { existing: false };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success(result.existing ? 'Rôle staff attribué directement' : 'Invitation envoyée');
      setInviteEmail('');
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de l\'invitation');
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }) => base44.entities.User.update(userId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('Rôle modifié');
    },
    onError: () => {
      toast.error('Erreur lors de la modification');
    },
  });

  const handleInvite = (e) => {
    e.preventDefault();
    inviteMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  const staffRoles = [
    { value: 'staff_mercato', label: 'Staff Mercato', color: 'bg-blue-500/10 text-blue-400' },
    { value: 'staff_annonces', label: 'Staff Annonces', color: 'bg-purple-500/10 text-purple-400' },
    { value: 'staff_championnat', label: 'Staff Championnat', color: 'bg-emerald-500/10 text-emerald-400' },
    { value: 'staff_developpement', label: 'Staff Développement', color: 'bg-amber-500/10 text-amber-400' },
    { value: 'staff_formation', label: 'Staff Formation', color: 'bg-cyan-500/10 text-cyan-400' },
    { value: 'admin', label: 'Administrateur', color: 'bg-red-500/10 text-red-400' },
  ];

  const getRoleLabel = (role) => {
    const found = staffRoles.find(r => r.value === role);
    return found?.label || role;
  };

  const getRoleColor = (role) => {
    const found = staffRoles.find(r => r.value === role);
    return found?.color || 'bg-slate-700 text-slate-300';
  };

  const staffUsers = users.filter(u => 
    ['admin', 'staff_mercato', 'staff_annonces', 'staff_championnat', 'staff_developpement', 'staff_formation', 'owner'].includes(u.role)
  );

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Inviter un Membre du Staff
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Email</label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="nom@exemple.com"
                required
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Rôle</label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {staffRoles.map(role => (
                    <SelectItem key={role.value} value={role.value} className="text-white">
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="submit"
              disabled={inviteMutation.isPending}
              className="bg-emerald-500 hover:bg-emerald-600 w-full"
            >
              {inviteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Envoyer l'Invitation
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Membres du Staff ({staffUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {staffUsers.length === 0 ? (
              <p className="text-slate-400 text-center py-8">Aucun membre du staff</p>
            ) : (
              staffUsers.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{user.full_name}</p>
                    <p className="text-sm text-slate-400">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={getRoleColor(user.role)}>
                      {getRoleLabel(user.role)}
                    </Badge>
                    {user.role !== 'owner' && (
                      <Select
                        value={user.role}
                        onValueChange={(role) => updateRoleMutation.mutate({ userId: user.id, role })}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {staffRoles.map(role => (
                            <SelectItem key={role.value} value={role.value} className="text-white">
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}