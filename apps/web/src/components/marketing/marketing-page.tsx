'use client';

import { useState } from 'react';
import {
  Phone,
  Magnet,
  KanbanSquare,
  BarChart3,
  Users,
  Building2,
  ArrowRight,
  Check,
  ChevronDown,
  MessageSquare,
} from 'lucide-react';
import { Logo } from '@/components/logo';

// URL do sistema (subdomínio do app). Sobrescreva com NEXT_PUBLIC_APP_URL no build se mudar.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.callwe.digital';
// Contato comercial — ajuste para o canal real (e-mail, WhatsApp, etc.).
const SALES_CONTACT = 'mailto:contato@callwe.digital';

const NAV = [
  { href: '#recursos', label: 'Recursos' },
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#precos', label: 'Preços' },
  { href: '#faq', label: 'FAQ' },
];

const FEATURES = [
  {
    icon: Magnet,
    title: 'Captação de leads centralizada',
    desc: 'Receba leads de Meta Ads, Google, formulários e quizz num só lugar — via webhook, sem planilha e sem perder contato.',
  },
  {
    icon: Phone,
    title: 'Telefonia integrada',
    desc: 'Chamadas recebidas e realizadas registradas automaticamente, com gravação, tempo de espera e duração.',
  },
  {
    icon: KanbanSquare,
    title: 'CRM e funil de vendas',
    desc: 'Cada lead vira um card com histórico completo de chamadas, SMS e anotações. Acompanhe do primeiro contato ao fechamento.',
  },
  {
    icon: BarChart3,
    title: 'Dashboards em tempo real',
    desc: 'Leads, chamadas, perdidas, tempo ao telefone e desempenho por atendente — atualizados a cada minuto.',
  },
  {
    icon: Users,
    title: 'Equipe e atendentes',
    desc: 'Distribua o atendimento, acompanhe cada atendente e veja quem está performando melhor.',
  },
  {
    icon: Building2,
    title: 'Feito para agências',
    desc: 'Gerencie vários clientes em contas separadas, com visão consolidada da agência e acesso individual por cliente.',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Capte',
    desc: 'Conecte suas fontes de leads (Meta, Google, formulários, quizz) ou receba chamadas direto na plataforma.',
  },
  {
    n: '02',
    title: 'Distribua',
    desc: 'Os leads chegam organizados e são direcionados para os atendentes certos automaticamente.',
  },
  {
    n: '03',
    title: 'Atenda',
    desc: 'Ligue, mande SMS e registre cada interação sem sair do painel — com todo o histórico à mão.',
  },
  {
    n: '04',
    title: 'Meça',
    desc: 'Acompanhe os resultados em dashboards claros e tome decisões com base em dados reais.',
  },
];

// TODO: ajustar valores e itens dos planos conforme a oferta comercial real.
const PLANS = [
  {
    name: 'Essencial',
    price: 'R$ —',
    period: '/mês',
    desc: 'Para quem está começando a organizar o atendimento.',
    features: ['Captação de leads via webhook', 'CRM e funil', 'Dashboards básicos', 'Até 3 atendentes'],
    cta: 'Começar',
    highlight: false,
  },
  {
    name: 'Profissional',
    price: 'R$ —',
    period: '/mês',
    desc: 'Para times que vivem de telefonia e volume de leads.',
    features: [
      'Tudo do Essencial',
      'Telefonia integrada (chamadas + SMS)',
      'Gravações e relatórios',
      'Atendentes ilimitados',
    ],
    cta: 'Assinar',
    highlight: true,
  },
  {
    name: 'Agência',
    price: 'Sob consulta',
    period: '',
    desc: 'Para gerenciar vários clientes numa só plataforma.',
    features: ['Tudo do Profissional', 'Múltiplos clientes', 'Visão consolidada da agência', 'Onboarding dedicado'],
    cta: 'Falar com vendas',
    highlight: false,
  },
];

const FAQ = [
  {
    q: 'O que é o CallWe?',
    a: 'Uma plataforma que une captação de leads, telefonia e CRM num só painel — pensada para agências e seus clientes acompanharem o atendimento do primeiro contato ao fechamento.',
  },
  {
    q: 'De onde vêm os leads?',
    a: 'De Meta Ads, Google, formulários e quizz (via webhook), além das próprias chamadas recebidas. Tudo entra organizado e identificado pela origem.',
  },
  {
    q: 'Preciso trocar minha telefonia?',
    a: 'O CallWe integra com a telefonia para registrar chamadas, gravações e tempos automaticamente. A configuração é feita junto com a sua agência.',
  },
  {
    q: 'Funciona para agências com vários clientes?',
    a: 'Sim. Cada cliente fica numa conta separada, com a agência tendo uma visão consolidada e cada cliente acessando apenas os próprios dados.',
  },
  {
    q: 'Como acesso o sistema?',
    a: 'Pelo botão “Acessar painel do cliente”. O acesso é exclusivo para quem já tem login — fale com a sua agência para receber o seu.',
  },
];

