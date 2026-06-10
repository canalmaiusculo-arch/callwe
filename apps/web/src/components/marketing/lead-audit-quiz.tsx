'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { Content, Locale } from './marketing-content';

export function LeadAuditQuiz({ t, locale }: { t: Content; locale: Locale }) {
  const q = t.quiz;
  const total = q.questions.length;
  // step: 0..total-1 = perguntas | total = captura | total+1 = sucesso
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>(Array(total).fill(''));
  const [form, setForm] = useState({ firstName: '', businessName: '', phone: '', email: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  const isCapture = step === total;
  const isSuccess = step === total + 1;
  const progress = isSuccess ? 100 : Math.round((step / (total + 1)) * 100);

  function pick(qi: number, opt: string) {
    setAnswers((a) => {
      const n = [...a];
      n[qi] = opt;
      return n;
    });
    setStep(qi + 1);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(false);
    try {
      const res = await fetch('/api/lead-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.firstName,
          businessName: form.businessName,
          phone: form.phone,
          email: form.email,
          industry: answers[0],
          leadsPerMonth: answers[1],
          responseTime: answers[2],
          whoAnswers: answers[3],
          customerValue: answers[4],
          interestedPlan: answers[5],
          lang: locale,
        }),
      });
      const data = (await res.json().catch(() => ({ ok: false }))) as { ok?: boolean };
      if (!data.ok) throw new Error('failed');
      setStep(total + 1);
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl rounded-2xl border bg-card p-6 shadow-lg sm:p-8">
      {/* Barra de progresso */}
      <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-brand-gradient transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {isSuccess ? (
        <div className="py-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-secondary" />
          <h3 className="mt-4 text-xl font-bold">{q.capture.successTitle}</h3>
          <p className="mt-2 text-muted-foreground">{q.capture.successBody}</p>
        </div>
      ) : isCapture ? (
        <form onSubmit={submit} className="space-y-3">
          <h3 className="text-xl font-bold">{q.capture.title}</h3>
          <p className="text-sm text-muted-foreground">{q.capture.body}</p>
          <input
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            placeholder={q.capture.firstName}
            required
            className="w-full rounded-md border px-3 py-2.5"
          />
          <input
            value={form.businessName}
            onChange={(e) => setForm({ ...form, businessName: e.target.value })}
            placeholder={q.capture.businessName}
            className="w-full rounded-md border px-3 py-2.5"
          />
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder={q.capture.phone}
            required
            className="w-full rounded-md border px-3 py-2.5"
          />
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder={q.capture.email}
            required
            className="w-full rounded-md border px-3 py-2.5"
          />
          {error && <p className="text-sm text-destructive">{q.capture.error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-brand-gradient px-4 py-3 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? q.capture.submitting : q.capture.submit}
          </button>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(total - 1)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {locale === 'en' ? 'Back' : locale === 'es' ? 'Atrás' : 'Voltar'}
            </button>
            <p className="text-xs text-muted-foreground">{q.capture.disclaimer}</p>
          </div>
        </form>
      ) : (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-secondary">
            {q.step} {step + 1}/{total}
          </p>
          <h3 className="mt-2 text-xl font-bold">{q.questions[step]?.q}</h3>
          <div className="mt-5 space-y-2">
            {(q.questions[step]?.options ?? []).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => pick(step, opt)}
                className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors hover:border-primary hover:bg-accent ${
                  answers[step] === opt ? 'border-primary bg-accent' : ''
                }`}
              >
                {opt}
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="mt-5 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {locale === 'en' ? 'Back' : locale === 'es' ? 'Atrás' : 'Voltar'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
