'use client';

import { useRouter } from 'next/navigation';
import { Crown, X } from 'lucide-react';
import { useAdminViewStore } from '@/stores/admin-view-store';

export function AdminImpersonationBanner() {
  const router = useRouter();
  const { viewAsAgencyId, viewAsAgencyName, clearViewAsAgency } = useAdminViewStore();

  if (!viewAsAgencyId) return null;

  function exit() {
    clearViewAsAgency();
    router.push('/admin');
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-amber-900">
          <Crown className="h-4 w-4" />
          <span>
            Visualizando como agência <strong>{viewAsAgencyName}</strong> (modo super-admin)
          </span>
        </div>
        <button
          onClick={exit}
          className="flex items-center gap-1 rounded-md border border-amber-300 px-2 py-1 text-xs text-amber-900 hover:bg-amber-100"
        >
          <X className="h-3 w-3" />
          Sair
        </button>
      </div>
    </div>
  );
}
