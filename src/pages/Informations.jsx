import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Info, Flame, BookOpen } from 'lucide-react';
import AnnouncementTab from '@/components/community/AnnouncementTab';

const INFO_SUBTABS = [
  { id: 'news', label: 'Annonces', icon: Flame },
  { id: 'rules', label: 'Règles', icon: BookOpen },
  { id: 'presentation', label: 'Présentation', icon: Info },
];

export default function Informations() {
  const [user, setUser] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('news');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10" />
        <div className="relative max-w-3xl mx-auto px-4 py-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center mb-4">
            <Info className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Informations</h1>
          <p className="text-slate-400">Annonces, règles et présentation de la SuperLigue</p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="border-b border-slate-800 sticky top-16 z-10 bg-slate-950/90 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {INFO_SUBTABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
                  activeSubTab === tab.id
                    ? 'border-blue-400 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <AnnouncementTab tabType={activeSubTab} currentUser={user} />
      </div>
    </div>
  );
}