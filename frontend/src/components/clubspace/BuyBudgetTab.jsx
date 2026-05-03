import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, ExternalLink, Loader2, ShoppingCart, Info,
  CheckCircle2, Upload, X, Clock, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const fmt = (v) => {
  if (!v) return '0€';
  if (v >= 1e9) return `${(v / 1e9).toFixed(0)} Md€`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M€`;
  return `${v}€`;
};

// Étapes: 1=choix pack, 2=paiement PayPal + preuve, 3=confirmation
export default function BuyBudgetTab({ club, user }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [step, setStep] = useState(1);
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState('');
  const [uploading, setUploading] = useState(false);

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['league-config'],
    queryFn: () => base44.entities.LeagueConfig.list('-created_date', 1),
    staleTime: 60000,
  });

  // Demandes déjà soumises par ce club
  const { data: myRequests = [] } = useQuery({
    queryKey: ['budget-requests-mine', club?.id],
    queryFn: () => base44.entities.BudgetRequest.filter({ club_id: club?.id }, '-created_date', 5),
    enabled: !!club?.id,
  });

  const config = configs[0] || null;
  const packages = config?.budget_packages || [];
  const paypalQrUrl = config?.paypal_qr_url || '';
  const instructions = config?.purchase_instructions || '';

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      let proof_url = '';
      if (proofFile) {
        setUploading(true);
        const { file_url } = await base44.integrations.Core.UploadFile({ file: proofFile });
        proof_url = file_url;
        setUploading(false);
      }
      await base44.entities.BudgetRequest.create({
        club_id: club.id,
        club_name: club.name,
        manager_id: user.id,
        manager_name: user.full_name || user.email,
        euros: selectedPkg.euros,
        budget_amount: selectedPkg.budget,
        pack_label: selectedPkg.label,
        status: 'pending',
        proof_url,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-requests-mine'] });
      setStep(3);
    },
    onError: () => {
      setUploading(false);
      toast.error('Erreur lors de la soumission');
    },
  });

  const handleSelectPack = (pkg) => {
    setSelectedPkg(pkg);
    setStep(2);
  };

  const reset = () => {
    setStep(1);
    setSelectedPkg(null);
    setProofFile(null);
    setProofPreview('');
  };

  if (isLoading) return (
    <div className="flex justify-center py-16">
      <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
    </div>
  );

  if (!config || !paypalQrUrl) return (
    <div className="text-center py-16 space-y-3">
      <ShoppingCart className="w-14 h-14 text-slate-600 mx-auto" />
      <p className="text-white font-semibold text-lg">Achats non configurés</p>
      <p className="text-slate-400 text-sm">Le staff n'a pas encore configuré les achats de budget.</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <ShoppingCart className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Acheter du Budget</h2>
          <p className="text-slate-400 text-sm">Renforcez votre club</p>
        </div>
      </div>

      {/* Budget actuel */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm">Budget actuel</p>
          <p className="text-3xl font-black text-white">{fmt(club?.budget || 0)}</p>
        </div>
        <div className="text-4xl opacity-20">💰</div>
      </div>

      {/* Étape 1 : Choisir un pack */}
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
            <p className="text-slate-300 font-semibold mb-4">Choisissez un pack</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map((pkg, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => handleSelectPack(pkg)}
                  className="group flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-slate-700/60 bg-slate-800/50 hover:border-blue-500/60 hover:bg-slate-800 transition-all text-left"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center">
                    <CreditCard className="w-7 h-7 text-blue-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-bold text-base">{pkg.label || `Pack ${i + 1}`}</p>
                    <p className="text-emerald-400 font-semibold text-sm mt-0.5">+{fmt(pkg.budget)} en jeu</p>
                  </div>
                  <div className="mt-auto w-full flex items-center justify-center gap-1.5 bg-blue-500 text-white rounded-xl px-4 py-2.5 font-bold text-sm group-hover:bg-blue-400 transition-colors">
                    {pkg.euros}€ — Scanner & Payer
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Étape 2 : Preuve de paiement */}
        {step === 2 && selectedPkg && (
          <motion.div key="step2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            className="space-y-6"
          >
            {/* Pack sélectionné */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-center gap-4">
              <CreditCard className="w-8 h-8 text-blue-400 shrink-0" />
              <div>
                <p className="text-white font-bold">{selectedPkg.label}</p>
                <p className="text-slate-400 text-sm">{selectedPkg.euros}€ → <span className="text-emerald-400 font-semibold">+{fmt(selectedPkg.budget)} en jeu</span></p>
              </div>
              <button onClick={reset} className="ml-auto text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>

            {/* QR Code PayPal */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 flex flex-col items-center gap-3">
              <p className="text-white font-semibold text-sm">Scannez le QR code PayPal</p>
              <img src={paypalQrUrl} alt="QR Code PayPal" className="w-52 h-52 object-contain bg-white rounded-xl p-2 border border-slate-600" />
              <p className="text-slate-400 text-xs text-center">Montant à payer : <span className="text-white font-bold">{selectedPkg.euros}€</span></p>
            </div>

            {/* Instruction */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3">
              <Info className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-amber-300 font-semibold text-sm mb-1">Étapes à suivre</p>
                <ol className="text-slate-300 text-sm space-y-1 list-decimal pl-4">
                  <li>Scannez le QR code et effectuez le paiement de <strong>{selectedPkg.euros}€</strong></li>
                  <li>Prenez une capture d'écran de la confirmation PayPal</li>
                  <li>Uploadez-la ci-dessous puis soumettez</li>
                </ol>
                {instructions && <p className="text-slate-400 text-xs mt-2 whitespace-pre-line">{instructions}</p>}
              </div>
            </div>

            {/* Upload preuve */}
            <div>
              <p className="text-slate-300 font-semibold text-sm mb-3">Preuve de paiement <span className="text-slate-500 font-normal">(capture PayPal)</span></p>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              {proofPreview ? (
                <div className="relative group w-full max-w-xs">
                  <img src={proofPreview} alt="Preuve" className="rounded-2xl border border-slate-700 w-full object-cover" />
                  <button onClick={() => { setProofFile(null); setProofPreview(''); }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-600 rounded-2xl p-8 text-slate-400 hover:border-blue-500/50 hover:text-blue-400 transition-all text-center">
                  <Upload className="w-8 h-8 mx-auto mb-2 opacity-60" />
                  <p className="text-sm font-medium">Cliquez pour uploader</p>
                  <p className="text-xs mt-1 opacity-60">PNG, JPG recommandé</p>
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={reset} className="border-slate-600 text-slate-300 rounded-2xl">
                Annuler
              </Button>
              <Button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending || uploading}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl h-12 font-bold"
              >
                {submitMutation.isPending || uploading
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Envoi en cours...</>
                  : <><ArrowRight className="w-4 h-4 mr-2" />Soumettre ma demande</>}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Étape 3 : Confirmation */}
        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="text-center py-8 space-y-6"
          >
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white mb-2">Demande soumise !</h3>
              <p className="text-slate-400 text-sm max-w-sm mx-auto">
                Le staff va vérifier votre paiement et créditer <span className="text-emerald-400 font-bold">+{fmt(selectedPkg?.budget)}</span> sur votre club. Vous recevrez une notification dès validation.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-amber-400 text-sm bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3 max-w-xs mx-auto">
              <Clock className="w-4 h-4 shrink-0" />
              Validation généralement dans les 24h
            </div>
            <Button onClick={reset} variant="outline" className="border-slate-600 text-slate-300 rounded-2xl">
              Faire un autre achat
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Historique demandes */}
      {myRequests.length > 0 && step === 1 && (
        <div className="border-t border-slate-800 pt-6">
          <p className="text-slate-400 text-sm font-semibold mb-3">Mes dernières demandes</p>
          <div className="space-y-2">
            {myRequests.map(req => (
              <div key={req.id} className="flex items-center gap-3 bg-slate-800/30 rounded-xl px-4 py-3 text-sm">
                <span className="text-slate-300 flex-1">{req.pack_label || `${req.euros}€`}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                  req.status === 'approved' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                  req.status === 'rejected' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                  'text-amber-400 bg-amber-500/10 border-amber-500/20'
                }`}>
                  {req.status === 'approved' ? '✓ Approuvé' : req.status === 'rejected' ? '✗ Rejeté' : '⏳ En attente'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}