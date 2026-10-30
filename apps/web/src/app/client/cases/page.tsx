'use client';

import { CasesPanel } from '@/components/agent/cases-panel';

export default function ClientCasesPage() {
  // Visão do cliente: só os próprios cards (o backend escopa /cases/mine às subs do cliente).
  return (
    <div className="p-6 md:p-8">
      <CasesPanel clients={[]} filterSubAccountId={null} readOnly />
    </div>
  );
}
