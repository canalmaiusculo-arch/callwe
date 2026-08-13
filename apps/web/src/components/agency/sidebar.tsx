'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, Users, LayoutDashboard, LogOut, HelpCircle, Settings, Menu, X, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useTenantStore } from '@/stores/tenant-store';
import { useAdminViewStore } from '@/stores/admin-view-store';
import { Logo } from '@/components/logo';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useTranslate } from '@/i18n/provider';

const items = [
  { href: '/agency' as const, icon: LayoutDashboard, key: 'agency.overview' },
  { href: '/agency/clients' as const, icon: Building2, key: 'agency.clients' },
  { href: '/agency/cases' as const, icon: Briefcase, key: 'agency.cases' },
  { href: '/agency/team' as const, icon: Users, key: 'agency.team' },
  { href: '/agency/settings' as const, icon: Settings, key: 'agency.settings' },
];

export function AgencySidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useTranslate();
  const clearAuth = useAuthStore((s) => s.clear);
  const clearTenant = useTenantStore((s) => s.clear);
  const viewAsAgencyName = useAdminViewStore((s) => s.viewAsAgencyName);

  const content = (
    <>
      <div className="flex items-center justify-between border-b border-white/15 p-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Logo variant="icon" white className="h-7 w-7 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs uppercase text-white/70">{t('agency.title')}</p>
            <p className="truncate text-sm font-semibold text-white">{viewAsAgencyName ?? 'CallWe'}</p>
          </div>
        </div>
        <button className="md:hidden rounded-md p-2 hover:bg-white/10" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-auto p-3">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href as never}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
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
    </>
  );

  return (
    <>
      <button
        className="md:hidden fixed top-3 left-3 z-30 rounded-md border bg-background p-2 shadow-sm"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/30"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          'flex h-screen w-60 flex-col border-r border-white/10 bg-sidebar-gradient text-white transition-transform',
          'md:static md:translate-x-0',
          'fixed inset-y-0 left-0 z-50',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        {content}
      </aside>
    </>
  );
}
