'use client';

import { useTranslate } from '@/i18n/provider';

const LANGS = [
  { code: 'pt-BR' as const, flag: '/flags/br.png', label: 'Português' },
  { code: 'en' as const, flag: '/flags/us.png', label: 'English' },
];

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslate();

  return (
    <div className="flex items-center gap-1.5 rounded-md border px-1.5 py-1">
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLocale(l.code)}
          title={l.label}
          aria-label={l.label}
          className={`overflow-hidden rounded-sm transition ${
            locale === l.code ? 'ring-2 ring-primary' : 'opacity-50 hover:opacity-100'
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={l.flag} alt={l.label} className="h-4 w-6 object-cover" />
        </button>
      ))}
    </div>
  );
}
