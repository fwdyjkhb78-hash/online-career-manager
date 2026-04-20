import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Gavel } from 'lucide-react';
import AuctionCard from './AuctionCard';
import CreateAuctionForm from './CreateAuctionForm';

const STAFF_ROLES = ['owner', 'admin', 'staff_mercato', 'staff_championnat', 'staff_developpement', 'staff_formation'];

const POSITIONS = ['GK','CB','LB','RB','CDM','CM','CAM','LW','RW','ST'];

export default function AuctionTab({ currentUser }) {
  const queryClient = useQueryClient();
  const isStaff = currentUser && STAFF_ROLES.includes(currentUser.role);
  const hasClub = currentUser?.has_selected_club;
  const [showForm, setShowForm] = useState(false);

  const { data: auctions = [], isLoading } = useQuery({
    queryKey: ['auctions'],
    queryFn: async () => {
      try {
        return await base44.entities.Auction.list('-created_date', 100);
      } catch (e) {
        return [];
      }
    },
    refetchInterval: 30000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const active = auctions.filter(a => a.status === 'active' && (!a.ends_at || new Date(a.ends_at) > new Date()));
  // Les enchères completed sont affichées dans l'onglet Officialisations, pas ici
  const closed = auctions.filter(a => a.status !== 'completed' && (a.status !== 'active' || (a.ends_at && new Date(a.ends_at) <= new Date())));



  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-emerald-500 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Create auction */}
      {(isStaff || hasClub) && (
        <div className="flex justify-end">
          <Button onClick={() => setShowForm(!showForm)} size="sm" className="bg-emerald-500 hover:bg-emerald-600">
            <Plus className="w-4 h-4 mr-1" /> Nouvelle enchère
          </Button>
        </div>
      )}

      {showForm && currentUser && (
        <CreateAuctionForm 
          currentUser={currentUser}
          onSuccess={() => setShowForm(false)}
        />
      )}

      {/* Active */}
      {active.length > 0 && (
        <div className="space-y-4">
          <p className="text-emerald-400 font-semibold text-sm flex items-center gap-2"><Gavel className="w-4 h-4" />Enchères en cours ({active.length})</p>
          {active.map(a => <AuctionCard key={a.id} auction={a} currentUser={currentUser} />)}
        </div>
      )}

      {active.length === 0 && closed.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <Gavel className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucune enchère pour le moment.</p>
        </div>
      )}

      {/* Closed */}
      {closed.length > 0 && (
        <div className="space-y-4">
          <p className="text-slate-500 font-semibold text-sm">Enchères terminées ({closed.length})</p>
          {closed.map(a => <AuctionCard key={a.id} auction={a} currentUser={currentUser} />)}
        </div>
      )}
    </div>
  );
}