'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Copy } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useTranslate } from '@/i18n/provider';

export default function ForgotPasswordPage() {
  const { t } = useTranslate();
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
      toast.error(t('forgotPassword.errorRequest'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('forgotPassword.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sent ? (
            <>
              <p className="text-sm">
                {t('forgotPassword.sentInfo')}
              </p>
              {resetUrl && (
                <div className="flex gap-2">
                  <Input value={resetUrl} readOnly className="font-mono text-xs" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(resetUrl);
                      toast.success(t('forgotPassword.copied'));
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <Link href="/login" className="text-sm text-blue-600 hover:underline">
                ← {t('forgotPassword.backToLogin')}
              </Link>
            </>
          ) : (
            <form onSubmit={onSubmit} className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t('forgotPassword.formInfo')}
              </p>
              <Input
                type="email"
                placeholder={t('forgotPassword.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? t('forgotPassword.submitting') : t('forgotPassword.submit')}
              </Button>
              <Link href="/login" className="block text-center text-sm text-blue-600 hover:underline">
                {t('forgotPassword.cancel')}
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
