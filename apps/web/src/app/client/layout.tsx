'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { LayoutDashboard, Users, Phone, MessageSquare, Voicemail, LogOut, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { useTenantStore } from '@/stores/tenant-store';
import { ChatWidget } from '@/components/chat-widget';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useTranslate } from '@/i18n/provider';

const items = [
  { href: '/client' as const, icon: LayoutDashboard, key: 'workspace.dashboard' },
  { href: '/client/leads' as const, icon: Users, key: 'workspace.leads' },
  { href: '/client/calls' as const, icon: Phone, key: 'workspace.calls' },
  { href: '/client/sms' as const, icon: MessageSquare, key: 'workspace.sms' },
  { href: '/client/voicemails' as const, icon: Voicemail, key: 'workspace.voicemails' },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useTranslate();
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

  const logout = () => {
    clearAuth();
    clearTenant();
    window.location.href = '/login';
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <div className="flex h-screen flex-col md:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="hidden h-screen w-60 flex-col border-r border-white/10 bg-brand-gradient text-white md:flex">
        <div className="border-b border-white/15 p-4">
          <p className="text-xs uppercase text-white/70">{t('client.title')}</p>
          <p className="truncate text-sm font-semibold text-white">{subAccountName ?? '—'}</p>
        </div>

        <nav className="flex-1 space-y-1 p-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href as never}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-white/20 text-white shadow-sm'
                    : 'text-white/80 hover:bg-white/10 hover:text-white',
                )}
              >
                <Icon className="h-[1.05rem] w-[1.05rem]" />
                {t(item.key)}
              </Link>
            );
          })}
        </nav>

        <div className="mx-2 mt-1">
          <LanguageSwitcher />
        </div>

        <Link
          href={'/help' as never}
          target="_blank"
          className="m-2 flex items-center gap-3 rounded-md px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white"
        >
          <HelpCircle className="h-4 w-4" />
          {t('common.help')}
        </Link>

        <button
          onClick={logout}
          className="m-2 flex items-center gap-3 rounded-md px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          {t('common.logout')}
        </button>
      </aside>

      {/* Top bar (mobile) */}
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background px-4 md:hidden">
        <div className="min-w-0">
          <p className="text-[10px] uppercase leading-none text-muted-foreground">{t('client.title')}</p>
          <p className="truncate text-sm font-semibold leading-tight">{subAccountName ?? '—'}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <LanguageSwitcher />
          <Link
            href={'/help' as never}
            target="_blank"
            aria-label={t('common.help')}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          >
            <HelpCircle className="h-5 w-5" />
          </Link>
          <button
            onClick={logout}
            aria-label={t('common.logout')}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Conteúdo — padding inferior no mobile pra não ficar atrás da barra de navegação */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0">{children}</main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 border-t bg-background md:hidden">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href as never}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'scale-110')} />
              <span className="truncate px-0.5">{t(item.key)}</span>
            </Link>
          );
        })}
      </nav>

      <ChatWidget />
    </div>
  );
}
