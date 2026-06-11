'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { LayoutDashboard, Users, Phone, MessageSquare, Voicemail, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { useTenantStore } from '@/stores/tenant-store';
import { ChatWidget } from '@/components/chat-widget';

const items = [
  { href: '/client' as const, icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/client/leads' as const, icon: Users, label: 'Leads' },
  { href: '/client/calls' as const, icon: Phone, label: 'Chamadas' },
  { href: '/client/sms' as const, icon: MessageSquare, label: 'SMS' },
  { href: '/client/voicemails' as const, icon: Voicemail, label: 'Voicemails' },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const subAccountName = useTenantStore((s) => s.subAccountName);
  const subAccountId = useTenantStore((s) => s.subAccountId);
  const setTenant = useTenantStore((s) => s.setTenant);
  const clearAuth = useAuthStore((s) => s.clear);
  const clearTenant = useTenantStore((s) => s.clear);

  // Garante que o tenant esteja selecionado em qualquer página do cliente (não só no dashboard).
  const { data: mySubs } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['my-sub-accounts'],
    queryFn: () => apiClient.get('/sub-accounts/mine'),
  });
  useEffect(() => {
    if (!subAccountId && mySubs && mySubs.length > 0) {
      setTenant(mySubs[0]!.id, mySubs[0]!.name);
    }
  }, [mySubs, subAccountId, setTenant]);

  return (
    <div className="flex h-screen">
      <aside className="flex h-screen w-60 flex-col border-r bg-muted/20">
        <div className="border-b p-4">
          <p className="text-xs uppercase text-muted-foreground">Cliente</p>
          <p className="truncate text-sm font-semibold">{subAccountName ?? '—'}</p>
        </div>

        <nav className="flex-1 space-y-1 p-2">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href as never}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => {
            clearAuth();
            clearTenant();
            window.location.href = '/login';
          }}
          className="m-2 flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
      <ChatWidget />
    </div>
  );
}
