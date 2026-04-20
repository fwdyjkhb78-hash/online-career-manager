import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2, Smile } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const STAFF_ROLES = ['owner', 'admin', 'staff_annonce', 'staff_mercato', 'staff_annonces', 'staff_championnat', 'staff_developpement', 'staff_formation'];
const EMOJIS = ['👍', '❤️', '🔥', '😂', '😮', '👏', '⚽', '🏆'];

export default function AnnouncementTab({ tabType, currentUser }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const isStaff = currentUser && STAFF_ROLES.includes(currentUser.role);

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements', tabType],
    queryFn: async () => {
      try {
        return await base44.entities.Announcement.filter({ type: tabType }, '-created_date', 50);
      } catch (e) {
        return [];
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const createMutation = useMutation({
    mutationFn: () => base44.entities.Announcement.create({
      type: tabType,
      title,
      content,
      author_id: currentUser.id,
      author_name: currentUser.full_name,
      reactions: {}
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements', tabType] });
      setTitle(''); setContent(''); setShowForm(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Announcement.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements', tabType] })
  });

  const reactMutation = useMutation({
    mutationFn: async ({ ann, emoji }) => {
      const reactions = { ...(ann.reactions || {}) };
      const arr = reactions[emoji] || [];
      const already = arr.includes(currentUser.id);
      reactions[emoji] = already ? arr.filter(id => id !== currentUser.id) : [...arr, currentUser.id];
      await base44.entities.Announcement.update(ann.id, { reactions });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements', tabType] })
  });

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-emerald-500 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {isStaff && (
        <div className="flex justify-end">
          <Button onClick={() => setShowForm(!showForm)} size="sm" className="bg-emerald-500 hover:bg-emerald-600">
            <Plus className="w-4 h-4 mr-1" /> Nouvelle annonce
          </Button>
        </div>
      )}

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/70 border border-emerald-500/30 rounded-2xl p-5 space-y-3">
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre..." className="bg-slate-700 border-slate-600 text-white" />
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Contenu de l'annonce..."
            className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm resize-none min-h-[100px]" />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" className="text-slate-400" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600" disabled={!title.trim() || !content.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publier'}
            </Button>
          </div>
        </motion.div>
      )}

      {announcements.length === 0 ? (
        <div className="text-center py-16 text-slate-500">Aucune annonce pour le moment.</div>
      ) : (
        announcements.map(ann => (
          <motion.div key={ann.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-white font-bold text-lg">{ann.title}</h3>
                <p className="text-slate-500 text-xs">{ann.author_name} · {ann.created_date ? formatDistanceToNow(new Date(ann.created_date), { addSuffix: true, locale: fr }) : ''}</p>
              </div>
              {isStaff && (
                <Button variant="ghost" size="icon" className="text-slate-500 hover:text-red-400 h-8 w-8 shrink-0" onClick={() => deleteMutation.mutate(ann.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
            <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{ann.content}</p>
            {/* Reactions */}
            <div className="flex flex-wrap gap-2 pt-1">
              {EMOJIS.map(emoji => {
                const arr = ann.reactions?.[emoji] || [];
                const active = currentUser && arr.includes(currentUser.id);
                return (
                  <button key={emoji} onClick={() => currentUser && reactMutation.mutate({ ann, emoji })}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-sm transition-all ${active ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300' : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500'}`}>
                    {emoji} {arr.length > 0 && <span className="text-xs">{arr.length}</span>}
                  </button>
                );
              })}
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
}