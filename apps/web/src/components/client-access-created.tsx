'use client';

import { Copy, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslate } from '@/i18n/provider';

/** Mostra o acesso (login + senha) gerado ao criar um cliente. Exibido uma vez. */
export function ClientAccessCreated({ login, password }: { login: string; password: string }) {
  const { t } = useTranslate();
  const copy = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt);
    toast.success(`${label} ✓`);
  };
  return (
    <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-900">
        <KeyRound className="h-4 w-4" /> {t('clientAccess.createdTitle')}
      </p>
      <p className="mt-0.5 text-xs text-emerald-800">{t('clientAccess.createdHint')}</p>
      <div className="mt-2 space-y-2">
        <Row label={t('clientAccess.login')} value={login} onCopy={() => copy(login, t('clientAccess.login'))} />
        <Row label={t('clientAccess.password')} value={password} onCopy={() => copy(password, t('clientAccess.password'))} />
      </div>
    </div>
  );
}

function Row({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase text-emerald-700">{label}</p>
      <div className="mt-0.5 flex items-center gap-2">
        <code className="flex-1 truncate rounded border border-emerald-200 bg-white px-2 py-1.5 font-mono text-xs">
          {value}
        </code>
        <button
          onClick={onCopy}
          className="shrink-0 rounded-md border border-emerald-300 bg-white p-1.5 text-emerald-700 hover:bg-emerald-100"
          title="Copiar"
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
