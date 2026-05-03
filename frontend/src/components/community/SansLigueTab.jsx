import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, Search, MessageSquare, Loader2, ChevronDown, ChevronRight, Users, CheckCircle2, XCircle, Send } from 'lucide-react';
import { fetchAll } from '@/utils/fetchAll';
import { toast } from 'sonner';

const fmt = (v) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M€` : `${(v / 1e3).toFixed(0)}k€`;

export default function SansLigueTab({ currentUser, userClub }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [negotiatingPlayer, setNegotiatingPlayer] = useState(null);
  const [expandedClub, setExpandedClub] = useState(null);
  const [negotiationState, setNegotiationState] = useState(null); // null | 'loading' | 'accepted' | 'rejected'
  const [negotiationMessage, setNegotiationMessage] = useState('');
  const [offerAmount, setOfferAmount] = useState('');

  const { data: sansLigueClubs = [], isLoading: loadingClubs } = useQuery({
    queryKey: ['sans-ligue-clubs'],
    queryFn: () => base44.entities.SansLigueClub.list(),
  });

  const { data: allPlayers = [], isLoading: loadingPlayers } = useQuery({
    queryKey: ['all-players-sl'],
    queryFn: () => fetchAll('Player'),
  });

  const sansLigueNames = new Set(sansLigueClubs.map(c => c.name.toLowerCase()));

  const playersByClub = {};
  allPlayers.forEach(p => {
    if (p.club_name && sansLigueNames.has(p.club_name.toLowerCase())) {
      const key = p.club_name;
      if (!playersByClub[key]) playersByClub[key] = [];
      playersByClub[key].push(p);
    }
  });

  const filteredClubs = sansLigueClubs.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const startNegotiation = async () => {
    if (!negotiatingPlayer || !userClub) return;
    const amount = parseInt(offerAmount) || negotiatingPlayer.value || 0;
    setNegotiationState('loading');

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Tu es ${negotiatingPlayer.name}, footballeur professionnel de ${negotiatingPlayer.position}, ${negotiatingPlayer.age} ans, valeur de marché ${fmt(negotiatingPlayer.value || 0)}.

Le club "${userClub.name}" te propose un contrat avec une offre de ${fmt(amount)}.
Ta valeur de marché est ${fmt(negotiatingPlayer.value || 0)}.

Réponds de façon réaliste et immersive comme un joueur professionnel. 
- Si l'offre est >= 80% de ta valeur : tu acceptes (réponse enthousiaste)
- Si l'offre est entre 50% et 80% : tu négocies ou acceptes selon ton humeur
- Si l'offre est < 50% de ta valeur : tu refuses poliment mais fermement

IMPORTANT : commence toujours ta réponse par "ACCEPTE:" ou "REFUSE:" suivi d'un message naturel en français (2-3 phrases max).`,
        response_json_schema: null,
      });

      const text = String(result);
      const accepted = text.toUpperCase().startsWith('ACCEPTE:');
      const message = text.replace(/^(ACCEPTE:|REFUSE:)/i, '').trim();
      setNegotiationMessage(message);
      setNegotiationState(accepted ? 'accepted' : 'rejected');
    } catch (e) {
      setNegotiationState('rejected');
      setNegotiationMessage('Le joueur n\'a pas pu être contacté pour l\'instant.');
    }
  };

  const confirmTransfer = useMutation({
    mutationFn: async () => {
      if (!userClub || !negotiatingPlayer) throw new Error('Données manquantes');
      const amount = parseInt(offerAmount) || negotiatingPlayer.value || 0;
      if ((userClub.budget || 0) < amount) throw new Error('Budget insuffisant');

      await base44.entities.Club.update(userClub.id, { budget: (userClub.budget || 0) - amount });
      await base44.entities.Player.update(negotiatingPlayer.id, {
        club_id: userClub.id,
        club_name: userClub.name,
        is_on_transfer_list: false,
      });
      await base44.entities.Transfer.create({
        player_id: negotiatingPlayer.id,
        player_name: negotiatingPlayer.name,
        from_club_id: null,
        from_club_name: negotiatingPlayer.club_name,
        to_club_id: userClub.id,
        to_club_name: userClub.name,
        amount,
        status: 'completed',
        offer_type: 'transfer',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-players-sl'] });
      toast.success(`${negotiatingPlayer?.name} a rejoint ${userClub?.name} !`);
      closeDialog();
    },
    onError: (e) => toast.error(e.message || 'Erreur lors du transfert'),
  });

  const closeDialog = () => {
    setNegotiatingPlayer(null);
    setNegotiationState(null);
    setNegotiationMessage('');
    setOfferAmount('');
  };

  const getPositionColor = (pos) => {
    if (['GK'].includes(pos)) return 'bg-yellow-500/20 text-yellow-300';
    if (['CB','LB','RB'].includes(pos)) return 'bg-blue-500/20 text-blue-300';
    if (['CDM','CM','CAM'].includes(pos)) return 'bg-green-500/20 text-green-300';
    return 'bg-red-500/20 text-red-300';
  };

  if (loadingClubs) return (
    <div className="flex justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
    </div>
  );

  if (sansLigueClubs.length === 0) return (
    <Card className="bg-slate-900 border-slate-800">
      <CardContent className="py-12 text-center">
        <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400">Aucun club hors-ligue disponible pour le moment.</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Building2 className="w-5 h-5 text-orange-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-orange-300 font-semibold text-sm">Clubs Hors-Ligue</p>
            <p className="text-slate-400 text-xs mt-1">
              Négociez directement avec les joueurs. Faites une offre et le joueur répondra — s'il refuse, il reste libre.
            </p>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un club..." className="bg-slate-800 border-slate-700 text-white pl-10" />
      </div>

      <div className="space-y-3">
        {filteredClubs.map(club => {
          const players = playersByClub[club.name] || [];
          const isExpanded = expandedClub === club.id;

          return (
            <Card key={club.id} className="bg-slate-900 border-slate-800">
              <button
                className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-800/50 transition-colors rounded-xl"
                onClick={() => setExpandedClub(isExpanded ? null : club.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{club.name}</p>
                    <p className="text-slate-500 text-xs">{players.length} joueurs disponibles</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-orange-500/20 text-orange-300 text-xs">Hors-ligue</Badge>
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-2">
                  {loadingPlayers ? (
                    <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
                  ) : players.length === 0 ? (
                    <p className="text-slate-500 text-sm py-3 text-center">Aucun joueur enregistré pour ce club</p>
                  ) : (
                    players.map(player => (
                      <div key={player.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {player.image_url ? (
                            <img src={player.image_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
                              <span className="text-white font-bold text-sm">{player.name?.charAt(0)}</span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-white text-sm font-medium truncate">{player.name}</p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge className={`text-xs ${getPositionColor(player.position)}`}>{player.position}</Badge>
                              <span className="text-slate-400 text-xs">⭐ {player.overall}</span>
                              {player.age && <span className="text-slate-500 text-xs">{player.age} ans</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <p className="text-emerald-400 text-sm font-bold">{fmt(player.value || 0)}</p>
                          {currentUser && userClub ? (
                            <Button size="sm" className="bg-orange-500 hover:bg-orange-600 h-7 text-xs"
                              onClick={() => { setNegotiatingPlayer(player); setOfferAmount(String(player.value || '')); }}>
                              <MessageSquare className="w-3 h-3 mr-1" /> Négocier
                            </Button>
                          ) : (
                            <span className="text-slate-600 text-xs">Connexion requise</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Dialog négociation */}
      <Dialog open={!!negotiatingPlayer} onOpenChange={closeDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-orange-400" />
              Négocier avec {negotiatingPlayer?.name}
            </DialogTitle>
          </DialogHeader>
          {negotiatingPlayer && (
            <div className="space-y-4">
              {/* Player info */}
              <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
                {negotiatingPlayer.image_url ? (
                  <img src={negotiatingPlayer.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center">
                    <span className="text-white font-bold">{negotiatingPlayer.name?.charAt(0)}</span>
                  </div>
                )}
                <div>
                  <p className="text-white font-semibold">{negotiatingPlayer.name}</p>
                  <p className="text-slate-400 text-sm">{negotiatingPlayer.position} · ⭐ {negotiatingPlayer.overall}</p>
                  <p className="text-emerald-400 text-xs font-semibold">Valeur : {fmt(negotiatingPlayer.value || 0)}</p>
                </div>
              </div>

              {/* Résultat négociation */}
              {negotiationState === 'loading' && (
                <div className="flex flex-col items-center gap-3 py-6">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
                  <p className="text-slate-400 text-sm">En attente de la réponse du joueur...</p>
                </div>
              )}

              {negotiationState === 'accepted' && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-emerald-300 font-semibold text-sm mb-1">✅ Le joueur accepte !</p>
                      <p className="text-slate-300 text-sm italic">"{negotiationMessage}"</p>
                    </div>
                  </div>
                  {(userClub?.budget || 0) < parseInt(offerAmount) ? (
                    <p className="text-red-400 text-sm">⚠️ Budget insuffisant ({fmt(userClub?.budget || 0)})</p>
                  ) : (
                    <Button
                      className="w-full bg-emerald-500 hover:bg-emerald-600"
                      onClick={() => confirmTransfer.mutate()}
                      disabled={confirmTransfer.isPending}
                    >
                      {confirmTransfer.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                      Confirmer le transfert — {fmt(parseInt(offerAmount) || 0)}
                    </Button>
                  )}
                </div>
              )}

              {negotiationState === 'rejected' && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-300 font-semibold text-sm mb-1">❌ Le joueur refuse</p>
                      <p className="text-slate-300 text-sm italic">"{negotiationMessage}"</p>
                    </div>
                  </div>
                  <p className="text-slate-500 text-xs text-center">Le joueur reste libre. Essayez avec une offre plus élevée.</p>
                  <Button variant="outline" className="w-full border-slate-600" onClick={() => setNegotiationState(null)}>
                    Faire une nouvelle offre
                  </Button>
                </div>
              )}

              {/* Formulaire offre */}
              {!negotiationState && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-slate-800 rounded-lg p-3">
                      <p className="text-slate-400 text-xs mb-1">Valeur marché</p>
                      <p className="text-orange-400 font-bold">{fmt(negotiatingPlayer.value || 0)}</p>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-3">
                      <p className="text-slate-400 text-xs mb-1">Votre budget</p>
                      <p className={`font-bold ${(userClub?.budget || 0) >= (negotiatingPlayer.value || 0) ? 'text-emerald-400' : 'text-red-400'}`}>
                        {fmt(userClub?.budget || 0)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-slate-300 text-xs font-medium">Votre offre (€)</label>
                    <Input
                      type="number"
                      value={offerAmount}
                      onChange={e => setOfferAmount(e.target.value)}
                      placeholder="Montant proposé"
                      className="bg-slate-800 border-slate-700"
                    />
                    {offerAmount && <p className="text-slate-500 text-xs">{fmt(parseInt(offerAmount) || 0)}</p>}
                  </div>

                  <Button
                    className="w-full bg-orange-500 hover:bg-orange-600"
                    onClick={startNegotiation}
                    disabled={!offerAmount || parseInt(offerAmount) <= 0}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Envoyer l'offre au joueur
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}