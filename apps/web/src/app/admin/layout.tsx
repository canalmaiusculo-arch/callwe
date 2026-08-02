'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Crown, Building2, LogOut, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useTenantStore } from '@/stores/tenant-store';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useTranslate } from '@/i18n/provider';
import { Logo } from '@/components/logo';
import { ChatWidget } from '@/components/chat-widget';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const clearAuth = useAuthStore((s) => s.clear);
  const clearTenant = useTenantStore((s) => s.clear);
  const { t } = useTranslate();

  const items = [
    { href: '/admin' as const, label: t('admin.agencies'), icon: Building2 },
    { href: '/admin/team' as const, label: t('admin.team'), icon: Users },
  ];

  return (
    <div className="flex h-screen">
      <aside className="flex h-screen w-60 flex-col border-r border-white/10 bg-sidebar-gradient text-white">
        <div className="border-b border-white/15 p-4">
          <div className="flex items-center gap-2">
            <Logo variant="icon" white className="h-7 w-7 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <Crown className="h-3 w-3 text-amber-300" />
                <p className="text-xs uppercase text-white/70">{t('admin.title')}</p>
              </div>
              <p className="truncate text-sm font-semibold text-white">CallWe</p>
            </div>
          </div>
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
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active ? 'bg-white/20 text-white shadow-sm' : 'text-white/80 hover:bg-white/10 hover:text-white',
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="m-2">
          <LanguageSwitcher />
        </div>

        <button
          onClick={() => {
            clearAuth();
            clearTenant();
            window.location.href = '/login';
          }}
          className="m-2 flex items-center gap-3 rounded-md px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          {t('common.logout')}
        </button>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
      <ChatWidget />
    </div>
  );
}