export function MarketingPage() {
  return (
    <div className="scroll-smooth bg-background text-foreground">
      <SiteHeader />
      <Hero />
      <Features />
      <HowItWorks />
      <Pricing />
      <Faq />
      <FinalCta />
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo variant="full" className="h-7 w-auto" />
        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="text-sm text-muted-foreground hover:text-foreground">
              {n.label}
            </a>
          ))}
        </nav>
        <a
          href={APP_URL}
          className="rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Acessar painel
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-accent/60 to-background" />
      <div className="mx-auto max-w-6xl px-4 py-20 text-center md:py-28">
        <span className="inline-block rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          Leads · Telefonia · CRM — num só painel
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
          Transforme cada lead em{' '}
          <span className="text-brand-gradient">conversa que converte</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
          O CallWe reúne captação de leads, telefonia e CRM numa plataforma só. Sua agência e seus
          clientes acompanham todo o atendimento — do primeiro toque ao fechamento.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={APP_URL}
            className="inline-flex items-center gap-2 rounded-md bg-brand-gradient px-6 py-3 font-medium text-white transition-opacity hover:opacity-90"
          >
            Acessar painel do cliente <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href={SALES_CONTACT}
            className="inline-flex items-center gap-2 rounded-md border px-6 py-3 font-medium hover:bg-muted"
          >
            <MessageSquare className="h-4 w-4" /> Falar com vendas
          </a>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Acesso ao painel é exclusivo para clientes com login.
        </p>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="recursos" className="border-t py-20">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading
          eyebrow="Recursos"
          title="Tudo que o atendimento precisa, integrado"
          subtitle="Pare de pular entre ferramentas. O CallWe junta captação, telefonia e gestão num lugar só."
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-xl border bg-card p-6 transition-shadow hover:shadow-md">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-gradient text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="como-funciona" className="border-t bg-muted/30 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading
          eyebrow="Como funciona"
          title="Do lead ao resultado em 4 passos"
          subtitle="Um fluxo simples que sua equipe entende no primeiro dia."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="relative rounded-xl border bg-card p-6">
              <span className="text-brand-gradient text-3xl font-bold">{s.n}</span>
              <h3 className="mt-2 font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="precos" className="border-t py-20">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading
          eyebrow="Preços"
          title="Planos que crescem com você"
          subtitle="Escolha o plano ideal para o tamanho da sua operação."
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`relative flex flex-col rounded-2xl border p-8 ${
                p.highlight ? 'border-primary shadow-lg' : 'bg-card'
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-gradient px-3 py-1 text-xs font-medium text-white">
                  Mais popular
                </span>
              )}
              <h3 className="font-semibold">{p.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold">{p.price}</span>
                <span className="text-sm text-muted-foreground">{p.period}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{p.desc}</p>
              <ul className="mt-6 flex-1 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-secondary" /> {f}
                  </li>
                ))}
              </ul>
              <a
                href={p.name === 'Agência' ? SALES_CONTACT : APP_URL}
                className={`mt-8 rounded-md px-4 py-2.5 text-center text-sm font-medium transition-opacity hover:opacity-90 ${
                  p.highlight ? 'bg-brand-gradient text-white' : 'border'
                }`}
              >
                {p.cta}
              </a>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          * Valores ilustrativos. Entre em contato para a proposta personalizada.
        </p>
      </div>
    </section>
  );
}

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="border-t bg-muted/30 py-20">
      <div className="mx-auto max-w-3xl px-4">
        <SectionHeading eyebrow="FAQ" title="Perguntas frequentes" />
        <div className="mt-10 space-y-3">
          {FAQ.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={i} className="rounded-xl border bg-card">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left font-medium"
                >
                  {item.q}
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && <p className="px-5 pb-5 text-sm text-muted-foreground">{item.a}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="border-t py-20">
      <div className="mx-auto max-w-5xl px-4">
        <div className="overflow-hidden rounded-3xl bg-brand-gradient px-8 py-14 text-center text-white">
          <h2 className="text-3xl font-bold md:text-4xl">Pronto para organizar seu atendimento?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/90">
            Já é cliente? Acesse seu painel. Quer conhecer? Fale com a gente.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={APP_URL}
              className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 font-medium text-primary transition-opacity hover:opacity-90"
            >
              Acessar painel do cliente <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href={SALES_CONTACT}
              className="inline-flex items-center gap-2 rounded-md border border-white/40 px-6 py-3 font-medium text-white hover:bg-white/10"
            >
              Falar com vendas
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
        <Logo variant="full" className="h-6 w-auto" />
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <a href="/terms" className="hover:text-foreground">
            Termos
          </a>
          <a href="/privacy" className="hover:text-foreground">
            Privacidade
          </a>
          <a href={APP_URL} className="hover:text-foreground">
            Acessar painel
          </a>
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} CallWe. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="text-sm font-semibold uppercase tracking-wide text-secondary">{eyebrow}</span>
      <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
