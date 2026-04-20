import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Loader2, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';

export default function ImportPlayersFile() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState({ imported: 0, total: 0 });

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setStatus(null);
  };

  const handleImport = async () => {
    if (!file) {
      setStatus({ type: 'error', message: 'Sélectionne un fichier CSV ou Excel' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      // Upload le fichier
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = uploadResult.file_url;

      // Extraire les données avec le schéma Player
      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: {
          type: "object",
          properties: {
            players: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  position: { type: "string" },
                  overall: { type: "number" },
                  age: { type: "number" },
                  nationality: { type: "string" },
                  club_name: { type: "string" },
                  value: { type: "number" },
                  image_url: { type: "string" },
                  pace: { type: "number" },
                  shooting: { type: "number" },
                  passing: { type: "number" },
                  dribbling: { type: "number" },
                  defending: { type: "number" },
                  physical: { type: "number" }
                }
              }
            }
          }
        }
      });

      if (extractResult.status === 'error') {
        setStatus({ 
          type: 'error', 
          message: `Erreur d'extraction: ${extractResult.details}` 
        });
        setLoading(false);
        return;
      }

      const players = extractResult.output.players || [];
      
      if (players.length === 0) {
        setStatus({ 
          type: 'error', 
          message: 'Aucun joueur trouvé dans le fichier' 
        });
        setLoading(false);
        return;
      }

      setProgress({ total: players.length, imported: 0 });

      // Normaliser les positions
      const POSITIONS = {
        'GK': 'GK', 'CB': 'CB', 'LB': 'LB', 'RB': 'RB',
        'CDM': 'CDM', 'CM': 'CM', 'CAM': 'CAM',
        'LW': 'LW', 'RW': 'RW', 'ST': 'ST',
        'LM': 'LW', 'RM': 'RW', 'CF': 'ST', 'RF': 'ST', 'LF': 'ST'
      };

      const playersToImport = players.map(p => ({
        name: p.name,
        position: POSITIONS[p.position?.toUpperCase()] || 'CM',
        overall: p.overall || 75,
        age: p.age || 25,
        nationality: p.nationality || 'Unknown',
        club_name: p.club_name || '',
        value: p.value || 1000000,
        image_url: p.image_url || '',
        pace: p.pace || 70,
        shooting: p.shooting || 70,
        passing: p.passing || 70,
        dribbling: p.dribbling || 70,
        defending: p.defending || 70,
        physical: p.physical || 70,
        is_on_transfer_list: true,
        asking_price: p.value || 1000000
      })).filter(p => p.name);

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
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <FileSpreadsheet className="w-8 h-8 text-emerald-500" />
            Importer des Joueurs
          </h1>
          <p className="text-slate-400 mb-8">Upload un fichier CSV ou Excel avec les données des joueurs</p>

          <div className="space-y-6">
            {/* Upload Zone */}
            <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 hover:border-emerald-500 transition-colors cursor-pointer">
              <label className="flex flex-col items-center justify-center cursor-pointer">
                <Upload className="w-12 h-12 text-slate-400 mb-3" />
                <span className="text-white font-semibold">Clique pour sélectionner un fichier</span>
                <span className="text-slate-500 text-sm mt-2">CSV, XLS ou XLSX</span>
                <Input
                  type="file"
                  accept=".csv,.xls,.xlsx"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* File Selected */}
            {file && (
              <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-4">
                <p className="text-white">Fichier: <span className="font-semibold">{file.name}</span></p>
                <p className="text-slate-400 text-sm mt-1">Taille: {(file.size / 1024).toFixed(2)} KB</p>
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
                  Import en cours... {progress.total > 0 && `(${progress.imported}/${progress.total})`}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Importer les Joueurs
                </>
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
                <span className="font-semibold text-white">Format attendu:</span><br/>
                Le fichier doit contenir les colonnes suivantes:<br/>
                • name (obligatoire)<br/>
                • position (GK, CB, LB, RB, CDM, CM, CAM, LW, RW, ST)<br/>
                • overall (note globale)<br/>
                • age, nationality, club_name, value<br/>
                • image_url (URL de la photo)<br/>
                • pace, shooting, passing, dribbling, defending, physical
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}