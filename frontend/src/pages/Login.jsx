import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44, pb } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await base44.auth.login({ email, password });
      toast.success('Connexion réussie');
      navigate('/');
    } catch (err) {
      toast.error(err?.message || 'Identifiants invalides');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await base44.auth.register({
        email,
        password,
        passwordConfirm: password,
        full_name: fullName,
        role: 'user',
      });
      toast.success('Compte créé');
      navigate('/');
    } catch (err) {
      toast.error(err?.message || "Impossible de créer le compte");
    } finally {
      setLoading(false);
    }
  };

  const pbUrl = pb?.baseURL || pb?.baseUrl || import.meta.env.VITE_POCKETBASE_URL;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 justify-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Online Career Manager</h1>
        </div>

        <Card className="bg-slate-900 border-slate-800 text-white" data-testid="auth-card">
          <CardHeader>
            <CardTitle>Bienvenue</CardTitle>
            <CardDescription className="text-slate-400">
              Connectez-vous ou créez un compte pour accéder à votre club.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-800">
                <TabsTrigger value="login" data-testid="tab-login">Connexion</TabsTrigger>
                <TabsTrigger value="register" data-testid="tab-register">Inscription</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-login">Email</Label>
                    <Input
                      id="email-login"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-slate-800 border-slate-700"
                      data-testid="login-email-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-login">Mot de passe</Label>
                    <Input
                      id="password-login"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-slate-800 border-slate-700"
                      data-testid="login-password-input"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-500 hover:bg-emerald-600"
                    data-testid="login-submit-button"
                  >
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Se connecter
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullname-register">Nom complet</Label>
                    <Input
                      id="fullname-register"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="bg-slate-800 border-slate-700"
                      data-testid="register-fullname-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-register">Email</Label>
                    <Input
                      id="email-register"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-slate-800 border-slate-700"
                      data-testid="register-email-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-register">Mot de passe (8+ caractères)</Label>
                    <Input
                      id="password-register"
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-slate-800 border-slate-700"
                      data-testid="register-password-input"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-500 hover:bg-emerald-600"
                    data-testid="register-submit-button"
                  >
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Créer un compte
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-slate-500">
          Backend PocketBase: <span className="text-slate-300 break-all">{pbUrl}</span>
        </p>
      </div>
    </div>
  );
}
