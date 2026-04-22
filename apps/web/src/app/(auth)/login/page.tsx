'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

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
      const isAdmin = claims.memberships.some((m) =>
        ['agency_admin', 'super_admin'].includes(m.role),
      );
      const isAgent = claims.memberships.some((m) => m.role === 'agent');

      if (isAdmin) {
        router.push('/agency');
      } else if (isAgent) {
        router.push('/agent');
      } else {
        router.push('/select-sub-account');
      }
    } catch {
      toast.error('Credenciais inválidas');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-lg border p-6">
        <h1 className="text-2xl font-semibold">Entrar no CallWe</h1>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="w-full rounded-md border px-3 py-2"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
          required
          className="w-full rounded-md border px-3 py-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
