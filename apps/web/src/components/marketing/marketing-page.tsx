'use client';

import { useEffect, useState } from 'react';
import {
  ArrowRight,
  PlayCircle,
  Zap,
  Headphones,
  BarChart3,
  Bot,
  PhoneCall,
  RefreshCw,
  TrendingUp,
  Plug,
  Check,
  Phone,
  Mail,
  CalendarClock,
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { LeadAuditQuiz } from './lead-audit-quiz';
import {
  CONTENT,
  LOCALES,
  LOCALE_FLAG,
  APP_URL,
  CONTACT,
  type Content,
  type Locale,
} from './marketing-content';

const PILLAR_ICONS = [Zap, Headphones, BarChart3];
const DASH_ICONS = [Bot, PhoneCall, RefreshCw, TrendingUp, Plug];

export function MarketingPage() {
  const [locale, setLocale] = useState<Locale>('en');

  useEffect(() => {
    const saved = localStorage.getItem('callwe-site-lang') as Locale | null;
    if (saved && LOCALES.includes(saved)) {
      setLocale(saved);
      return;
    }
    const b = navigator.language.toLowerCase();
    if (b.startsWith('es')) setLocale('es');
    else if (b.startsWith('pt')) setLocale('pt');
  }, []);

  const change = (l: Locale) => {
    setLocale(l);
    localStorage.setItem('callwe-site-lang', l);
  };

  const t = CONTENT[locale];

  return (
    <div lang={locale} className="scroll-smooth bg-background text-foreground">
      <SiteHeader t={t} locale={locale} onChange={change} />
      <Hero t={t} />
      <Problem t={t} />
      <Origin t={t} />
      <Solution t={t} />
      <HowItWorks t={t} />
      <Dashboard t={t} />
      <Industries t={t} />
      <WhyCallWe t={t} />
      <Founders t={t} />
      <Proof t={t} />
      <QuizSection t={t} locale={locale} />
      <FinalCta t={t} />
      <SiteFooter t={t} />
    </div>
  );
}

function LangSwitcher({ locale, onChange }: { locale: Locale; onChange: (l: Locale) => void }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border px-1.5 py-1">
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          title={CONTENT[l].langName}
          aria-label={CONTENT[l].langName}
          className={`overflow-hidden rounded-sm transition ${
            locale === l ? 'ring-2 ring-primary' : 'opacity-50 hover:opacity-100'
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOCALE_FLAG[l]} alt={CONTENT[l].langName} className="h-4 w-6 object-cover" />
        </button>
      ))}
    </div>
  );
}

function SiteHeader({ t, locale, onChange }: { t: Content; locale: Locale; onChange: (l: Locale) => void }) {
  const nav = [
    { href: '#how-it-works', label: t.nav.howItWorks },
    { href: '#results', label: t.nav.results },
    { href: '#industries', label: t.nav.industries },
  ];
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <a href="/" aria-label="CallWe — home" className="transition-opacity hover:opacity-80">
          <Logo variant="full" className="h-7 w-auto" />
        </a>
        <nav className="hidden items-center gap-7 lg:flex">
          {nav.map((n) => (
            <a key={n.href} href={n.href} className="text-sm text-muted-foreground hover:text-foreground">
              {n.label}
            </a>
          ))}
          <a href={APP_URL} className="text-sm font-bold text-primary hover:opacity-80">
            {t.nav.login}
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <LangSwitcher locale={locale} onChange={onChange} />
          <a
            href="#audit"
            className="rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            {t.nav.cta}
          </a>
        </div>
      </div>
    </header>
  );
}

function Hero({ t }: { t: Content }) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-accent/60 to-background" />
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:py-24 lg:grid-cols-2">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-secondary">{t.hero.eyebrow}</span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">{t.hero.h1}</h1>
          <p className="mt-5 text-lg text-muted-foreground">{t.hero.subhead}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="#audit"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-gradient px-6 py-3 font-medium text-white transition-opacity hover:opacity-90"
            >
              {t.hero.cta} <ArrowRight className="h-4 w-4" />
            </a>
            <a href="#video" className="inline-flex items-center gap-2 text-sm font-medium hover:underline">
              <PlayCircle className="h-5 w-5 text-primary" /> {t.hero.watch}
            </a>
          </div>
          <div className="mt-8">
            <p className="text-sm text-muted-foreground">{t.hero.trustLine}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {t.hero.trustChips.map((c) => (
                <span key={c} className="rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
        {/* Vídeo institucional (placeholder) */}
        <div id="video" className="flex aspect-video items-center justify-center rounded-2xl border bg-card shadow-sm">
          <div className="text-center text-muted-foreground">
            <PlayCircle className="mx-auto h-12 w-12" />
            <p className="mt-2 text-sm">{t.hero.videoPlaceholder}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Problem({ t }: { t: Content }) {
  return (
    <section className="border-t py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t.problem.headline}</h2>
          <p className="mt-4 text-muted-foreground">{t.problem.body}</p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.problem.stats.map((s) => (
            <div key={s.value} className="rounded-xl border bg-card p-6">
              <p className="text-brand-gradient text-4xl font-bold">{s.value}</p>
              <p className="mt-3 text-sm text-muted-foreground">{s.caption}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-2xl text-center text-lg font-medium">{t.problem.punch}</p>
      </div>
    </section>
  );
}

function Origin({ t }: { t: Content }) {
  return (
    <section id="results" className="border-t bg-muted/30 py-20">
      <div className="mx-auto max-w-4xl px-4">
        <span className="text-sm font-semibold uppercase tracking-wide text-secondary">{t.origin.eyebrow}</span>
        <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{t.origin.headline}</h2>
        <div className="mt-6 space-y-4 text-muted-foreground">
          {t.origin.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {t.origin.results.map((r) => (
            <div key={r.value} className="rounded-xl border bg-card p-6 text-center">
              <p className="text-brand-gradient text-4xl font-bold">{r.value}</p>
              <p className="mt-2 text-sm text-muted-foreground">{r.caption}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-lg font-medium">{t.origin.punch}</p>
      </div>
    </section>
  );
}

function Solution({ t }: { t: Content }) {
  return (
    <section className="border-t py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t.solution.headline}</h2>
          <p className="mt-4 text-muted-foreground">{t.solution.body}</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {t.solution.pillars.map((p, i) => {
            const Icon = PILLAR_ICONS[i] ?? Zap;
            return (
              <div key={p.title} className="rounded-xl border bg-card p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-gradient text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.desc}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-10 text-center">
          <a
            href="#audit"
            className="inline-flex items-center gap-2 rounded-md bg-brand-gradient px-6 py-3 font-medium text-white transition-opacity hover:opacity-90"
          >
            {t.solution.cta} <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

function HowItWorks({ t }: { t: Content }) {
  return (
    <section id="how-it-works" className="border-t bg-muted/30 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">{t.how.headline}</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-4">
          {t.how.steps.map((s, i) => (
            <div key={s.title} className="relative rounded-xl border bg-card p-6">
              <span className="text-brand-gradient text-3xl font-bold">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mt-2 font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-10 text-center text-lg font-medium">{t.how.tagline}</p>
      </div>
    </section>
  );
}

function Dashboard({ t }: { t: Content }) {
  return (
    <section className="border-t py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 lg:grid-cols-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t.dashboard.headline}</h2>
          <p className="mt-4 text-muted-foreground">{t.dashboard.body}</p>
          <ul className="mt-6 space-y-4">
            {t.dashboard.bullets.map((b, i) => {
              const Icon = DASH_ICONS[i] ?? Check;
              return (
                <li key={b.title} className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">{b.title}</p>
                    <p className="text-sm text-muted-foreground">{b.desc}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          <a
            href="#audit"
            className="mt-8 inline-flex items-center gap-2 rounded-md border px-5 py-2.5 text-sm font-medium hover:bg-muted"
          >
            {t.dashboard.cta} <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        <div className="flex aspect-video items-center justify-center rounded-2xl border bg-card shadow-sm">
          <div className="text-center text-muted-foreground">
            <BarChart3 className="mx-auto h-12 w-12" />
            <p className="mt-2 text-sm">{t.dashboard.placeholder}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Industries({ t }: { t: Content }) {
  return (
    <section id="industries" className="border-t bg-muted/30 py-20">
      <div className="mx-auto max-w-4xl px-4 text-center">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t.industries.headline}</h2>
        <p className="mt-4 text-muted-foreground">{t.industries.body}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {t.industries.chips.map((c) => (
            <span key={c} className="rounded-full border bg-card px-4 py-2 text-sm font-medium">
              {c}
            </span>
          ))}
        </div>
        <p className="mt-8 text-lg font-medium">{t.industries.line}</p>
      </div>
    </section>
  );
}

function WhyCallWe({ t }: { t: Content }) {
  return (
    <section className="border-t py-20">
      <div className="mx-auto max-w-5xl px-4">
        <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">{t.why.headline}</h2>
        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="p-3" />
                <th className="p-3 text-left font-medium text-muted-foreground">{t.why.cols[0]}</th>
                <th className="p-3 text-left font-medium text-muted-foreground">{t.why.cols[1]}</th>
                <th className="rounded-t-lg bg-accent p-3 text-left font-semibold text-primary">{t.why.cols[2]}</th>
              </tr>
            </thead>
            <tbody>
              {t.why.rows.map((row, i) => (
                <tr key={row.label} className="border-t">
                  <td className="p-3 font-medium">{row.label}</td>
                  <td className="p-3 text-muted-foreground">{row.values[0]}</td>
                  <td className="p-3 text-muted-foreground">{row.values[1]}</td>
                  <td className={`bg-accent/50 p-3 font-medium ${i === t.why.rows.length - 1 ? 'rounded-b-lg' : ''}`}>
                    {row.values[2]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mx-auto mt-8 max-w-2xl text-center text-muted-foreground">{t.why.line}</p>
      </div>
    </section>
  );
}

function Founders({ t }: { t: Content }) {
  return (
    <section className="border-t bg-muted/30 py-20">
      <div className="mx-auto max-w-4xl px-4 text-center">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t.founders.headline}</h2>
        <p className="mt-5 text-muted-foreground">{t.founders.body}</p>
        <div className="mt-10 flex justify-center gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="h-20 w-20 rounded-full border-2 border-dashed bg-card" />
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">{t.founders.note}</p>
      </div>
    </section>
  );
}

function Proof({ t }: { t: Content }) {
  return (
    <section className="border-t py-20">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">{t.proof.headline}</h2>

        <div className="mt-10 overflow-hidden rounded-2xl bg-brand-gradient p-8 text-white md:p-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-white/80">{t.proof.featuredKicker}</p>
          <p className="mt-3 max-w-3xl text-white/90">{t.proof.featuredBody}</p>
          <p className="mt-4 text-2xl font-bold">{t.proof.featuredResult}</p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {t.proof.testimonials.map((tt, i) => (
            <figure key={i} className="rounded-xl border bg-card p-6">
              <blockquote className="text-sm">“{tt.quote}”</blockquote>
              <figcaption className="mt-3 text-xs font-medium text-muted-foreground">{tt.who}</figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">{t.proof.note}</p>
      </div>
    </section>
  );
}

function QuizSection({ t, locale }: { t: Content; locale: Locale }) {
  return (
    <section id="audit" className="border-t bg-muted/30 py-20">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t.quiz.headline}</h2>
          <p className="mt-3 text-muted-foreground">{t.quiz.subhead}</p>
        </div>
        <LeadAuditQuiz t={t} locale={locale} />
      </div>
    </section>
  );
}

function FinalCta({ t }: { t: Content }) {
  return (
    <section className="border-t py-20">
      <div className="mx-auto max-w-5xl px-4">
        <div className="overflow-hidden rounded-3xl bg-brand-gradient px-8 py-14 text-center text-white">
          <h2 className="text-3xl font-bold md:text-4xl">{t.finalCta.headline}</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/90">{t.finalCta.subhead}</p>
          <div className="mt-8">
            <a
              href="#audit"
              className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 font-medium text-primary transition-opacity hover:opacity-90"
            >
              {t.finalCta.cta} <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-white/90">
            <a href={CONTACT.phoneHref} className="flex items-center gap-2 hover:text-white">
              <Phone className="h-4 w-4" /> {t.finalCta.callLabel}: {CONTACT.phone}
            </a>
            <a href={CONTACT.emailHref} className="flex items-center gap-2 hover:text-white">
              <Mail className="h-4 w-4" /> {t.finalCta.emailLabel}: {CONTACT.email}
            </a>
            <a href={CONTACT.calendar} className="flex items-center gap-2 hover:text-white">
              <CalendarClock className="h-4 w-4" /> {t.finalCta.bookLabel}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function SiteFooter({ t }: { t: Content }) {
  return (
    <footer className="border-t py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
        <div className="flex flex-col items-center gap-1 sm:items-start">
          <a href="/" aria-label="CallWe — home">
            <Logo variant="full" className="h-6 w-auto" />
          </a>
          <p className="text-xs text-muted-foreground">{t.footer.tagline}</p>
        </div>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <a href="/terms" className="hover:text-foreground">
            Terms
          </a>
          <a href="/privacy" className="hover:text-foreground">
            Privacy
          </a>
          <a href={APP_URL} className="hover:text-foreground">
            {t.nav.login}
          </a>
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} CallWe. {t.footer.rights}
        </p>
      </div>
    </footer>
  );
}
