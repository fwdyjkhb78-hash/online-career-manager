import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Send, Trash2, Shield } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function PostCard({ post, currentUser, onDelete }) {
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');

  const likes = post.likes || [];
  const isLiked = currentUser && likes.includes(currentUser.id);

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', post.id],
    queryFn: () => base44.entities.Comment.filter({ post_id: post.id }, 'created_date'),
    enabled: showComments
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      const newLikes = isLiked
        ? likes.filter(id => id !== currentUser.id)
        : [...likes, currentUser.id];
      await base44.entities.Post.update(post.id, { likes: newLikes });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] })
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Comment.create({
        post_id: post.id,
        author_id: currentUser.id,
        author_name: currentUser.pseudo || currentUser.full_name,
        author_club: currentUser.club_name || null,
        content: commentText
      });
      await base44.entities.Post.update(post.id, {
        comments_count: (post.comments_count || 0) + 1
      });
    },
    onSuccess: () => {
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: ['comments', post.id] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    }
  });

  const handleComment = (e) => {
    e.preventDefault();
    if (commentText.trim()) commentMutation.mutate();
  };

  const timeAgo = post.created_date
    ? formatDistanceToNow(new Date(post.created_date), { addSuffix: true, locale: fr })
    : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-start justify-between p-5 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">
              {post.author_name?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{post.author_name}</p>
            <div className="flex items-center gap-2">
              {post.author_club && (
                <span className="flex items-center gap-1 text-emerald-400 text-xs">
                  <Shield className="w-3 h-3" /> {post.author_club}
                </span>
              )}
              <span className="text-slate-500 text-xs">{timeAgo}</span>
            </div>
          </div>
        </div>
        {currentUser && currentUser.id === post.author_id && (
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-500 hover:text-red-400 h-8 w-8"
            onClick={() => onDelete(post.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="px-5 pb-4">
        <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">{post.content}</p>
        {post.image_url && (
          <img src={post.image_url} alt="" className="mt-3 rounded-xl max-h-80 w-full object-cover" />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 px-5 py-3 border-t border-slate-700/50">
        <button
          onClick={() => currentUser && likeMutation.mutate()}
          disabled={!currentUser}
          className={`flex items-center gap-2 text-sm font-medium transition-colors ${
            isLiked ? 'text-red-400' : 'text-slate-400 hover:text-red-400'
          }`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
          <span>{likes.length}</span>
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 text-slate-400 hover:text-blue-400 text-sm font-medium transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{post.comments_count || 0}</span>
        </button>
      </div>

      {/* Comments Section */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-700/50 overflow-hidden"
          >
            <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
              {comments.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-2">Aucun commentaire</p>
              )}
              {comments.map(comment => (
                <div key={comment.id} className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">
                      {comment.author_name?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl px-3 py-2 flex-1">
                    <p className="text-emerald-400 text-xs font-semibold">{comment.author_name}</p>
                    <p className="text-slate-200 text-sm">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
            {currentUser && (
              <form onSubmit={handleComment} className="flex gap-2 px-4 pb-4">
                <Input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Écrire un commentaire..."
                  className="bg-slate-700 border-slate-600 text-white text-sm"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!commentText.trim() || commentMutation.isPending}
                  className="bg-emerald-500 hover:bg-emerald-600 flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}