'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Phone,
  MessageSquare,
  Voicemail,
  FileText,
  LogOut,
  Link2,
  Building2,
  HelpCircle,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useTenantStore } from '@/stores/tenant-store';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useTranslate } from '@/i18n/provider';

const navGroups = [
  {
    label: 'nav.general',
    items: [{ href: '/workspace' as const, icon: LayoutDashboard, key: 'workspace.dashboard' }],
  },
  {
    label: 'nav.support',
    items: [
      { href: '/workspace/calls' as const, icon: Phone, key: 'workspace.calls' },
      { href: '/workspace/sms' as const, icon: MessageSquare, key: 'workspace.sms' },
      { href: '/workspace/voicemails' as const, icon: Voicemail, key: 'workspace.voicemails' },
    ],
  },
  {
    label: 'nav.leads',
    items: [{ href: '/workspace/leads' as const, icon: Users, key: 'workspace.leads' }],
  },
  {
    label: 'nav.operations',
    items: [
      { href: '/workspace/briefing' as const, icon: FileText, key: 'workspace.briefing' },
      { href: '/workspace/integrations' as const, icon: Link2, key: 'workspace.integrations' },
    ],
  },
];

export function WorkspaceSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const subAccountName = useTenantStore((s) => s.subAccountName);
  const clearAuth = useAuthStore((s) => s.clear);
  const clearTenant = useTenantStore((s) => s.clear);
  const { t } = useTranslate();

  const content = (
    <>
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase text-muted-foreground">Subconta</p>
          <p className="truncate text-sm font-semibold">{subAccountName ?? '—'}</p>
        </div>
        <button
          className="md:hidden rounded-md p-2 hover:bg-muted"
          onClick={() => setOpen(false)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 space-y-4 overflow-auto p-3">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-3 pb-1 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground/80">
              {t(group.label)}
            </p>
            {group.items.map((item) => {
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
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon className={cn('h-[1.05rem] w-[1.05rem]', active ? 'text-primary-foreground' : 'text-muted-foreground')} />
                  {t(item.key)}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <Link
        href={'/agency' as never}
        className="m-2 flex items-center gap-3 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
      >
        <Building2 className="h-4 w-4" />
        {t('agent.title').includes('Live') ? 'Agency panel' : 'Painel da agência'}
      </Link>

      <Link
        href={'/help' as never}
        target="_blank"
        className="m-2 flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
      >
        <HelpCircle className="h-4 w-4" />
        {t('common.help')}
      </Link>

      <div className="mx-2 mt-1">
        <LanguageSwitcher />
      </div>

      <button
        onClick={() => {
          clearAuth();
          clearTenant();
          window.location.href = '/login';
        }}
        className="m-2 flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
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
          'flex h-screen w-60 flex-col border-r bg-muted/20 transition-transform',
          'md:static md:translate-x-0',
          'fixed inset-y-0 left-0 z-50 bg-background',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        {content}
      </aside>
    </>
  );
}
