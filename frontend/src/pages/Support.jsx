import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TicketIcon, Plus, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { toast } from 'sonner';

const categoryLabels = {
  demande_staff: '🎖️ Demande de rôle staff',
  probleme_technique: '🔧 Problème technique',
  litige_transfert: '⚖️ Litige transfert',
  signalement: '🚩 Signalement',
  autre: '💬 Autre',
};

const statusConfig = {
  ouvert: { label: 'Ouvert', class: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  en_cours: { label: 'En cours', class: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  resolu: { label: 'Résolu', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  ferme: { label: 'Fermé', class: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
};

export default function Support() {
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', category: '', priority: 'normale' });
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => base44.auth.redirectToLogin());
  }, []);

  const { data: tickets = [] } = useQuery({
    queryKey: ['my-tickets', user?.id],
    queryFn: () => base44.entities.Ticket.filter({ author_id: user.id }, '-created_date'),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Ticket.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
      setForm({ title: '', description: '', category: '', priority: 'normale' });
      setShowForm(false);
      toast.success('Ticket envoyé au staff !');
    },
  });

  const handleSubmit = () => {
    if (!form.title || !form.description || !form.category) {
      toast.error('Remplis tous les champs obligatoires');
      return;
    }
    createMutation.mutate({
      ...form,
      author_id: user.id,
      author_name: user.full_name,
      author_club: user.club_name || '',
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
              <TicketIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Support</h1>
              <p className="text-slate-400">Envoie une demande au staff</p>
            </div>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau ticket
          </Button>
        </div>

        {!showForm && (
          <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <p className="text-blue-300 text-sm font-semibold mb-1">📋 À quoi sert le support ?</p>
            <p className="text-slate-400 text-sm leading-relaxed">
              Le support te permet de contacter directement le staff de la ligue. Tu peux ouvrir un ticket pour :
            </p>
            <ul className="mt-2 space-y-1 text-slate-400 text-sm list-none">
              <li>🎖️ <span className="text-slate-300">Demander un rôle staff</span> (arbitre, modérateur, etc.)</li>
              <li>🔧 <span className="text-slate-300">Signaler un problème technique</span> sur la plateforme</li>
              <li>⚖️ <span className="text-slate-300">Contester un transfert</span> ou un résultat de match</li>
              <li>🚩 <span className="text-slate-300">Signaler un comportement inapproprié</span></li>
            </ul>
            <p className="text-slate-500 text-xs mt-2">Le staff répondra directement dans le ticket.</p>
          </div>
        )}

        {showForm && (
          <Card className="bg-slate-900 border-slate-700 mb-6">
            <CardHeader>
              <CardTitle className="text-white text-lg">Nouveau ticket</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-slate-400 text-sm mb-1 block">Catégorie *</label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Choisir une catégorie" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    {Object.entries(categoryLabels).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-slate-400 text-sm mb-1 block">Titre *</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Résumé en quelques mots..."
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 text-sm mb-1 block">Description *</label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Explique ta demande en détail..."
                  className="bg-slate-800 border-slate-700 text-white min-h-[120px]"
                />
              </div>
              <div>
                <label className="text-slate-400 text-sm mb-1 block">Priorité</label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value="basse">🟢 Basse</SelectItem>
                    <SelectItem value="normale">🔵 Normale</SelectItem>
                    <SelectItem value="haute">🟠 Haute</SelectItem>
                    <SelectItem value="urgente">🔴 Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" className="text-slate-400" onClick={() => setShowForm(false)}>Annuler</Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
                  Envoyer le ticket
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {tickets.length === 0 ? (
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="py-16 text-center">
                <TicketIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Aucun ticket pour le moment</p>
                <p className="text-slate-500 text-sm mt-1">Clique sur "Nouveau ticket" pour contacter le staff</p>
              </CardContent>
            </Card>
          ) : tickets.map((ticket) => (
            <Card key={ticket.id} className="bg-slate-900 border-slate-800">
              <CardContent className="py-4 px-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge className={statusConfig[ticket.status]?.class}>{statusConfig[ticket.status]?.label}</Badge>
                      <span className="text-slate-500 text-xs">{categoryLabels[ticket.category]}</span>
                    </div>
                    <h3 className="text-white font-medium truncate">{ticket.title}</h3>
                    <div className="flex items-center gap-1 text-slate-500 text-xs mt-1">
                      <Clock className="w-3 h-3" />
                      {new Date(ticket.created_date).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-slate-400 shrink-0"
                    onClick={() => setExpanded(expanded === ticket.id ? null : ticket.id)}
                  >
                    {expanded === ticket.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
                {expanded === ticket.id && (
                  <div className="mt-4 space-y-3 border-t border-slate-800 pt-4">
                    <p className="text-slate-300 text-sm whitespace-pre-wrap">{ticket.description}</p>
                    {ticket.staff_response && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                        <p className="text-emerald-400 text-xs font-semibold mb-1">Réponse du staff ({ticket.responded_by})</p>
                        <p className="text-slate-200 text-sm whitespace-pre-wrap">{ticket.staff_response}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}