'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Copy } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiClient.post<{ ok: boolean; resetUrl?: string }>('/auth/forgot-password', {
        email,
      });
      setSent(true);
      if (res.resetUrl) setResetUrl(res.resetUrl);
    } catch (err) {
      toast.error('Erro ao solicitar reset');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Esqueci minha senha</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sent ? (
            <>
              <p className="text-sm">
                Se o email existir, um link de reset foi gerado. Verifique seu email ou use o link abaixo:
              </p>
              {resetUrl && (
                <div className="flex gap-2">
                  <Input value={resetUrl} readOnly className="font-mono text-xs" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(resetUrl);
                      toast.success('Copiado');
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <Link href="/login" className="text-sm text-blue-600 hover:underline">
                ← Voltar ao login
              </Link>
            </>
          ) : (
            <form onSubmit={onSubmit} className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Informe seu email e vamos gerar um link para redefinir sua senha.
              </p>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Enviando...' : 'Gerar link de reset'}
              </Button>
              <Link href="/login" className="block text-center text-sm text-blue-600 hover:underline">
                Cancelar
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
