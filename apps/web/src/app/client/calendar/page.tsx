'use client';

import { useRouter } from 'next/navigation';
import { EstimateCalendar } from '@/components/estimate-calendar';
import { useTranslate } from '@/i18n/provider';

export default function ClientCalendarPage() {
  const { t } = useTranslate();
  const router = useRouter();
  return (
    <div className="p-6 md:p-8">
      <header className="mb-5">
        <h1 className="text-2xl font-bold md:text-3xl">{t('calendar.title')}</h1>
        <p className="mt-1 text-muted-foreground">{t('calendar.subtitle')}</p>
      </header>
      <EstimateCalendar onOpen={(e) => router.push(`/client/leads/${e.id}` as never)} />
    </div>
  );
}
