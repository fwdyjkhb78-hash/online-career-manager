import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShoppingCart, Lock, Unlock, Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function MercatoManagerTab({ currentUser }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [enableAutoMsg, setEnableAutoMsg] = useState(true);

  const { data: windows = [], isLoading } = useQuery({
    queryKey: ['mercato-window'],
    queryFn: () => base44.entities.MercatoWindow.list('-created_date', 5),
    refetchInterval: 10000,
  });

  const currentWindow = windows[0] || null;
  const isOpen = currentWindow?.is_open === true;

  const { data: pendingAuctions = [] } = useQuery({
    queryKey: ['auctions-pending'],
    queryFn: () => base44.entities.Auction.filter({ status: 'pending' }, '-created_date', 100),
  });

  const toggleMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      const newIsOpen = !isOpen;

      const msgText = message.trim() || (newIsOpen
        ? '🟢 Le mercato est maintenant OUVERT ! Vous pouvez faire vos offres et enchères.'
        : '🔴 Le mercato est maintenant FERMÉ. Les enchères en attente seront activées à la prochaine ouverture.');

      const title = newIsOpen ? '🟢 Ouverture du Mercato' : '🔴 Fermeture du Mercato';

      const updateData = {
        is_open: newIsOpen,
        opened_by_id: currentUser.id,
        opened_by_name: currentUser.full_name,
        opened_at: newIsOpen ? now : currentWindow?.opened_at,
        closed_at: newIsOpen ? null : now,
        message: msgText,
        // Messages auto : à l'ouverture (8h) et à la fermeture (23h) si activé
        pending_open_msg: newIsOpen && enableAutoMsg ? true : false,
        pending_close_msg: newIsOpen && enableAutoMsg ? true : false,
        open_msg_text: newIsOpen ? msgText : (currentWindow?.open_msg_text || ''),
        close_msg_text: currentWindow?.close_msg_text || '',
      };

      if (currentWindow) {
        await base44.entities.MercatoWindow.update(currentWindow.id, updateData);
      } else {
        await base44.entities.MercatoWindow.create(updateData);
      }

      // Si on ouvre le mercato, activer les enchères en attente
      if (newIsOpen && pendingAuctions.length > 0) {
        const endsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        await Promise.all(pendingAuctions.map(a =>
          base44.entities.Auction.update(a.id, {
            status: 'active',
            ends_at: endsAt,
          })
        ));
      }

      // Envoyer une notification immédiate à tous les managers
      const allUsers = await base44.entities.User.list();
      const managers = allUsers.filter(u => u.has_selected_club || u.club_id);
      await Promise.all(managers.map(u =>
        base44.entities.Notification.create({
          user_id: u.id,
          club_id: u.club_id || '',
          type: 'announcement',
          title,
          message: msgText,
          is_read: false,
          link_page: 'TransferMarket',
        })
      ));

      setMessage('');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mercato-window'] });
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      queryClient.invalidateQueries({ queryKey: ['auctions-pending'] });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success(isOpen ? 'Mercato fermé' : `Mercato ouvert${pendingAuctions.length > 0 ? ` — ${pendingAuctions.length} enchère(s) activée(s)` : ''}`);
    },
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Status card */}
      <div className={`rounded-2xl border p-6 ${isOpen ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isOpen ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
              {isOpen ? <Unlock className="w-6 h-6 text-emerald-400" /> : <Lock className="w-6 h-6 text-red-400" />}
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Mercato</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                <span className={`text-sm font-semibold ${isOpen ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isOpen ? 'OUVERT' : 'FERMÉ'}
                </span>
                {currentWindow?.opened_at && isOpen && (
                  <span className="text-slate-400 text-xs">
                    · Ouvert {formatDistanceToNow(new Date(currentWindow.opened_at), { addSuffix: true, locale: fr })}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Badge className={`text-sm px-3 py-1 ${isOpen ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30'}`}>
            {pendingAuctions.length} en attente
          </Badge>
        </div>

        {currentWindow?.message && (
          <div className="mt-4 p-3 bg-slate-900/50 rounded-xl">
            <p className="text-slate-300 text-sm italic">"{currentWindow.message}"</p>
            {currentWindow.opened_by_name && (
              <p className="text-slate-500 text-xs mt-1">— {currentWindow.opened_by_name}</p>
            )}
          </div>
        )}
      </div>

      {/* Pending auctions info */}
      {pendingAuctions.length > 0 && !isOpen && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="w-4 h-4 text-amber-400" />
            <p className="text-amber-300 font-semibold text-sm">{pendingAuctions.length} enchère(s) en attente d'activation</p>
          </div>
          <div className="space-y-1">
            {pendingAuctions.map(a => (
              <p key={a.id} className="text-slate-400 text-xs">• {a.player_name} — {((a.starting_price || 0) / 1e6).toFixed(2)}M€ (par {a.seller_club_name})</p>
            ))}
          </div>
          <p className="text-slate-500 text-xs mt-2">Ces enchères seront automatiquement activées à l'ouverture du mercato.</p>
        </div>
      )}

      {/* Toggle form */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-purple-400" />
          <p className="text-white font-semibold text-sm">Message d'annonce (optionnel)</p>
        </div>
        <Textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder={isOpen
            ? 'Ex: Le mercato est fermé jusqu\'à demain matin 8h...'
            : 'Ex: Le mercato est ouvert jusqu\'à minuit ce soir !'}
          className="bg-slate-700 border-slate-600 text-white resize-none"
          rows={3}
        />
        <Button
          onClick={() => toggleMutation.mutate()}
          disabled={toggleMutation.isPending}
          className={`w-full font-bold ${isOpen ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
        >
          {toggleMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : isOpen ? (
            <Lock className="w-4 h-4 mr-2" />
          ) : (
            <Unlock className="w-4 h-4 mr-2" />
          )}
          {isOpen
            ? 'Fermer le Mercato'
            : `Ouvrir le Mercato${pendingAuctions.length > 0 ? ` (${pendingAuctions.length} enchère(s) en attente)` : ''}`}
        </Button>
        {/* Option message auto — seulement à l'ouverture */}
        {!isOpen && (
          <div className="flex items-center justify-between bg-slate-700/40 rounded-lg px-4 py-3">
            <div>
              <Label className="text-white text-sm font-medium">Messages automatiques 8h / 23h</Label>
              <p className="text-slate-400 text-xs mt-0.5">Annonce communauté à 8h (ouverture) et 23h (fermeture)</p>
            </div>
            <Switch
              checked={enableAutoMsg}
              onCheckedChange={setEnableAutoMsg}
              className="data-[state=checked]:bg-emerald-500"
            />
          </div>
        )}
        <p className="text-slate-500 text-xs text-center">
          {isOpen
            ? 'Une notification immédiate sera envoyée à tous les managers.'
            : enableAutoMsg
              ? 'Notification immédiate + annonces auto à 8h (ouverture) et 23h (fermeture).'
              : 'Seule une notification immédiate sera envoyée aux managers.'}
        </p>
      </div>
    </div>
  );
}