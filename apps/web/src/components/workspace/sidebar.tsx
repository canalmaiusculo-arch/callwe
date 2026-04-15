'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Phone,
  MessageSquare,
  Voicemail,
  FileText,
  Settings,
  LogOut,
  Link2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useTenantStore } from '@/stores/tenant-store';

const navItems = [
  { href: '/workspace', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/workspace/leads', icon: Users, label: 'Leads' },
  { href: '/workspace/calls', icon: Phone, label: 'Chamadas' },
  { href: '/workspace/sms', icon: MessageSquare, label: 'SMS' },
  { href: '/workspace/voicemails', icon: Voicemail, label: 'Voicemails' },
  { href: '/workspace/briefing', icon: FileText, label: 'Briefing' },
  { href: '/workspace/integrations', icon: Link2, label: 'Integrações' },
  { href: '/workspace/settings', icon: Settings, label: 'Configurações' },
];

export function WorkspaceSidebar() {
  const pathname = usePathname();
  const subAccountName = useTenantStore((s) => s.subAccountName);
  const clearAuth = useAuthStore((s) => s.clear);
  const clearTenant = useTenantStore((s) => s.clear);

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-muted/20">
      <div className="border-b p-4">
        <p className="text-xs uppercase text-muted-foreground">Subconta</p>
        <p className="truncate text-sm font-semibold">{subAccountName ?? '—'}</p>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
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
