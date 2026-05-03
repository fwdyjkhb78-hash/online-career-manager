import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, ArrowRightLeft, Shield, Users } from 'lucide-react';

const MOBILE_NAV_ITEMS = [
  { name: 'Accueil', page: 'Home', icon: Home },
  { name: 'Mercato', page: 'TransferMarket', icon: ArrowRightLeft },
  { name: 'Mon Club', page: 'ClubSpace', icon: Shield },
  { name: 'Communauté', page: 'Community', icon: Users },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const currentPage = location.pathname.replace('/', '') || 'Home';

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-800 md:hidden z-40">
      <div className="flex items-center justify-around h-16 safe-area-bottom">
        {MOBILE_NAV_ITEMS.map((item) => {
          const isActive = currentPage === item.page;
          return (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 text-xs font-medium transition-colors ${
                isActive
                  ? 'text-emerald-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px]">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}