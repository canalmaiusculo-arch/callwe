'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useTranslate } from '@/i18n/provider';

function ResetPasswordInner() {
  const { t } = useTranslate();
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error(t('resetPassword.passwordsDoNotMatch'));
      return;
    }
    if (password.length < 8) {
      toast.error(t('resetPassword.passwordTooShort'));
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', { token, password });
      toast.success(t('resetPassword.successToast'));
      router.push('/login');
    } catch {
      toast.error(t('resetPassword.invalidOrExpired'));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-sidebar-gradient p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-sm">
            {t('resetPassword.invalidLink')}{' '}
            <Link href="/forgot-password" className="text-blue-600 hover:underline">
              {t('resetPassword.requestNew')}
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-sidebar-gradient p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('resetPassword.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3">
            <Input
              type="password"
              placeholder={t('resetPassword.newPasswordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder={t('resetPassword.confirmPasswordPlaceholder')}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? t('resetPassword.saving') : t('resetPassword.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
