import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import NavigationTracker from '@/lib/NavigationTracker';
import { pagesConfig } from './pages.config';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import StaffRoom from './pages/StaffRoom';
import ImportPlayersFile from './pages/ImportPlayersFile';
import Tactics from './pages/Tactics';
import Notifications from './pages/Notifications';
import Support from './pages/Support';
import Informations from './pages/Informations';
import ClubProfile from './pages/ClubProfile';
import NationalTeamSpace from './pages/NationalTeamSpace';
import Settings from './pages/Settings';
import Login from './pages/Login';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) =>
  Layout ? (
    <Layout currentPageName={currentPageName}>{children}</Layout>
  ) : (
    <>{children}</>
  );

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950" data-testid="app-loading">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/StaffRoom" element={<LayoutWrapper currentPageName="StaffRoom"><StaffRoom /></LayoutWrapper>} />
      <Route path="/ImportPlayersFile" element={<LayoutWrapper currentPageName="ImportPlayersFile"><ImportPlayersFile /></LayoutWrapper>} />
      <Route path="/Tactics" element={<LayoutWrapper currentPageName="Tactics"><Tactics /></LayoutWrapper>} />
      <Route path="/Notifications" element={<LayoutWrapper currentPageName="Notifications"><Notifications /></LayoutWrapper>} />
      <Route path="/Support" element={<LayoutWrapper currentPageName="Support"><Support /></LayoutWrapper>} />
      <Route path="/Informations" element={<LayoutWrapper currentPageName="Informations"><Informations /></LayoutWrapper>} />
      <Route path="/ClubProfile" element={<LayoutWrapper currentPageName="ClubProfile"><ClubProfile /></LayoutWrapper>} />
      <Route path="/NationalTeamSpace" element={<LayoutWrapper currentPageName="NationalTeamSpace"><NationalTeamSpace /></LayoutWrapper>} />
      <Route path="/Settings" element={<LayoutWrapper currentPageName="Settings"><Settings /></LayoutWrapper>} />
      <Route path="/Dashboard" element={<Navigate to="/ClubSpace" replace />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <SonnerToaster position="top-right" richColors />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
