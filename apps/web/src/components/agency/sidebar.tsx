'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, Users, LayoutDashboard, LogOut, HelpCircle, Settings, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useTenantStore } from '@/stores/tenant-store';
import { useAdminViewStore } from '@/stores/admin-view-store';
import { Logo } from '@/components/logo';

const items = [
  { href: '/agency' as const, icon: LayoutDashboard, label: 'Visão geral' },
  { href: '/agency/clients' as const, icon: Building2, label: 'Clientes' },
  { href: '/agency/team' as const, icon: Users, label: 'Atendentes' },
  { href: '/agency/settings' as const, icon: Settings, label: 'Configurações' },
];

export function AgencySidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const clearAuth = useAuthStore((s) => s.clear);
  const clearTenant = useTenantStore((s) => s.clear);
  const viewAsAgencyName = useAdminViewStore((s) => s.viewAsAgencyName);

  const content = (
    <>
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Logo variant="icon" className="h-7 w-7 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs uppercase text-muted-foreground">Agência</p>
            <p className="truncate text-sm font-semibold">{viewAsAgencyName ?? 'CallWe'}</p>
          </div>
        </div>
        <button className="md:hidden rounded-md p-2 hover:bg-muted" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-2 overflow-auto">
        {items.map((item) => {
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
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Link
        href={'/help' as never}
        target="_blank"
        className="m-2 flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
      >
        <HelpCircle className="h-4 w-4" />
        Ajuda
      </Link>

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
