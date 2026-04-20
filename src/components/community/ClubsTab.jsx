import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Shield, Users } from 'lucide-react';

export default function ClubsTab() {
  const navigate = useNavigate();

  const { data: clubs = [], isLoading } = useQuery({
    queryKey: ['clubs-social'],
    queryFn: () => base44.entities.Club.list('name', 50),
  });

  const { data: posts = [] } = useQuery({
    queryKey: ['posts-all'],
    queryFn: () => base44.entities.Post.list('-created_date', 200),
  });

  const postCountByClub = {};
  posts.forEach(p => {
    if (p.author_club) {
      postCountByClub[p.author_club] = (postCountByClub[p.author_club] || 0) + 1;
    }
  });

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <p className="text-slate-400 text-sm mb-6">Parcourez les profils des clubs et suivez leur actualité</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {clubs.map(club => {
          const count = postCountByClub[club.name] || 0;
          return (
            <button
              key={club.id}
              onClick={() => navigate(`/ClubProfile?club_id=${club.id}`)}
              className="flex flex-col items-center gap-3 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 hover:border-emerald-500/50 hover:bg-slate-800 transition-all group"
            >
              <div className="w-16 h-16 rounded-full border-2 border-slate-600 group-hover:border-emerald-500 overflow-hidden bg-slate-700 flex items-center justify-center transition-all">
                {club.logo_url ? (
                  <img src={club.logo_url} alt={club.name} className="w-full h-full object-contain p-1" />
                ) : (
                  <Shield className="w-8 h-8 text-slate-400" />
                )}
              </div>
              <div className="text-center">
                <p className="text-white font-semibold text-xs leading-tight line-clamp-2">{club.name}</p>
                {club.manager_name && (
                  <p className="text-slate-500 text-xs mt-1">@{club.manager_name}</p>
                )}
              </div>
              <div className="flex items-center gap-1 text-slate-400 text-xs">
                <Users className="w-3 h-3" />
                <span>{count} post{count !== 1 ? 's' : ''}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}