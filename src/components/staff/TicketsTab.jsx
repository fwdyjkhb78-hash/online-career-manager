import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TicketIcon, ChevronDown, ChevronUp, Clock, User } from 'lucide-react';
import { toast } from 'sonner';

const categoryLabels = {
  demande_staff: '🎖️ Demande staff',
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

const priorityConfig = {
  basse: { label: '🟢 Basse', class: 'bg-slate-700 text-slate-300' },
  normale: { label: '🔵 Normale', class: 'bg-blue-500/10 text-blue-300' },
  haute: { label: '🟠 Haute', class: 'bg-amber-500/10 text-amber-300' },
  urgente: { label: '🔴 Urgente', class: 'bg-red-500/10 text-red-300' },
};

export default function TicketsTab({ currentUser }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [responses, setResponses] = useState({});

  const { data: tickets = [] } = useQuery({
    queryKey: ['all-tickets'],
    queryFn: () => base44.entities.Ticket.list('-created_date', 100),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Ticket.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-tickets'] });
      toast.success('Ticket mis à jour');
    },
  });

  const handleRespond = (ticket) => {
    const response = responses[ticket.id];
    if (!response?.trim()) { toast.error('Écris une réponse'); return; }
    updateMutation.mutate({
      id: ticket.id,
      data: {
        staff_response: response,
        responded_by: currentUser.full_name,
        responded_at: new Date().toISOString(),
        status: 'resolu',
      },
    });
    setResponses({ ...responses, [ticket.id]: '' });
  };

  const handleStatusChange = (ticketId, status) => {
    updateMutation.mutate({ id: ticketId, data: { status } });
  };

  const filtered = filterStatus === 'all' ? tickets : tickets.filter(t => t.status === filterStatus);

  const openCount = tickets.filter(t => t.status === 'ouvert').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <TicketIcon className="w-5 h-5 text-blue-400" />
          <h2 className="text-white font-semibold text-lg">Tickets support</h2>
          {openCount > 0 && (
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">{openCount} ouvert{openCount > 1 ? 's' : ''}</Badge>
          )}
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="bg-slate-800 border-slate-700 text-white w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700 text-white">
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="ouvert">Ouverts</SelectItem>
            <SelectItem value="en_cours">En cours</SelectItem>
            <SelectItem value="resolu">Résolus</SelectItem>
            <SelectItem value="ferme">Fermés</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800">
          <div className="py-16 text-center">
            <TicketIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Aucun ticket</p>
          </div>
        </Card>
      ) : filtered.map((ticket) => (
        <Card key={ticket.id} className="bg-slate-900 border-slate-800">
          <CardContent className="py-4 px-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Badge className={statusConfig[ticket.status]?.class}>{statusConfig[ticket.status]?.label}</Badge>
                  <Badge className={priorityConfig[ticket.priority]?.class}>{priorityConfig[ticket.priority]?.label}</Badge>
                  <span className="text-slate-500 text-xs">{categoryLabels[ticket.category]}</span>
                </div>
                <h3 className="text-white font-medium">{ticket.title}</h3>
                <div className="flex items-center gap-3 text-slate-500 text-xs mt-1 flex-wrap">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" />{ticket.author_name}</span>
                  {ticket.author_club && <span>• {ticket.author_club}</span>}
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(ticket.created_date).toLocaleDateString('fr-FR')}</span>
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
              <div className="mt-4 border-t border-slate-800 pt-4 space-y-4">
                <p className="text-slate-300 text-sm whitespace-pre-wrap">{ticket.description}</p>

                {ticket.staff_response && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                    <p className="text-emerald-400 text-xs font-semibold mb-1">Réponse précédente ({ticket.responded_by})</p>
                    <p className="text-slate-200 text-sm whitespace-pre-wrap">{ticket.staff_response}</p>
                  </div>
                )}

                {/* Changer statut */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-400 text-sm">Statut :</span>
                  {['ouvert', 'en_cours', 'resolu', 'ferme'].map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={ticket.status === s ? 'default' : 'outline'}
                      className={ticket.status === s ? 'h-7 text-xs' : 'h-7 text-xs border-slate-600 text-slate-300'}
                      onClick={() => handleStatusChange(ticket.id, s)}
                    >
                      {statusConfig[s].label}
                    </Button>
                  ))}
                </div>

                {/* Réponse */}
                <div className="space-y-2">
                  <Textarea
                    placeholder="Répondre à ce ticket..."
                    value={responses[ticket.id] || ''}
                    onChange={(e) => setResponses({ ...responses, [ticket.id]: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white min-h-[80px] text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleRespond(ticket)}
                    disabled={updateMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    Répondre & Résoudre
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}