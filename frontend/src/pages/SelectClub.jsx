import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Shield, Check, Loader2, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ClubSelector from '@/components/ClubSelector';

export default function SelectClub() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedClub, setSelectedClub] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        if (userData.has_selected_club) {
          navigate(createPageUrl('MyClub'));
        }
      } catch (e) {
        base44.auth.redirectToLogin(createPageUrl('SelectClub'));
      }
    };
    loadUser();
  }, [navigate]);

  const { data: clubs = [], isLoading } = useQuery({
    queryKey: ['clubs'],
    queryFn: () => base44.entities.Club.list()
  });

  // Un club est pris si manager_id est renseigné et différent de l'utilisateur courant
  const takenClubIds = clubs.filter(c => c.manager_id && c.manager_id !== user?.id).map(c => c.id);

  // Empêcher la sélection d'un club déjà pris
  const handleSelectClub = (club) => {
    if (takenClubIds.includes(club.id)) return;
    setSelectedClub(club);
  };

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

      // Envoyer une notification à tous les managers existants sans pseudo EA
      try {
        const allUsers = await base44.entities.User.list();
        const managersWithoutPseudo = allUsers.filter(
          u => u.has_selected_club && !u.intro_submitted && u.id !== user.id
        );
        await Promise.all(managersWithoutPseudo.map(u =>
          base44.entities.Notification.create({
            user_id: u.id,
            club_id: u.club_id || '',
            type: 'announcement',
            title: '🎮 Renseignez votre pseudo EA FC',
            message: 'Nouveau membre dans la ligue ! Profitez-en pour renseigner votre pseudo EA FC et votre pseudo du site dans Mon Espace Club.',
            is_read: false,
            link_page: 'ClubSpace',
          })
        ));
      } catch (e) { /* ignore */ }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
      navigate(createPageUrl('Dashboard'));
    },
    onError: () => {
      setError("Erreur lors de la sélection du club. Veuillez réessayer.");
    }
  });

  const handleConfirm = () => {
    if (selectedClub) {
      selectMutation.mutate(selectedClub);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center mb-6">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Choisissez Votre Club</h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Sélectionnez le club que vous souhaitez manager cette saison. 
            Les clubs déjà pris par d'autres managers ne sont pas disponibles.
          </p>
        </motion.div>

        {error && (
          <Alert className="mb-6 bg-red-500/10 border-red-500/30 text-red-400">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {clubs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 text-lg">Aucun club disponible pour le moment.</p>
            <p className="text-slate-500 mt-2">L'administrateur doit d'abord créer les clubs de la ligue.</p>
          </div>
        ) : (
          <>
            <ClubSelector
              clubs={clubs}
              selectedId={selectedClub?.id}
              onSelect={handleSelectClub}
              takenClubIds={takenClubIds}
            />

            {selectedClub && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900/95 backdrop-blur-lg border-t border-slate-700"
              >
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {selectedClub.logo_url ? (
                      <img src={selectedClub.logo_url} alt="" className="w-12 h-12 rounded-xl" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center">
                        <span className="text-white font-bold">
                          {selectedClub.name?.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-white font-bold">{selectedClub.name}</p>
                      <p className="text-slate-400 text-sm">Budget: {(selectedClub.budget / 1000000).toFixed(0)}M€</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleConfirm}
                    disabled={selectMutation.isPending}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-8"
                  >
                    {selectMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    Confirmer
                  </Button>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}