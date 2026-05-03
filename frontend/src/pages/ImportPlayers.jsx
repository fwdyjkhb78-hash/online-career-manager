import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const POSITIONS = {
  'GK': 'GK', 'CB': 'CB', 'LB': 'LB', 'RB': 'RB',
  'CDM': 'CDM', 'CM': 'CM', 'CAM': 'CAM',
  'LW': 'LW', 'RW': 'RW', 'ST': 'ST',
  'LM': 'LW', 'RM': 'RW', 'CF': 'ST', 'RF': 'ST', 'LF': 'ST'
};

export default function ImportPlayers() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState({ imported: 0, total: 0 });

  const parseCSV = (text) => {
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const players = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',').map(v => v.trim());
      const player = {};
      
      headers.forEach((header, idx) => {
        player[header] = values[idx];
      });

      players.push(player);
    }

    return players;
  };

  const mapPlayer = (csvPlayer) => {
    // Cherche les en-têtes avec différentes variantes
    const getField = (keys) => {
      for (const key of keys) {
        if (csvPlayer[key]) return csvPlayer[key];
      }
      return null;
    };

    const name = getField(['name', 'player name', 'player_name', 'Name']);
    const pos = getField(['position', 'pos', 'Position', 'Pos']);
    const overall = parseInt(getField(['overall', 'overall rating', 'ovr', 'Overall', 'OVR'])) || 0;
    const age = parseInt(getField(['age', 'Age'])) || 0;
    const nationality = getField(['nationality', 'nation', 'Nationality', 'Nation']) || '';
    const club = getField(['team', 'club', 'team & contract', 'Team', 'Club']) || '';
    
    if (!name) return null;

    const position = POSITIONS[pos?.toUpperCase()] || 'CM';
    const playerValue = parseInt(getField(['value', 'Value'])?.replace(/[€M,]/g, '') || 0) * 1000000;

    return {
      name,
      position,
      overall,
      age,
      nationality,
      club_name: club.split('\n')[0] || '',
      value: playerValue || 100000,
      image_url: getField(['photo_url', 'image', 'photo', 'Photo URL', 'photo url']) || '',
      pace: parseInt(getField(['pace', 'Pace'])) || 75,
      shooting: parseInt(getField(['shooting', 'Shooting'])) || 75,
      passing: parseInt(getField(['passing', 'Passing'])) || 75,
      dribbling: parseInt(getField(['dribbling', 'Dribbling'])) || 75,
      defending: parseInt(getField(['defending', 'defense', 'Defense', 'Defending'])) || 75,
      physical: parseInt(getField(['physical', 'Physical'])) || 75,
      is_on_transfer_list: true,
      asking_price: playerValue || 100000
    };
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleImport = async () => {
    if (!file) {
      setStatus({ type: 'error', message: 'Sélectionne un fichier CSV' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const text = await file.text();
      const csvPlayers = parseCSV(text);
      const playersToImport = csvPlayers
        .map(mapPlayer)
        .filter(p => p !== null);

      if (playersToImport.length === 0) {
        setStatus({ 
          type: 'error', 
          message: 'Aucun joueur valide trouvé (données manquantes)' 
        });
        setLoading(false);
        return;
      }

      setProgress({ total: playersToImport.length, imported: 0 });

      // Importer tous les joueurs
      await base44.entities.Player.bulkCreate(playersToImport);
      setProgress({ total: playersToImport.length, imported: playersToImport.length });

      setStatus({ 
        type: 'success', 
        message: `${playersToImport.length} joueurs importés avec succès!` 
      });
      setFile(null);
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
          <h1 className="text-3xl font-bold text-white mb-2">Importer des Joueurs</h1>
          <p className="text-slate-400 mb-8">Upload un fichier CSV de sofifa.com avec les joueurs</p>

          <div className="space-y-6">
            {/* Upload Zone */}
            <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 hover:border-emerald-500 transition-colors cursor-pointer">
              <label className="flex flex-col items-center justify-center cursor-pointer">
                <Upload className="w-12 h-12 text-slate-400 mb-3" />
                <span className="text-white font-semibold">Clique pour sélectionner un CSV</span>
                <span className="text-slate-500 text-sm mt-2">ou drag & drop</span>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* File Selected */}
            {file && (
              <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-4">
                <p className="text-white">Fichier: <span className="font-semibold">{file.name}</span></p>
              </div>
            )}

            {/* Import Button */}
            <Button
              onClick={handleImport}
              disabled={!file || loading}
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

            {/* Instructions */}
            <div className="bg-slate-700/20 border border-slate-600 rounded-lg p-4">
              <p className="text-slate-400 text-sm">
                <span className="font-semibold text-white">Instructions:</span><br/>
                1. Va sur sofifa.com/players<br/>
                2. Ajoute un filtre "Overall ≥ 65"<br/>
                3. Télécharge le CSV (clic droit sur le tableau)<br/>
                4. Upload le fichier ici
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}