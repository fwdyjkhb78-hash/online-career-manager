import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, Image, X, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import PostCard from '@/components/community/PostCard';

export default function ClubProfile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const clubId = urlParams.get('club_id');

  const [user, setUser] = useState(null);
  const [postContent, setPostContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: () => base44.entities.Club.filter({ id: clubId }).then(r => r[0]),
    enabled: !!clubId,
  });

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['club-posts', clubId],
    queryFn: () => base44.entities.Post.filter({ author_club: club?.name }, '-created_date', 50),
    enabled: !!club?.name,
  });

  const postMutation = useMutation({
    mutationFn: async (imageUrl) => {
      await base44.entities.Post.create({
        author_id: user.id,
        author_name: user.full_name,
        author_club: user.club_name || club?.name,
        content: postContent,
        image_url: imageUrl || null,
        likes: [],
        comments_count: 0,
      });
    },
    onSuccess: () => {
      setPostContent('');
      setImageFile(null);
      setImagePreview(null);
      queryClient.invalidateQueries({ queryKey: ['club-posts', clubId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    }
  });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!postContent.trim() && !imageFile) return;
    setUploading(true);
    let imageUrl = null;
    if (imageFile) {
      const res = await base44.integrations.Core.UploadFile({ file: imageFile });
      imageUrl = res.file_url;
    }
    setUploading(false);
    postMutation.mutate(imageUrl);
  };

  const isOwner = user && club && (user.club_id === clubId || user.club_name === club?.name);
  const isStaff = user && ['owner', 'admin', 'staff_mercato', 'staff_annonces', 'staff_championnat', 'staff_developpement', 'staff_formation'].includes(user.role);

  const totalLikes = posts.reduce((sum, p) => sum + (p.likes?.length || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Back */}
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
      </div>

      {/* Profile Header */}
      <div className="max-w-2xl mx-auto px-4 mb-8">
        <div className="flex items-center gap-6 mb-6">
          <div className="w-24 h-24 rounded-full border-2 border-slate-600 overflow-hidden bg-slate-800 flex items-center justify-center flex-shrink-0">
            {club?.logo_url ? (
              <img src={club.logo_url} alt={club?.name} className="w-full h-full object-contain p-2" />
            ) : (
              <Shield className="w-10 h-10 text-slate-400" />
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-white text-xl font-bold">{club?.name || '...'}</h1>
            {club?.manager_name && (
              <p className="text-slate-400 text-sm">@{club.manager_name}</p>
            )}
            <div className="flex gap-6 mt-3">
              <div className="text-center">
                <p className="text-white font-bold text-lg">{posts.length}</p>
                <p className="text-slate-500 text-xs">Publications</p>
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-lg">{totalLikes}</p>
                <p className="text-slate-500 text-xs">Likes</p>
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-lg">{club?.points || 0}</p>
                <p className="text-slate-500 text-xs">Points</p>
              </div>
            </div>
          </div>
        </div>

        {club?.stadium && (
          <p className="text-slate-400 text-sm">🏟️ {club.stadium}</p>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4">
        {/* Create Post — only for club owner or staff */}
        {(isOwner || isStaff) && user && (
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 mb-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-700 flex items-center justify-center flex-shrink-0 border border-slate-600">
                {club?.logo_url ? (
                  <img src={club.logo_url} alt="" className="w-full h-full object-contain p-1" />
                ) : (
                  <Shield className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div className="flex-1">
                <Textarea
                  value={postContent}
                  onChange={e => setPostContent(e.target.value)}
                  placeholder={`Publier au nom de ${club?.name}...`}
                  className="bg-slate-700/50 border-slate-600 text-white resize-none text-sm min-h-[80px]"
                />
                {imagePreview && (
                  <div className="relative mt-3">
                    <img src={imagePreview} alt="" className="rounded-xl max-h-64 w-full object-cover" />
                    <button
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-between mt-3">
                  <label className="cursor-pointer flex items-center gap-2 text-slate-400 hover:text-emerald-400 text-sm transition-colors">
                    <Image className="w-4 h-4" />
                    <span>Photo</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                  <Button
                    onClick={handleSubmit}
                    disabled={(!postContent.trim() && !imageFile) || postMutation.isPending || uploading}
                    size="sm"
                    className="bg-emerald-500 hover:bg-emerald-600"
                  >
                    {(postMutation.isPending || uploading) ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publier'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Posts */}
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <Shield className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500">Aucune publication pour ce club</p>
          </div>
        ) : (
          <div className="space-y-4 pb-12">
            {posts.map(post => (
              <PostCard key={post.id} post={post} currentUser={user} onDelete={(id) => {
                base44.entities.Post.delete(id).then(() => {
                  queryClient.invalidateQueries({ queryKey: ['club-posts', clubId] });
                });
              }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}