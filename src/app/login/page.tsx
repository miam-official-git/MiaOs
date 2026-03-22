'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (mode === 'reset') {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login/reset-callback`,
      });
      setLoading(false);
      if (resetError) {
        setError('שגיאה בשליחת קישור איפוס');
        return;
      }
      setSuccess('קישור איפוס סיסמה נשלח לאימייל שלך');
      return;
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError('אימייל או סיסמה שגויים');
      setLoading(false);
      return;
    }

    router.push('/');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm border-border bg-card">
        <CardHeader className="items-center gap-2">
          <div className="text-2xl font-bold tracking-tight text-card-foreground">
            Mia-OS
          </div>
          <CardTitle className="text-base font-medium text-muted-foreground">
            {mode === 'login' ? 'כניסה למערכת' : 'איפוס סיסמה'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                אימייל
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                dir="ltr"
                className="border-border bg-muted text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {mode === 'login' && (
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-foreground"
                >
                  סיסמה
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  dir="ltr"
                  className="border-border bg-muted text-foreground placeholder:text-muted-foreground"
                />
              </div>
            )}

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
            {success && (
              <p className="text-sm text-green-400">{success}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="mt-1 h-9 w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? '...' : mode === 'login' ? 'התחבר' : 'שלח קישור איפוס'}
            </Button>

            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'reset' : 'login');
                setError('');
                setSuccess('');
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {mode === 'login' ? 'שכחתי סיסמה' : 'חזרה להתחברות'}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
