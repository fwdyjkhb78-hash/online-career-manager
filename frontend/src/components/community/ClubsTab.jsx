import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Search, Building2 } from 'lucide-react';
import { Input } from "@/components/ui/input";

export default function ClubsTab() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: clubs = [], isLoading: loadingClubs } = useQuery({
    queryKey: ['clubs-social'],
    queryFn: () => base44.entities.Club.list('name', 200),
  });

  const { data: sansLigueClubs = [], isLoading: loadingSansLigue } = useQuery({
    queryKey: ['sans-ligue-clubs-community'],
    queryFn: () => base44.entities.SansLigueClub.filter({ is_active: true }, 'name', 500),
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

  const q = search.toLowerCase();

  const filteredClubs = clubs.filter(c =>
    c.name.toLowerCase().includes(q) ||
    (c.manager_name && c.manager_name.toLowerCase().includes(q))
  );

  const filteredSansLigue = sansLigueClubs.filter(c =>
    c.name.toLowerCase().includes(q) ||
    (c.country && c.country.toLowerCase().includes(q))
  );

  const isLoading = loadingClubs || loadingSansLigue;

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      {/* Search bar */}
      <div className="flex items-center gap-4 mb-6">
        <p className="text-slate-400 text-sm">Clubs en ligue et hors-ligue</p>
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un club..."
            className="bg-slate-800 border-slate-700 text-white pl-10 w-64"
          />
        </div>
      </div>

      {/* Clubs en ligue */}
      {filteredClubs.length > 0 && (
        <div className="mb-8">
          <h2 className="text-white font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            Clubs en Ligue ({filteredClubs.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredClubs.map(club => {
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
      )}

      {/* Clubs Hors-Ligue */}
      {filteredSansLigue.length > 0 && (
        <div>
          <h2 className="text-white font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-400" />
            Clubs Hors-Ligue ({filteredSansLigue.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filteredSansLigue.map(club => (
              <div
                key={club.id}
                className="flex flex-col items-center gap-2 bg-slate-800/40 border border-slate-700/30 rounded-xl p-4"
              >
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                  {club.logo_url ? (
                    <img src={club.logo_url} alt={club.name} className="w-full h-full object-contain rounded-full" />
                  ) : (
                    <Building2 className="w-5 h-5 text-blue-400" />
                  )}
                </div>
                <div className="text-center">
                  <p className="text-white text-xs font-medium leading-tight line-clamp-2">{club.name}</p>
                  {club.country && <p className="text-slate-500 text-xs mt-0.5">{club.country}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {filteredClubs.length === 0 && filteredSansLigue.length === 0 && (
        <div className="text-center py-16 text-slate-500">Aucun club trouvé pour « {search} »</div>
      )}
    </div>
  );
}