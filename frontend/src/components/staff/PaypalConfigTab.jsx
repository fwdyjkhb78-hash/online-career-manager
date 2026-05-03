import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CreditCard, Plus, Trash2, Save, Loader2, Upload, X, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function PaypalConfigTab() {
  const queryClient = useQueryClient();
  const qrInputRef = useRef(null);

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['league-config'],
    queryFn: () => base44.entities.LeagueConfig.list('-created_date', 1),
  });

  const config = configs[0] || null;

  const [paypalQrUrl, setPaypalQrUrl] = useState('');
  const [uploadingQr, setUploadingQr] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [packages, setPackages] = useState([
    { label: '12€ → 150M€', euros: 12, budget: 150000000 },
    { label: '15€ → 200M€', euros: 15, budget: 200000000 },
    { label: '20€ → 300M€', euros: 20, budget: 300000000 },
    { label: '25€ → 400M€', euros: 25, budget: 400000000 },
    { label: '30€ → 500M€', euros: 30, budget: 500000000 },
    { label: '35€ → 600M€', euros: 35, budget: 600000000 },
    { label: '40€ → 700M€', euros: 40, budget: 700000000 },
    { label: '45€ → 800M€', euros: 45, budget: 800000000 },
    { label: '50€ → 900M€', euros: 50, budget: 900000000 },
    { label: '55€ → 1 Milliard€', euros: 55, budget: 1000000000 },
  ]);
  const [initialized, setInitialized] = useState(false);

  React.useEffect(() => {
    if (config && !initialized) {
      setPaypalQrUrl(config.paypal_qr_url || '');
      setInstructions(config.purchase_instructions || '');
      if (config.budget_packages?.length) setPackages(config.budget_packages);
      setInitialized(true);
    }
  }, [config, initialized]);

  const handleQrUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingQr(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPaypalQrUrl(file_url);
      toast.success('QR code uploadé !');
    } catch {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploadingQr(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        paypal_qr_url: paypalQrUrl,
        purchase_instructions: instructions.trim(),
        budget_packages: packages,
      };
      if (config) {
        await base44.entities.LeagueConfig.update(config.id, data);
      } else {
        await base44.entities.LeagueConfig.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['league-config'] });
      toast.success('Configuration PayPal sauvegardée !');
    },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  });

  const addPackage = () => setPackages([...packages, { label: '', euros: 0, budget: 0 }]);
  const removePackage = (i) => setPackages(packages.filter((_, idx) => idx !== i));
  const updatePackage = (i, field, value) =>
    setPackages(packages.map((p, idx) => idx === i ? { ...p, [field]: value } : p));

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-slate-400 animate-spin" /></div>;

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h2 className="text-white font-bold text-lg">Configuration PayPal</h2>
          <p className="text-slate-400 text-sm">Paramétrez les achats de budget en argent réel</p>
        </div>
      </div>

      {/* QR Code PayPal */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <QrCode className="w-4 h-4 text-blue-400" />
          <h3 className="text-white font-semibold">QR Code PayPal</h3>
        </div>
        <p className="text-slate-500 text-xs">Uploadez une image du QR code PayPal. Les managers pourront le scanner directement.</p>

        <input ref={qrInputRef} type="file" accept="image/*" className="hidden" onChange={handleQrUpload} />

        {paypalQrUrl ? (
          <div className="flex items-start gap-4">
            <img src={paypalQrUrl} alt="QR Code PayPal" className="w-40 h-40 object-contain bg-white rounded-xl border border-slate-600 p-2" />
            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => qrInputRef.current?.click()}
                disabled={uploadingQr}
                className="border-slate-600 text-slate-300 rounded-xl"
              >
                {uploadingQr ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
                Changer
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPaypalQrUrl('')}
                className="text-red-400 hover:bg-red-500/10 rounded-xl"
              >
                <X className="w-4 h-4 mr-1" />Supprimer
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => qrInputRef.current?.click()}
            disabled={uploadingQr}
            className="w-full border-2 border-dashed border-slate-600 rounded-2xl p-8 text-slate-400 hover:border-blue-500/50 hover:text-blue-400 transition-all text-center"
          >
            {uploadingQr
              ? <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
              : <QrCode className="w-8 h-8 mx-auto mb-2 opacity-60" />}
            <p className="text-sm font-medium">{uploadingQr ? 'Upload en cours...' : 'Cliquez pour uploader le QR code'}</p>
            <p className="text-xs mt-1 opacity-60">PNG, JPG recommandé</p>
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-4">
        <h3 className="text-white font-semibold">Instructions pour les managers</h3>
        <textarea
          value={instructions}
          onChange={e => setInstructions(e.target.value)}
          rows={4}
          placeholder="Ex: Scannez le QR code PayPal, effectuez le paiement puis envoyez une capture d'écran..."
          className="w-full bg-slate-900 border border-slate-600 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 resize-none placeholder:text-slate-600"
        />
      </div>

      {/* Packs de budget */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold">Packs de budget disponibles</h3>
          <Button size="sm" onClick={addPackage} variant="outline" className="border-slate-600 text-slate-300 rounded-xl">
            <Plus className="w-4 h-4 mr-1" />Ajouter
          </Button>
        </div>
        <div className="space-y-3">
          {packages.map((pkg, i) => (
            <div key={i} className="flex gap-3 items-center">
              <Input
                value={pkg.label}
                onChange={e => updatePackage(i, 'label', e.target.value)}
                placeholder="Nom du pack"
                className="bg-slate-900 border-slate-600 text-white rounded-xl flex-1"
              />
              <Input
                type="number"
                value={pkg.euros}
                onChange={e => updatePackage(i, 'euros', parseFloat(e.target.value) || 0)}
                placeholder="€ réels"
                className="bg-slate-900 border-slate-600 text-white rounded-xl w-24"
              />
              <Input
                type="number"
                value={pkg.budget}
                onChange={e => updatePackage(i, 'budget', parseFloat(e.target.value) || 0)}
                placeholder="Budget jeu"
                className="bg-slate-900 border-slate-600 text-white rounded-xl w-36"
              />
              <Button size="icon" variant="ghost" onClick={() => removePackage(i)} className="text-red-400 hover:bg-red-500/10 shrink-0">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <p className="text-slate-500 text-xs">Nom · Prix réel (€) · Budget en jeu crédité (en €, ex: 5000000 = 5M€)</p>
        </div>
      </div>

      <Button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-2xl h-12 font-semibold"
      >
        {saveMutation.isPending
          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sauvegarde...</>
          : <><Save className="w-4 h-4 mr-2" />Sauvegarder la configuration</>}
      </Button>
    </div>
  );
}