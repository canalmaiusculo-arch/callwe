'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminViewState {
  viewAsAgencyId: string | null;
  viewAsAgencyName: string | null;
  setViewAsAgency: (id: string, name: string) => void;
  clearViewAsAgency: () => void;
}

export const useAdminViewStore = create<AdminViewState>()(
  persist(
    (set) => ({
      viewAsAgencyId: null,
      viewAsAgencyName: null,
      setViewAsAgency: (viewAsAgencyId, viewAsAgencyName) =>
        set({ viewAsAgencyId, viewAsAgencyName }),
      clearViewAsAgency: () =>
        set({ viewAsAgencyId: null, viewAsAgencyName: null }),
    }),
    { name: 'callwe-admin-view' },
  ),
);
