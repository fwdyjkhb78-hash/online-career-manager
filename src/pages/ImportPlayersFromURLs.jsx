import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const POSITIONS = {
  'GK': 'GK', 'CB': 'CB', 'LB': 'LB', 'RB': 'RB',
  'CDM': 'CDM', 'CM': 'CM', 'CAM': 'CAM',
  'LW': 'LW', 'RW': 'RW', 'ST': 'ST',
  'LM': 'LW', 'RM': 'RW', 'CF': 'ST', 'RF': 'ST', 'LF': 'ST'
};

export default function ImportPlayersFromURLs() {
  const navigate = useNavigate();
  const [urls, setUrls] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState({ imported: 0, total: 0 });
  const [user, setUser] = useState(null);
  const [club, setClub] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        if (!userData.club_id) {
          navigate(createPageUrl('SelectClub'));
          return;
        }
        const clubs = await base44.entities.Club.filter({ id: userData.club_id });
        if (clubs.length > 0) {
          setClub(clubs[0]);
        }
      } catch (e) {
        base44.auth.redirectToLogin(createPageUrl('ImportPlayersFromURLs'));
      }
    };
    loadUser();
  }, [navigate]);

  const extractPlayerIdFromUrl = (url) => {
    const match = url.match(/\/player\/(\d+)\//);
    return match ? match[1] : null;
  };

  const scrapePlayer = async (url) => {
    try {
      const playerId = extractPlayerIdFromUrl(url);
      if (!playerId) return null;

      // Appel au backend qui scrape le vrai HTML SoFIFA
      // On garde l'URL d'origine avec le numéro de version (ex: 260006 = 1er avril 2026)
      const response = await base44.functions.invoke('scrapeSofifa', { url });
      const result = response.data?.player;

      if (!result) return null;

      // Image sofifa
      const versionMatch = url.match(/\/(\d{6})\/?$/) || url.match(/\/(\d{6})\//); 
      const version = versionMatch ? versionMatch[1] : '260006';
      const imageUrl = `https://cdn.sofifa.net/players/${playerId}/${version}_120.png`;

      const player = {
        name: result.name || 'Unknown',
        position: POSITIONS[result.position?.toUpperCase()] || 'CM',
        overall: result.overall || 70,
        potential: result.potential || result.overall || 70,
        age: result.age || 25,
        nationality: result.nationality || '',
        club_id: user?.club_id || '',
        club_name: club?.name || '',
        value: result.value || 0,
        release_clause: result.release_clause || 0,
        image_url: imageUrl,
        pace: result.pace || 75,
        shooting: result.shooting || 75,
        passing: result.passing || 75,
        dribbling: result.dribbling || 75,
        defending: result.defending || 75,
        physical: result.physical || 75,
        is_on_transfer_list: false,
        asking_price: null
      };

      return player;
    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
      return null;
    }
  };

  const handleImport = async () => {
    if (!user || !club) {
      setStatus({ type: 'error', message: 'Erreur de chargement du club' });
      return;
    }

    const urlList = urls
      .split('\n')
      .map(u => u.trim())
      .filter(u => u && u.startsWith('https://sofifa.com'));

    if (urlList.length === 0) {
      setStatus({ type: 'error', message: 'Aucune URL valide trouvée' });
      return;
    }

    setLoading(true);
    setStatus(null);
    setProgress({ total: urlList.length, imported: 0 });

    try {
      const playersToImport = [];

      // Scraper tous les joueurs
      for (let i = 0; i < urlList.length; i++) {
        const player = await scrapePlayer(urlList[i]);
        if (player) {
          playersToImport.push(player);
        }
        setProgress({ total: urlList.length, imported: i + 1 });
      }

      // Importer par batches de 50
      if (playersToImport.length > 0) {
        for (let i = 0; i < playersToImport.length; i += 50) {
          const batch = playersToImport.slice(i, i + 50);
          await base44.entities.Player.bulkCreate(batch);
        }

        setStatus({
          type: 'success',
          message: `${playersToImport.length} joueurs importés avec succès dans ${club.name}!`
        });
        setUrls('');
        setTimeout(() => navigate(createPageUrl('MyClub')), 2000);
      } else {
        setStatus({
          type: 'error',
          message: 'Aucun joueur valide trouvé'
        });
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: `Erreur: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-slate-800/50 backdrop-blur-lg border border-slate-700 rounded-2xl p-8">
          <h1 className="text-3xl font-bold text-white mb-2">Importer des Joueurs depuis URLs</h1>
          <p className="text-slate-400 mb-8">Colle les URLs sofifa.com (une par ligne)</p>

          <div className="space-y-6">
            {/* URL Input */}
            <Textarea
              placeholder={`https://sofifa.com/player/231747/kylian-mbappe/260006/\nhttps://sofifa.com/player/209331/mohamed-salah/260006/\n...`}
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              disabled={loading}
              className="h-48 bg-slate-700 border-slate-600 text-white placeholder-slate-500"
            />

            {/* Import Button */}
            <Button
              onClick={handleImport}
              disabled={!urls.trim() || loading}
              size="lg"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Import en cours... ({progress.imported}/{progress.total})
                </>
              ) : (
                'Importer les Joueurs'
              )}
            </Button>

            {/* Status Messages */}
            {status && (
              <div className={`flex items-start gap-3 p-4 rounded-lg ${
                status.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30'
                  : 'bg-red-500/10 border border-red-500/30'
              }`}>
                {status.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                )}
                <p className={status.type === 'success' ? 'text-emerald-400' : 'text-red-400'}>
                  {status.message}
                </p>
              </div>
            )}

            {/* Info */}
            <div className="bg-slate-700/20 border border-slate-600 rounded-lg p-4">
              <p className="text-slate-400 text-sm">
                <span className="font-semibold text-white">Note:</span><br/>
                • Colle une ou plusieurs URLs sofifa.com<br/>

                • L'import récupère: nom, note, potentiel, image, valeur, clause de libération, poste et stats<br/>
                • L'import peut prendre quelques minutes
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}