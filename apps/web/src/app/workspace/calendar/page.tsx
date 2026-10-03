'use client';

import { useState } from 'react';
import { EstimateCalendar, type Estimate } from '@/components/estimate-calendar';
import { LeadDrawer, type LeadDrawerTarget } from '@/components/lead-drawer';
import { InteractionDrawer } from '@/components/interaction-drawer';
import { useTenantStore } from '@/stores/tenant-store';
import { useTranslate } from '@/i18n/provider';

export default function WorkspaceCalendarPage() {
  const { t } = useTranslate();
  const subAccountId = useTenantStore((s) => s.subAccountId);
  const [lead, setLead] = useState<LeadDrawerTarget | null>(null);
  const [interactionId, setInteractionId] = useState<string | null>(null);

  return (
    <div className="p-6 md:p-8">
      <header className="mb-5">
        <h1 className="text-2xl font-bold md:text-3xl">{t('calendar.title')}</h1>
        <p className="mt-1 text-muted-foreground">{t('calendar.subtitle')}</p>
      </header>
      <EstimateCalendar
        extraParams={subAccountId ? `subAccountId=${subAccountId}` : ''}
        onOpen={(e: Estimate) =>
          setLead({
            id: e.id,
            subAccountId: e.subAccount?.id,
            subAccountName: e.subAccount?.name,
            name: e.name,
            phoneE164: e.phoneE164,
            email: e.email,
          })
        }
      />
      <LeadDrawer lead={lead} onClose={() => setLead(null)} onOpenInteraction={setInteractionId} />
      <InteractionDrawer interactionId={interactionId} onClose={() => setInteractionId(null)} />
    </div>
  );
}
