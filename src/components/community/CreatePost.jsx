import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image, Send, Loader2, Pencil } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function CreatePost({ currentUser }) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [pseudoInput, setPseudoInput] = useState(currentUser?.pseudo || '');
  const [editingPseudo, setEditingPseudo] = useState(!currentUser?.pseudo);

  const savePseudo = async () => {
    if (!pseudoInput.trim()) return;
    await base44.auth.updateMe({ pseudo: pseudoInput.trim() });
    setEditingPseudo(false);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      let image_url = null;
      if (imageFile) {
        const res = await base44.integrations.Core.UploadFile({ file: imageFile });
        image_url = res.file_url;
      }
      const pseudo = pseudoInput.trim() || currentUser.full_name;
      await base44.entities.Post.create({
        author_id: currentUser.id,
        author_name: pseudo,
        author_club: currentUser.club_name || null,
        content,
        image_url,
        likes: [],
        comments_count: 0
      });
      if (pseudo !== currentUser.pseudo) {
        await base44.auth.updateMe({ pseudo });
      }
    },
    onSuccess: () => {
      setContent('');
      setImageFile(null);
      setImagePreview(null);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    }
  });

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (content.trim()) createMutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 space-y-4">
      {/* Pseudo selector */}
      <div className="flex items-center gap-2">
        <span className="text-slate-500 text-xs">Poster en tant que :</span>
        {editingPseudo ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              value={pseudoInput}
              onChange={e => setPseudoInput(e.target.value)}
              placeholder="Ton pseudo..."
              maxLength={30}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1 text-white text-sm flex-1 outline-none focus:border-emerald-500"
            />
            <Button type="button" size="sm" onClick={savePseudo} className="bg-emerald-500 hover:bg-emerald-600 h-7 text-xs px-3">
              OK
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold text-sm">@{pseudoInput || currentUser.full_name}</span>
            <button type="button" onClick={() => setEditingPseudo(true)} className="text-slate-500 hover:text-emerald-400 transition-colors">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">
            {(pseudoInput || currentUser.full_name)?.charAt(0)?.toUpperCase()}
          </span>
        </div>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Quoi de neuf dans ta ligue ? Parle de tes transferts, résultats..."
          className="bg-slate-700/50 border-slate-600 text-white resize-none flex-1 min-h-[80px]"
        />
      </div>

      {imagePreview && (
        <div className="relative">
          <img src={imagePreview} alt="" className="rounded-xl max-h-48 object-cover w-full" />
          <button
            type="button"
            onClick={() => { setImageFile(null); setImagePreview(null); }}
            className="absolute top-2 right-2 bg-slate-900/80 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-500"
          >✕</button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <label className="cursor-pointer text-slate-400 hover:text-emerald-400 transition-colors">
          <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
          <Image className="w-5 h-5" />
        </label>
        <Button
          type="submit"
          disabled={!content.trim() || createMutation.isPending}
          className="bg-emerald-500 hover:bg-emerald-600 text-white"
        >
          {createMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          Publier
        </Button>
      </div>
    </form>
  );
}