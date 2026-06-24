'use client';

// Renderiza os campos extras de um lead (respostas de quiz/formulário, tracking, etc.)
// achatando objetos aninhados (quiz/contact/tracking) em linhas legíveis. Os dados
// chegam via webhook em customFields; aqui só apresentamos de forma humana.

// Chaves internas/metadados que não devem aparecer pro usuário.
const HIDDEN_KEYS = new Set([
  'acquisitionchannel',
  'receivedvia',
  'zapierapikey',
  'formname',
  'campaignname',
]);

function humanize(key: string): string {
  const cleaned = key.replace(/[_\-.]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'boolean') return value ? '✓' : '—';
  if (Array.isArray(value)) {
    return value
      .map((v) => (v && typeof v === 'object' ? JSON.stringify(v) : String(v)))
      .filter(Boolean)
      .join(', ');
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

interface Row {
  label: string;
  value: string;
}

interface Section {
  title: string | null;
  rows: Row[];
}

function buildSections(customFields: Record<string, unknown>): Section[] {
  const flat: Row[] = [];
  const grouped: Section[] = [];

  for (const [key, value] of Object.entries(customFields)) {
    if (HIDDEN_KEYS.has(key.toLowerCase())) continue;
    if (value === null || value === undefined || value === '') continue;

    // Objeto aninhado (quiz, contact, tracking, ...) vira uma seção própria.
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const rows: Row[] = [];
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (v === null || v === undefined || v === '') continue;
        const formatted = formatValue(v);
        if (formatted) rows.push({ label: humanize(k), value: formatted });
      }
      if (rows.length > 0) grouped.push({ title: humanize(key), rows });
      continue;
    }

    const formatted = formatValue(value);
    if (formatted) flat.push({ label: humanize(key), value: formatted });
  }

  const sections: Section[] = [];
  if (flat.length > 0) sections.push({ title: null, rows: flat });
  sections.push(...grouped);
  return sections;
}

export function leadHasCustomFields(customFields: Record<string, unknown> | null | undefined): boolean {
  if (!customFields) return false;
  return buildSections(customFields).some((s) => s.rows.length > 0);
}

export function LeadCustomFields({
  customFields,
  compact = false,
}: {
  customFields: Record<string, unknown> | null | undefined;
  compact?: boolean;
}) {
  if (!customFields) return null;
  const sections = buildSections(customFields);
  if (sections.every((s) => s.rows.length === 0)) return null;

  return (
    <div className="space-y-3">
      {sections.map((section, idx) => (
        <div key={section.title ?? `flat-${idx}`}>
          {section.title && (
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {section.title}
            </p>
          )}
          <dl
            className={
              compact
                ? 'grid grid-cols-1 gap-x-4 gap-y-1.5'
                : 'grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2'
            }
          >
            {section.rows.map((row) => (
              <div key={row.label} className="flex flex-col">
                <dt className="text-[11px] uppercase text-muted-foreground">{row.label}</dt>
                <dd className="break-words text-sm">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
