import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from 'sonner';
import { Image, RefreshCw, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function UpdatePhotosTab() {
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState(null);
  const runningRef = useRef(false);

  const { data: players = [], refetch } = useQuery({
    queryKey: ['players-photos-tab'],
    queryFn: () => base44.entities.Player.list(),
  });

  // Auto-start on mount
  useEffect(() => {
    handleStart();
  }, []);

  const handleStart = async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setRunning(true);
    setStats({ total: 0, processed: 0, updated: 0, failed: 0 });

    let offset = 0;
    let totalUpdated = 0;
    let totalFailed = 0;

    while (runningRef.current) {
      try {
        const res = await base44.functions.invoke('autoUpdateAllPhotos', { offset });
        const data = res.data;

        if (data.error) {
          toast.error('Erreur: ' + data.error);
          break;
        }

        totalUpdated += data.updated || 0;
        totalFailed += data.failed || 0;
        offset = data.offset;

        setStats({
          total: data.total,
          processed: offset,
          updated: totalUpdated,
          failed: totalFailed
        });

        if (data.done) break;
      } catch (e) {
        toast.error('Erreur: ' + e.message);
        break;
      }
    }

    runningRef.current = false;
    setRunning(false);
    refetch();
    toast.success(`Photos mises à jour : ${totalUpdated} succès, ${totalFailed} échouées`);
  };

  const progress = stats && stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Image className="w-5 h-5 text-emerald-400" />
            Mise à jour automatique des photos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-slate-800 rounded-lg text-sm text-slate-300">
            {players.length > 0 && (
              <span><span className="text-white font-bold">{players.length}</span> joueurs au total</span>
            )}
          </div>

          {running ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Mise à jour en cours, ne pas fermer cette page...</span>
              </div>
              <Progress value={progress} className="h-3" />
              <div className="flex justify-between text-xs text-slate-400">
                <span>{stats?.processed || 0} / {stats?.total || 0} traités ({progress}%)</span>
              </div>
              {stats && (
                <div className="flex gap-4 text-sm">
                  <span className="text-emerald-400"><CheckCircle className="w-4 h-4 inline mr-1" />{stats.updated} OK</span>
                  <span className="text-red-400"><XCircle className="w-4 h-4 inline mr-1" />{stats.failed} échouées</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {stats && (
                <div className="p-4 bg-slate-800 rounded-lg">
                  <p className="text-sm text-slate-300 mb-2">Dernière mise à jour :</p>
                  <div className="flex gap-4 text-sm">
                    <span className="text-emerald-400"><CheckCircle className="w-4 h-4 inline mr-1" /><strong>{stats.updated}</strong> photos mises à jour</span>
                    <span className="text-red-400"><XCircle className="w-4 h-4 inline mr-1" /><strong>{stats.failed}</strong> échouées</span>
                  </div>
                </div>
              )}
              <Button onClick={handleStart} className="w-full bg-emerald-500 hover:bg-emerald-600">
                <RefreshCw className="w-4 h-4 mr-2" />
                Relancer la mise à jour
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}