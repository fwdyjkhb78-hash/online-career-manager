import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Loader2, Link, Plus, Trash2, Send, X } from 'lucide-react';
import { toast } from 'sonner';

const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];

const emptyPlayer = () => ({
  name: '',
  position: 'ST',
  club_id: '',
  overall: 75,
  potential: 80,
  age: 25,
  nationality: 'France',
  value: 10000000,
  release_clause: 0,
  image_url: '',
});

// Extrait l'ID sofifa depuis une URL comme https://sofifa.com/player/158023/...
function parseSofifaId(url) {
  const match = url.match(/sofifa\.com\/player\/(\d+)/);
  return match ? match[1] : null;
}

function sofifaImageUrl(playerId) {
  return `https://cdn.sofifa.net/players/${playerId}/25_120.png`;
}

export default function CreatePlayerTab() {
  const queryClient = useQueryClient();

  // --- Onglet Manuel ---
  const [queue, setQueue] = useState([emptyPlayer()]);
  const [defaultClubId, setDefaultClubId] = useState('');

  // --- Onglet SoFIFA ---
  const [sofifaLinks, setSofifaLinks] = useState('');
  const [sofifaClubId, setSofifaClubId] = useState('');
  const [parsedPlayers, setParsedPlayers] = useState([]);
  const [isFetching, setIsFetching] = useState(false);

  const { data: clubs = [] } = useQuery({
    queryKey: ['clubs-staff'],
    queryFn: () => base44.entities.Club.list(),
  });

  const bulkCreateMutation = useMutation({
    mutationFn: async (players) => {
      for (const p of players) {
        await base44.entities.Player.create(p);
      }
    },
    onSuccess: (_, players) => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['all-players-staff'] });
      toast.success(`${players.length} joueur(s) créé(s) avec succès`);
      setQueue([emptyPlayer()]);
      setParsedPlayers([]);
      setSofifaLinks('');
    },
    onError: () => toast.error('Erreur lors de la création'),
  });

  // ---- Manuel ----
  const updatePlayer = (index, field, value) => {
    const updated = [...queue];
    updated[index] = { ...updated[index], [field]: value };
    setQueue(updated);
  };

  const addRow = () => setQueue([...queue, emptyPlayer()]);

  const removeRow = (index) => {
    if (queue.length === 1) return;
    setQueue(queue.filter((_, i) => i !== index));
  };

  const submitManual = () => {
    const valid = queue.filter(p => p.name.trim());
    if (!valid.length) return toast.error('Ajoutez au moins un joueur avec un nom');
    const selectedClub = clubs.find(c => c.id === defaultClubId);
    const toCreate = valid.map(p => {
      const club = clubs.find(c => c.id === p.club_id) || selectedClub;
      return {
        ...p,
        overall: Number(p.overall),
        potential: Number(p.potential) || Number(p.overall),
        age: Number(p.age),
        value: Number(p.value),
        release_clause: Number(p.release_clause) || 0,
        club_id: club?.id || '',
        club_name: club?.name || '',
        pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70,
      };
    });
    bulkCreateMutation.mutate(toCreate);
  };

  // ---- SoFIFA ----
  const handleParseSofifa = async () => {
    const urls = sofifaLinks.split('\n').map(l => l.trim()).filter(Boolean);
    if (!urls.length) return toast.error('Collez au moins un lien SoFIFA');
    setIsFetching(true);
    try {
      const results = await Promise.all(urls.map(async (url) => {
        const playerId = parseSofifaId(url);
        if (!playerId) return null;
        // Appel LLM pour extraire les infos du joueur via son URL SoFIFA
        const res = await base44.integrations.Core.InvokeLLM({
          prompt: `Extrait les informations du joueur de football depuis cette page SoFIFA: ${url}
          Renvoie exactement ce JSON (sans commentaires):
          {
            "name": "Nom complet du joueur",
            "position": "une de: GK, CB, LB, RB, CDM, CM, CAM, LW, RW, ST",
            "overall": nombre entier,
            "potential": nombre entier (potentiel maximum du joueur),
            "age": nombre entier,
            "nationality": "nationalité en français",
            "value": valeur marchande en euros (nombre entier),
            "release_clause": clause libératoire en euros (nombre entier, 0 si absente),
            "pace": nombre entier,
            "shooting": nombre entier,
            "passing": nombre entier,
            "dribbling": nombre entier,
            "defending": nombre entier,
            "physical": nombre entier
          }`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              name: { type: "string" },
              position: { type: "string" },
              overall: { type: "number" },
              potential: { type: "number" },
              age: { type: "number" },
              nationality: { type: "string" },
              value: { type: "number" },
              release_clause: { type: "number" },
              pace: { type: "number" },
              shooting: { type: "number" },
              passing: { type: "number" },
              dribbling: { type: "number" },
              defending: { type: "number" },
              physical: { type: "number" },
            }
          }
        });
        return {
          ...res,
          image_url: sofifaImageUrl(playerId),
          club_id: sofifaClubId,
        };
      }));
      const valid = results.filter(Boolean);
      setParsedPlayers(valid);
      if (valid.length) toast.success(`${valid.length} joueur(s) importé(s) depuis SoFIFA`);
      else toast.error('Aucun joueur reconnu');
    } catch (e) {
      toast.error('Erreur lors de la récupération SoFIFA');
    } finally {
      setIsFetching(false);
    }
  };

  const updateParsed = (index, field, value) => {
    const updated = [...parsedPlayers];
    updated[index] = { ...updated[index], [field]: value };
    setParsedPlayers(updated);
  };

  const removeParsed = (index) => setParsedPlayers(parsedPlayers.filter((_, i) => i !== index));

  const submitSofifa = () => {
    if (!parsedPlayers.length) return;
    const selectedClub = clubs.find(c => c.id === sofifaClubId);
    const toCreate = parsedPlayers.map(p => {
      const club = clubs.find(c => c.id === p.club_id) || selectedClub;
      return {
        ...p,
        overall: Number(p.overall),
        age: Number(p.age),
        value: Number(p.value),
        club_id: club?.id || '',
        club_name: club?.name || '',
      };
    });
    bulkCreateMutation.mutate(toCreate);
  };

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Créer des Joueurs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="manual">
          <TabsList className="bg-slate-800 border-slate-700 mb-4">
            <TabsTrigger value="manual" className="data-[state=active]:bg-slate-700 text-slate-300">
              Manuel
            </TabsTrigger>
            <TabsTrigger value="sofifa" className="data-[state=active]:bg-slate-700 text-slate-300">
              <Link className="w-4 h-4 mr-1" /> Import SoFIFA
            </TabsTrigger>
          </TabsList>

          {/* ===== ONGLET MANUEL ===== */}
          <TabsContent value="manual" className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-400 shrink-0">Club par défaut :</label>
              <Select value={defaultClubId} onValueChange={setDefaultClubId}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white w-48">
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value={null} className="text-white">Sans club</SelectItem>
                  {clubs.map(c => (
                    <SelectItem key={c.id} value={c.id} className="text-white">{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              {queue.map((player, index) => (
                <div key={index} className="bg-slate-800 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-400 text-xs font-medium">Joueur #{index + 1}</span>
                    {queue.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => removeRow(index)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="col-span-2">
                      <Input
                        placeholder="Nom"
                        value={player.name}
                        onChange={e => updatePlayer(index, 'name', e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white text-sm"
                      />
                    </div>
                    <Select value={player.position} onValueChange={v => updatePlayer(index, 'position', v)}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {POSITIONS.map(p => <SelectItem key={p} value={p} className="text-white">{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={player.club_id} onValueChange={v => updatePlayer(index, 'club_id', v)}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-sm">
                        <SelectValue placeholder="Club" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value={null} className="text-white">Défaut</SelectItem>
                        {clubs.map(c => <SelectItem key={c.id} value={c.id} className="text-white">{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number" placeholder="Overall" min="1" max="99"
                      value={player.overall}
                      onChange={e => updatePlayer(index, 'overall', e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white text-sm"
                    />
                    <Input
                      type="number" placeholder="Potentiel" min="1" max="99"
                      value={player.potential}
                      onChange={e => updatePlayer(index, 'potential', e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white text-sm"
                    />
                    <Input
                      type="number" placeholder="Âge" min="16" max="45"
                      value={player.age}
                      onChange={e => updatePlayer(index, 'age', e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white text-sm"
                    />
                    <Input
                      placeholder="Nationalité"
                      value={player.nationality}
                      onChange={e => updatePlayer(index, 'nationality', e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white text-sm"
                    />
                    <Input
                      type="number" placeholder="Valeur €"
                      value={player.value}
                      onChange={e => updatePlayer(index, 'value', e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white text-sm"
                    />
                    <Input
                      type="number" placeholder="Clause libératoire €"
                      value={player.release_clause || ''}
                      onChange={e => updatePlayer(index, 'release_clause', e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white text-sm"
                    />
                    <div className="col-span-2 md:col-span-4">
                      <Input
                        placeholder="URL photo (optionnel)"
                        value={player.image_url}
                        onChange={e => updatePlayer(index, 'image_url', e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={addRow} className="border-slate-600 text-slate-300 flex-1">
                <Plus className="w-4 h-4 mr-2" /> Ajouter un joueur
              </Button>
              <Button
                onClick={submitManual}
                disabled={bulkCreateMutation.isPending}
                className="bg-emerald-500 hover:bg-emerald-600 flex-1"
              >
                {bulkCreateMutation.isPending
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Création...</>
                  : <><Send className="w-4 h-4 mr-2" />Créer {queue.filter(p => p.name).length} joueur(s)</>
                }
              </Button>
            </div>
          </TabsContent>

          {/* ===== ONGLET SOFIFA ===== */}
          <TabsContent value="sofifa" className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Club d'affectation (optionnel)</label>
                <Select value={sofifaClubId} onValueChange={setSofifaClubId}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Sans club" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value={null} className="text-white">Sans club</SelectItem>
                    {clubs.map(c => (
                      <SelectItem key={c.id} value={c.id} className="text-white">{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-2 block">
                  Liens SoFIFA <span className="text-slate-500">(un par ligne)</span>
                </label>
                <textarea
                  value={sofifaLinks}
                  onChange={e => setSofifaLinks(e.target.value)}
                  placeholder={"https://sofifa.com/player/158023/lionel-messi\nhttps://sofifa.com/player/20801/cristiano-ronaldo"}
                  rows={5}
                  className="w-full bg-slate-800 border border-slate-700 rounded-md text-white text-sm p-3 placeholder-slate-500 resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <Button
                onClick={handleParseSofifa}
                disabled={isFetching || !sofifaLinks.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isFetching
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Récupération en cours...</>
                  : <><Link className="w-4 h-4 mr-2" />Récupérer les joueurs</>
                }
              </Button>
            </div>

            {parsedPlayers.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm font-medium">{parsedPlayers.length} joueur(s) trouvé(s) — vérifiez avant de créer :</span>
                </div>
                {parsedPlayers.map((player, index) => (
                  <div key={index} className="bg-slate-800 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-3">
                      {player.image_url && (
                        <img src={player.image_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0"
                          onError={e => e.target.style.display = 'none'} />
                      )}
                      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                        <Input
                          value={player.name}
                          onChange={e => updateParsed(index, 'name', e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white text-sm"
                          placeholder="Nom"
                        />
                        <Select value={player.position} onValueChange={v => updateParsed(index, 'position', v)}>
                          <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            {POSITIONS.map(p => <SelectItem key={p} value={p} className="text-white">{p}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Nationalité"
                          value={player.nationality || ''}
                          onChange={e => updateParsed(index, 'nationality', e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white text-sm"
                        />
                        <Select value={player.club_id || ''} onValueChange={v => updateParsed(index, 'club_id', v)}>
                          <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-sm">
                            <SelectValue placeholder="Club" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value={null} className="text-white">Sans club</SelectItem>
                            {clubs.map(c => <SelectItem key={c.id} value={c.id} className="text-white">{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button variant="ghost" size="icon" className="text-red-400 shrink-0" onClick={() => removeParsed(index)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      <Input
                        type="number" placeholder="Overall" min="1" max="99"
                        value={player.overall || ''}
                        onChange={e => updateParsed(index, 'overall', e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white text-sm"
                      />
                      <Input
                        type="number" placeholder="Potentiel" min="1" max="99"
                        value={player.potential || ''}
                        onChange={e => updateParsed(index, 'potential', e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white text-sm"
                      />
                      <Input
                        type="number" placeholder="Âge"
                        value={player.age || ''}
                        onChange={e => updateParsed(index, 'age', e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white text-sm"
                      />
                      <Input
                        type="number" placeholder="Valeur €"
                        value={player.value || ''}
                        onChange={e => updateParsed(index, 'value', e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white text-sm"
                      />
                      <Input
                        type="number" placeholder="Clause libératoire €"
                        value={player.release_clause || ''}
                        onChange={e => updateParsed(index, 'release_clause', e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white text-sm"
                      />
                    </div>
                  </div>
                ))}
                <Button
                  onClick={submitSofifa}
                  disabled={bulkCreateMutation.isPending}
                  className="bg-emerald-500 hover:bg-emerald-600 w-full"
                >
                  {bulkCreateMutation.isPending
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Création...</>
                    : <><UserPlus className="w-4 h-4 mr-2" />Créer {parsedPlayers.length} joueur(s)</>
                  }
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}