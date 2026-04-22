'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function AcceptInviteForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const accept = useMutation({
    mutationFn: () => apiClient.post<{ ok: boolean; email: string }>('/team/accept-invite', { token, password }),
    onSuccess: (data) => {
      toast.success(`Conta criada! Use ${data.email} para entrar.`);
      router.push('/login');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!token) {
    return (
      <Card className="max-w-md">
        <CardContent className="p-6 text-center">
          <p>Token de convite inválido.</p>
        </CardContent>
      </Card>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error('Senhas não conferem');
      return;
    }
    if (password.length < 8) {
      toast.error('Senha deve ter pelo menos 8 caracteres');
      return;
    }
    accept.mutate();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Bem-vindo ao CallWe</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Crie sua senha</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="mínimo 8 caracteres"
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium">Confirme a senha</label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={accept.isPending}>
            {accept.isPending ? 'Criando conta...' : 'Criar conta'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function AcceptInvitePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Suspense fallback={<div>Carregando...</div>}>
        <AcceptInviteForm />
      </Suspense>
    </main>
  );
}
