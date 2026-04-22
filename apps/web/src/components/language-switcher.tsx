'use client';

import { Globe } from 'lucide-react';
import { useTranslate } from '@/i18n/provider';

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslate();

  return (
    <div className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs">
      <Globe className="h-3 w-3 text-muted-foreground" />
      <button
        className={locale === 'pt-BR' ? 'font-semibold' : 'text-muted-foreground'}
        onClick={() => setLocale('pt-BR')}
      >
        PT
      </button>
      <span className="text-muted-foreground">/</span>
      <button
        className={locale === 'en' ? 'font-semibold' : 'text-muted-foreground'}
        onClick={() => setLocale('en')}
      >
        EN
      </button>
    </div>
  );
}
