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
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useTenantStore } from '@/stores/tenant-store';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useTranslate } from '@/i18n/provider';

const navDefs = [
  { href: '/workspace' as const, icon: LayoutDashboard, key: 'workspace.dashboard' },
  { href: '/workspace/leads' as const, icon: Users, key: 'workspace.leads' },
  { href: '/workspace/calls' as const, icon: Phone, key: 'workspace.calls' },
  { href: '/workspace/sms' as const, icon: MessageSquare, key: 'workspace.sms' },
  { href: '/workspace/voicemails' as const, icon: Voicemail, key: 'workspace.voicemails' },
  { href: '/workspace/briefing' as const, icon: FileText, key: 'workspace.briefing' },
  { href: '/workspace/integrations' as const, icon: Link2, key: 'workspace.integrations' },
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

      <nav className="flex-1 space-y-1 p-2 overflow-auto">
        {navDefs.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href as never}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
              )}
            >
              <Icon className="h-4 w-4" />
              {t(item.key)}
            </Link>
          );
        })}
      </nav>

      <Link
        href={'/agency' as never}
        className="m-2 flex items-center gap-3 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
      >
        <Building2 className="h-4 w-4" />
        {t('agent.title').includes('Live') ? 'Agency panel' : 'Painel da agência'}
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
