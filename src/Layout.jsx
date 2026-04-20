import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Trophy, ArrowRightLeft, Shield, Users,
  Menu, X, LogOut, User, ChevronDown, Crown, Swords, Bell, TicketIcon, Info } from
'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import ErrorBoundary from '@/components/ErrorBoundary';

const staffRoles = ['owner', 'admin', 'staff_mercato', 'staff_annonces', 'staff_championnat', 'staff_developpement', 'staff_formation'];

const navItems = [
{ name: 'Accueil', page: 'Home', icon: Home },
{ name: 'Classement', page: 'League', icon: Trophy },
{ name: 'Mercato', page: 'TransferMarket', icon: ArrowRightLeft },
{ name: 'Communauté', page: 'Community', icon: Users },
{ name: 'Mon Club', page: 'ClubSpace', icon: Shield, clubOnly: true },
{ name: 'Tactiques', page: 'Tactics', icon: Swords, clubOnly: true },
{ name: 'Staff', page: 'StaffRoom', icon: Crown, staffOnly: true },
{ name: 'Informations', page: 'Informations', icon: Info },
{ name: 'Notifications', page: 'Notifications', icon: Bell, authOnly: true },
{ name: 'Support', page: 'Support', icon: TicketIcon, authOnly: true }];


export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setIsNavigating(false);
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        // Mettre à jour last_seen
        await base44.auth.updateMe({ last_seen: new Date().toISOString() });
      } catch (e) {

        // Not logged in
      }};
    loadUser();

    // Heartbeat toutes les 60s
    const heartbeat = setInterval(async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) await base44.auth.updateMe({ last_seen: new Date().toISOString() });
      } catch (e) {}
    }, 60000);
    return () => clearInterval(heartbeat);
  }, [currentPageName]);

  const handleNavigation = (callback) => {
    if (isNavigating) return;
    setIsNavigating(true);
    callback();
    setTimeout(() => setIsNavigating(false), 300);
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  const handleLogin = () => {
    base44.auth.redirectToLogin();
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-lg border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={createPageUrl('Home')} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg overflow-hidden">
                <img src="https://media.base44.com/images/public/69790b43349a3dc5b9facd93/23515486b_IMG_3759.jpeg" alt="OCM" className="w-full h-full object-cover" />
              </div>
              <span className="text-white font-bold text-lg hidden sm:block">OCM

              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-0.5">
              {navItems.filter((item) => {
                if (item.staffOnly) return staffRoles.includes(user?.role);
                if (item.clubOnly) return !!(user?.has_selected_club || user?.club_id);
                if (item.authOnly) return !!user;
                return true;
              }).map((item) => {
                const isActive = currentPageName === item.page;
                return (
                  <Link key={item.page} to={createPageUrl(item.page)} onClick={() => !isNavigating && setMobileMenuOpen(false)}>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isNavigating}
                      className={`text-xs px-2 py-1 h-8 ${
                      isActive ?
                      'bg-emerald-500/10 text-emerald-400' :
                      'text-slate-400 hover:text-white hover:bg-slate-800'}
                      `}>
                      
                      <item.icon className="w-3.5 h-3.5 mr-1" />
                      {item.name}
                    </Button>
                  </Link>);

              })}
            </div>
            <div className="flex items-center gap-3">
              {user ?
              <>
                  <NotificationBell userId={user.id} />
                  {(user.has_selected_club || user.club_id) &&
                <Link to={createPageUrl('ClubSpace')}>
                      <Button
                    variant="outline"
                    size="sm"
                    className={`
                          border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10
                          ${currentPageName === 'ClubSpace' ? 'bg-emerald-500/10' : ''}
                        `}>
                    
                        <Shield className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">{user.club_name}</span>
                        <span className="sm:hidden">Mon Espace</span>
                      </Button>
                    </Link>
                }

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-slate-400">
                        <User className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">{user.full_name}</span>
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-slate-800 border-slate-700 text-white">
                      <DropdownMenuItem className="text-slate-400 focus:bg-slate-700">
                        <User className="w-4 h-4 mr-2" />
                        {user.email}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-slate-700" />
                      {!user.has_selected_club && !user.club_id &&
                    <DropdownMenuItem
                      onClick={() => navigate(createPageUrl('SelectClub'))}
                      className="focus:bg-slate-700">
                      
                          <Shield className="w-4 h-4 mr-2" />
                          Choisir un club
                        </DropdownMenuItem>
                    }
                      <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-red-400 focus:bg-red-500/10 focus:text-red-400">
                      
                        <LogOut className="w-4 h-4 mr-2" />
                        Déconnexion
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </> :

              <Button
                onClick={handleLogin}
                size="sm"
                className="bg-emerald-500 hover:bg-emerald-600 text-white">
                
                  Connexion
                </Button>
              }

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-slate-400"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen &&
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-slate-800 bg-slate-900">
            
              <div className="px-4 py-4 space-y-2">
                {navItems.filter((item) => {
                if (item.staffOnly) return staffRoles.includes(user?.role);
                if (item.clubOnly) return !!(user?.has_selected_club || user?.club_id);
                if (item.authOnly) return !!user;
                return true;
              }).map((item) => {
                const isActive = currentPageName === item.page;
                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    onClick={() => !isNavigating && setMobileMenuOpen(false)}>
                    
                      <Button
                      variant="ghost"
                      disabled={isNavigating}
                      className={`
                          w-full justify-start
                          ${isActive ?
                      'bg-emerald-500/10 text-emerald-400' :
                      'text-slate-400 hover:text-white hover:bg-slate-800'}
                        `}>
                      
                        <item.icon className="w-4 h-4 mr-2" />
                        {item.name}
                      </Button>
                    </Link>);

              })}
              </div>
            </motion.div>
          }
        </AnimatePresence>
      </nav>

      {/* Main Content wrapped in ErrorBoundary */}
      <main className="pt-16">
        <ErrorBoundary key={currentPageName}>
          {children}
        </ErrorBoundary>
      </main>
    </div>);

}