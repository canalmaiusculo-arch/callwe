'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { Logo } from '@/components/logo';
import { useTranslate } from '@/i18n/provider';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

interface JwtClaims {
  memberships: Array<{ role: string; agencyId?: string; subAccountId?: string }>;
}

function decodeJwt(token: string): JwtClaims {
  const payload = token.split('.')[1] ?? '';
  return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
}

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslate();
  const setTokens = useAuthStore((s) => s.setTokens);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiClient.post<LoginResponse>('/auth/login', { email, password });
      setTokens(res.accessToken, res.refreshToken);

      // Roteamento baseado no role
      const claims = decodeJwt(res.accessToken);
      const isSuperAdmin = claims.memberships.some((m) => m.role === 'super_admin');
      const isAgencyAdmin = claims.memberships.some((m) => m.role === 'agency_admin');
      const isAgent = claims.memberships.some((m) => m.role === 'agent');
      const isClient = claims.memberships.some((m) => m.role === 'client_viewer');

      if (isSuperAdmin) {
        router.push('/admin');
      } else if (isAgencyAdmin) {
        router.push('/agency');
      } else if (isClient) {
        router.push('/client');
      } else if (isAgent) {
        router.push('/agent');
      } else {
        router.push('/select-sub-account');
      }
    } catch {
      toast.error(t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-sidebar-gradient p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-white/10 bg-card p-8 shadow-2xl"
      >
        <div className="flex flex-col items-center gap-2 pb-2">
          <Logo variant="full" className="h-9 w-auto" />
          <p className="text-sm text-muted-foreground">{t('auth.accessPanel')}</p>
        </div>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('auth.email')}
          required
          className="w-full rounded-md border px-3 py-2"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('auth.password')}
          required
          className="w-full rounded-md border px-3 py-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-brand-gradient px-4 py-2 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? t('auth.loggingIn') : t('auth.login')}
        </button>
        <Link
          href="/forgot-password"
          className="block text-center text-sm text-blue-600 hover:underline"
        >
          {t('auth.forgotPassword')}
        </Link>
      </form>
    </main>
  );
}
