'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TenantState {
  subAccountId: string | null;
  subAccountName: string | null;
  setTenant: (id: string, name: string) => void;
  clear: () => void;
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      subAccountId: null,
      subAccountName: null,
      setTenant: (subAccountId, subAccountName) => set({ subAccountId, subAccountName }),
      clear: () => set({ subAccountId: null, subAccountName: null }),
    }),
    { name: 'callwe-tenant' },
  ),
);
