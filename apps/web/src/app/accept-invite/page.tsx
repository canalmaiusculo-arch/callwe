'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslate } from '@/i18n/provider';

function AcceptInviteForm() {
  const { t } = useTranslate();
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const accept = useMutation({
    mutationFn: () => apiClient.post<{ ok: boolean; email: string }>('/team/accept-invite', { token, password }),
    onSuccess: (data) => {
      toast.success(t('acceptInvite.accountCreatedToast').replace('{email}', data.email));
      router.push('/login');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!token) {
    return (
      <Card className="max-w-md">
        <CardContent className="p-6 text-center">
          <p>{t('acceptInvite.invalidToken')}</p>
        </CardContent>
      </Card>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error(t('acceptInvite.passwordsDoNotMatch'));
      return;
    }
    if (password.length < 8) {
      toast.error(t('acceptInvite.passwordTooShort'));
      return;
    }
    accept.mutate();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t('acceptInvite.welcomeTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">{t('acceptInvite.createPasswordLabel')}</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('acceptInvite.passwordPlaceholder')}
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium">{t('acceptInvite.confirmPasswordLabel')}</label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={accept.isPending}>
            {accept.isPending ? t('acceptInvite.creatingAccount') : t('acceptInvite.createAccount')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function AcceptInvitePage() {
  const { t } = useTranslate();
  return (
    <main className="flex min-h-screen items-center justify-center bg-sidebar-gradient p-8">
      <Suspense fallback={<div>{t('acceptInvite.loading')}</div>}>
        <AcceptInviteForm />
      </Suspense>
    </main>
  );
}
