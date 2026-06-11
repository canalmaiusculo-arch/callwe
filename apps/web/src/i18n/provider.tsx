'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import ptBR from './messages/pt-BR.json';
import en from './messages/en.json';
import es from './messages/es.json';

type Locale = 'pt-BR' | 'en' | 'es';

const DICT: Record<Locale, typeof ptBR> = {
  'pt-BR': ptBR,
  en: en as typeof ptBR,
  es: es as typeof ptBR,
};

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'pt-BR',
  setLocale: () => {},
  t: (k) => k,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('pt-BR');

  useEffect(() => {
    const saved = (typeof window !== 'undefined' && localStorage.getItem('callwe-locale')) as Locale | null;
    if (saved && (saved === 'pt-BR' || saved === 'en' || saved === 'es')) {
      setLocaleState(saved);
    } else if (typeof window !== 'undefined') {
      const browser = navigator.language.toLowerCase();
      if (browser.startsWith('en')) setLocaleState('en');
      else if (browser.startsWith('es')) setLocaleState('es');
    }
  }, []);

  function setLocale(l: Locale) {
    setLocaleState(l);
    if (typeof window !== 'undefined') localStorage.setItem('callwe-locale', l);
  }

  function t(key: string): string {
    const parts = key.split('.');
    let cur: unknown = DICT[locale];
    for (const p of parts) {
      if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[p];
      } else {
        return key; // fallback: retorna a chave se não achou
      }
    }
    return typeof cur === 'string' ? cur : key;
  }

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>;
}

export function useTranslate() {
  return useContext(I18nContext);
}
