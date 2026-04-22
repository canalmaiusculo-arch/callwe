'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, Users, LayoutDashboard, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useTenantStore } from '@/stores/tenant-store';

const items = [
  { href: '/agency' as const, icon: LayoutDashboard, label: 'Visão geral' },
  { href: '/agency/clients' as const, icon: Building2, label: 'Clientes' },
  { href: '/agency/team' as const, icon: Users, label: 'Atendentes' },
];

export function AgencySidebar() {
  const pathname = usePathname();
  const clearAuth = useAuthStore((s) => s.clear);
  const clearTenant = useTenantStore((s) => s.clear);

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-muted/20">
      <div className="border-b p-4">
        <p className="text-xs uppercase text-muted-foreground">Agência</p>
        <p className="truncate text-sm font-semibold">CallWe</p>
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
  );
}
