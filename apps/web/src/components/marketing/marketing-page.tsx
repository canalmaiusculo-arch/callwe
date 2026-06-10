'use client';

import { useEffect, useState } from 'react';
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
  Globe,
} from 'lucide-react';
import { Logo } from '@/components/logo';

// URL do sistema (subdomínio do app). Sobrescreva com NEXT_PUBLIC_APP_URL no build se mudar.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.callwe.digital';
// Contato comercial — ajuste para o canal real (e-mail, WhatsApp, etc.).
const SALES_CONTACT = 'mailto:contato@callwe.digital';

type Locale = 'en' | 'es' | 'pt';
const LOCALES: Locale[] = ['en', 'es', 'pt'];
const LOCALE_LABEL: Record<Locale, string> = { en: 'EN', es: 'ES', pt: 'PT' };

const FEATURE_ICONS = [Magnet, Phone, KanbanSquare, BarChart3, Users, Building2];
// Plano destacado (índice) e plano que leva ao contato de vendas (índice).
const HIGHLIGHT_PLAN = 1;
const SALES_PLAN = 2;

interface Content {
  langName: string;
  nav: { features: string; how: string; pricing: string; faq: string };
  accessShort: string;
  hero: {
    badge: string;
    titleLead: string;
    titleHighlight: string;
    subtitle: string;
    accessPanel: string;
    talkSales: string;
    hint: string;
  };
  features: { eyebrow: string; title: string; subtitle: string; items: Array<{ title: string; desc: string }> };
  how: { eyebrow: string; title: string; subtitle: string; steps: Array<{ title: string; desc: string }> };
  pricing: {
    eyebrow: string;
    title: string;
    subtitle: string;
    note: string;
    popular: string;
    plans: Array<{ name: string; price: string; period: string; desc: string; features: string[]; cta: string }>;
  };
  faq: { eyebrow: string; title: string; items: Array<{ q: string; a: string }> };
  final: { title: string; subtitle: string; accessPanel: string; talkSales: string };
  footer: { terms: string; privacy: string; accessPanel: string; rights: string };
}

const CONTENT: Record<Locale, Content> = {
  en: {
    langName: 'English',
    nav: { features: 'Features', how: 'How it works', pricing: 'Pricing', faq: 'FAQ' },
    accessShort: 'Access panel',
    hero: {
      badge: 'Leads · Calls · CRM — all in one place',
      titleLead: 'Turn every lead into a conversation that',
      titleHighlight: 'closes',
      subtitle:
        'CallWe brings lead capture, phone and CRM together in one platform. Your agency and your clients follow every interaction — from first touch to closed deal.',
      accessPanel: 'Access client panel',
      talkSales: 'Talk to sales',
      hint: 'Panel access is exclusive to clients with a login.',
    },
    features: {
      eyebrow: 'Features',
      title: 'Everything your team needs, integrated',
      subtitle: 'Stop jumping between tools. CallWe unifies capture, calling and management in one place.',
      items: [
        {
          title: 'Centralized lead capture',
          desc: 'Receive leads from Meta Ads, Google, forms and quizzes in one place — via webhook, no spreadsheets and no lost contacts.',
        },
        {
          title: 'Built-in phone',
          desc: 'Inbound and outbound calls logged automatically, with recording, wait time and duration.',
        },
        {
          title: 'CRM & sales pipeline',
          desc: 'Every lead becomes a card with full call, SMS and note history. Track from first contact to close.',
        },
        {
          title: 'Real-time dashboards',
          desc: 'Leads, calls, missed, talk time and per-agent performance — updated every minute.',
        },
        {
          title: 'Team & agents',
          desc: 'Distribute the work, monitor each agent, and see who performs best.',
        },
        {
          title: 'Built for agencies',
          desc: 'Manage multiple clients in separate accounts, with a consolidated agency view and per-client access.',
        },
      ],
    },
    how: {
      eyebrow: 'How it works',
      title: 'From lead to result in 4 steps',
      subtitle: 'A simple flow your team gets on day one.',
      steps: [
        { title: 'Capture', desc: 'Connect your lead sources (Meta, Google, forms, quizzes) or take calls right in the platform.' },
        { title: 'Distribute', desc: 'Leads arrive organized and are routed to the right agents automatically.' },
        { title: 'Engage', desc: 'Call, text and log every interaction without leaving the panel — full history at hand.' },
        { title: 'Measure', desc: 'Track results in clear dashboards and decide based on real data.' },
      ],
    },
    pricing: {
      eyebrow: 'Pricing',
      title: 'Plans that grow with you',
      subtitle: 'Pick the plan that fits your operation.',
      note: '* Illustrative pricing. Contact us for a tailored quote.',
      popular: 'Most popular',
      plans: [
        {
          name: 'Starter',
          price: '$ —',
          period: '/mo',
          desc: 'For teams getting their process organized.',
          features: ['Lead capture via webhook', 'CRM & pipeline', 'Basic dashboards', 'Up to 3 agents'],
          cta: 'Get started',
        },
        {
          name: 'Professional',
          price: '$ —',
          period: '/mo',
          desc: 'For teams that live on calls and lead volume.',
          features: ['Everything in Starter', 'Built-in phone (calls + SMS)', 'Recordings & reports', 'Unlimited agents'],
          cta: 'Subscribe',
        },
        {
          name: 'Agency',
          price: 'Contact us',
          period: '',
          desc: 'For managing multiple clients in one platform.',
          features: ['Everything in Professional', 'Multiple clients', 'Consolidated agency view', 'Dedicated onboarding'],
          cta: 'Talk to sales',
        },
      ],
    },
    faq: {
      eyebrow: 'FAQ',
      title: 'Frequently asked questions',
      items: [
        {
          q: 'What is CallWe?',
          a: 'A platform that brings lead capture, phone and CRM into one panel — built for agencies and their clients to follow the whole process, from first contact to close.',
        },
        {
          q: 'Where do the leads come from?',
          a: 'From Meta Ads, Google, forms and quizzes (via webhook), plus your own inbound calls. Everything arrives organized and tagged by source.',
        },
        {
          q: 'Do I need to change my phone system?',
          a: 'CallWe integrates with your telephony to log calls, recordings and times automatically. Setup is done together with your agency.',
        },
        {
          q: 'Does it work for agencies with many clients?',
          a: 'Yes. Each client lives in a separate account, with the agency getting a consolidated view and each client seeing only their own data.',
        },
        {
          q: 'How do I access the system?',
          a: 'Through the “Access client panel” button. Access is exclusive to those who already have a login — talk to your agency to get yours.',
        },
      ],
    },
    final: {
      title: 'Ready to organize your sales operation?',
      subtitle: "Already a client? Access your panel. Want to see it? Let's talk.",
      accessPanel: 'Access client panel',
      talkSales: 'Talk to sales',
    },
    footer: { terms: 'Terms', privacy: 'Privacy', accessPanel: 'Access panel', rights: 'All rights reserved.' },
  },

  es: {
    langName: 'Español',
    nav: { features: 'Funciones', how: 'Cómo funciona', pricing: 'Precios', faq: 'FAQ' },
    accessShort: 'Acceder al panel',
    hero: {
      badge: 'Leads · Llamadas · CRM — todo en un solo lugar',
      titleLead: 'Convierte cada lead en una conversación que',
      titleHighlight: 'cierra',
      subtitle:
        'CallWe une captación de leads, telefonía y CRM en una sola plataforma. Tu agencia y tus clientes siguen cada interacción — del primer contacto al cierre.',
      accessPanel: 'Acceder al panel',
      talkSales: 'Hablar con ventas',
      hint: 'El acceso al panel es exclusivo para clientes con cuenta.',
    },
    features: {
      eyebrow: 'Funciones',
      title: 'Todo lo que tu equipo necesita, integrado',
      subtitle: 'Deja de saltar entre herramientas. CallWe unifica captación, llamadas y gestión en un solo lugar.',
      items: [
        {
          title: 'Captación de leads centralizada',
          desc: 'Recibe leads de Meta Ads, Google, formularios y quizzes en un solo lugar — vía webhook, sin hojas de cálculo y sin perder contactos.',
        },
        {
          title: 'Telefonía integrada',
          desc: 'Llamadas entrantes y salientes registradas automáticamente, con grabación, tiempo de espera y duración.',
        },
        {
          title: 'CRM y embudo de ventas',
          desc: 'Cada lead se convierte en una ficha con historial completo de llamadas, SMS y notas. Sigue del primer contacto al cierre.',
        },
        {
          title: 'Paneles en tiempo real',
          desc: 'Leads, llamadas, perdidas, tiempo al teléfono y desempeño por agente — actualizados cada minuto.',
        },
        {
          title: 'Equipo y agentes',
          desc: 'Distribuye el trabajo, monitorea a cada agente y ve quién rinde mejor.',
        },
        {
          title: 'Hecho para agencias',
          desc: 'Gestiona varios clientes en cuentas separadas, con una vista consolidada de la agencia y acceso por cliente.',
        },
      ],
    },
    how: {
      eyebrow: 'Cómo funciona',
      title: 'Del lead al resultado en 4 pasos',
      subtitle: 'Un flujo simple que tu equipo entiende desde el primer día.',
      steps: [
        { title: 'Capta', desc: 'Conecta tus fuentes de leads (Meta, Google, formularios, quizzes) o recibe llamadas directamente en la plataforma.' },
        { title: 'Distribuye', desc: 'Los leads llegan organizados y se dirigen a los agentes correctos automáticamente.' },
        { title: 'Atiende', desc: 'Llama, envía SMS y registra cada interacción sin salir del panel — con todo el historial a mano.' },
        { title: 'Mide', desc: 'Sigue los resultados en paneles claros y decide con base en datos reales.' },
      ],
    },
    pricing: {
      eyebrow: 'Precios',
      title: 'Planes que crecen contigo',
      subtitle: 'Elige el plan ideal para el tamaño de tu operación.',
      note: '* Precios ilustrativos. Contáctanos para una propuesta personalizada.',
      popular: 'Más popular',
      plans: [
        {
          name: 'Esencial',
          price: '$ —',
          period: '/mes',
          desc: 'Para quienes empiezan a organizar su proceso.',
          features: ['Captación de leads vía webhook', 'CRM y embudo', 'Paneles básicos', 'Hasta 3 agentes'],
          cta: 'Empezar',
        },
        {
          name: 'Profesional',
          price: '$ —',
          period: '/mes',
          desc: 'Para equipos que viven de llamadas y volumen de leads.',
          features: ['Todo lo de Esencial', 'Telefonía integrada (llamadas + SMS)', 'Grabaciones e informes', 'Agentes ilimitados'],
          cta: 'Suscribirse',
        },
        {
          name: 'Agencia',
          price: 'Consultar',
          period: '',
          desc: 'Para gestionar varios clientes en una sola plataforma.',
          features: ['Todo lo de Profesional', 'Múltiples clientes', 'Vista consolidada de la agencia', 'Onboarding dedicado'],
          cta: 'Hablar con ventas',
        },
      ],
    },
    faq: {
      eyebrow: 'FAQ',
      title: 'Preguntas frecuentes',
      items: [
        {
          q: '¿Qué es CallWe?',
          a: 'Una plataforma que une captación de leads, telefonía y CRM en un solo panel — pensada para agencias y sus clientes para seguir todo el proceso, del primer contacto al cierre.',
        },
        {
          q: '¿De dónde vienen los leads?',
          a: 'De Meta Ads, Google, formularios y quizzes (vía webhook), además de tus propias llamadas entrantes. Todo llega organizado e identificado por origen.',
        },
        {
          q: '¿Necesito cambiar mi telefonía?',
          a: 'CallWe se integra con tu telefonía para registrar llamadas, grabaciones y tiempos automáticamente. La configuración se hace junto con tu agencia.',
        },
        {
          q: '¿Funciona para agencias con varios clientes?',
          a: 'Sí. Cada cliente está en una cuenta separada, con la agencia teniendo una vista consolidada y cada cliente viendo solo sus propios datos.',
        },
        {
          q: '¿Cómo accedo al sistema?',
          a: 'A través del botón “Acceder al panel”. El acceso es exclusivo para quienes ya tienen cuenta — habla con tu agencia para obtener la tuya.',
        },
      ],
    },
    final: {
      title: '¿Listo para organizar tu operación de ventas?',
      subtitle: '¿Ya eres cliente? Accede a tu panel. ¿Quieres conocerlo? Hablemos.',
      accessPanel: 'Acceder al panel',
      talkSales: 'Hablar con ventas',
    },
    footer: { terms: 'Términos', privacy: 'Privacidad', accessPanel: 'Acceder al panel', rights: 'Todos los derechos reservados.' },
  },

  pt: {
    langName: 'Português',
    nav: { features: 'Recursos', how: 'Como funciona', pricing: 'Preços', faq: 'FAQ' },
    accessShort: 'Acessar painel',
    hero: {
      badge: 'Leads · Ligações · CRM — num só lugar',
      titleLead: 'Transforme cada lead em uma conversa que',
      titleHighlight: 'converte',
      subtitle:
        'O CallWe reúne captação de leads, telefonia e CRM numa plataforma só. Sua agência e seus clientes acompanham cada interação — do primeiro contato ao fechamento.',
      accessPanel: 'Acessar painel do cliente',
      talkSales: 'Falar com vendas',
      hint: 'O acesso ao painel é exclusivo para clientes com login.',
    },
    features: {
      eyebrow: 'Recursos',
      title: 'Tudo que sua equipe precisa, integrado',
      subtitle: 'Pare de pular entre ferramentas. O CallWe junta captação, ligações e gestão num lugar só.',
      items: [
        {
          title: 'Captação de leads centralizada',
          desc: 'Receba leads de Meta Ads, Google, formulários e quizz num só lugar — via webhook, sem planilha e sem perder contato.',
        },
        {
          title: 'Telefonia integrada',
          desc: 'Chamadas recebidas e realizadas registradas automaticamente, com gravação, tempo de espera e duração.',
        },
        {
          title: 'CRM e funil de vendas',
          desc: 'Cada lead vira um card com histórico completo de chamadas, SMS e anotações. Acompanhe do primeiro contato ao fechamento.',
        },
        {
          title: 'Dashboards em tempo real',
          desc: 'Leads, chamadas, perdidas, tempo ao telefone e desempenho por atendente — atualizados a cada minuto.',
        },
        {
          title: 'Equipe e atendentes',
          desc: 'Distribua o atendimento, acompanhe cada atendente e veja quem performa melhor.',
        },
        {
          title: 'Feito para agências',
          desc: 'Gerencie vários clientes em contas separadas, com visão consolidada da agência e acesso individual por cliente.',
        },
      ],
    },
    how: {
      eyebrow: 'Como funciona',
      title: 'Do lead ao resultado em 4 passos',
      subtitle: 'Um fluxo simples que sua equipe entende no primeiro dia.',
      steps: [
        { title: 'Capte', desc: 'Conecte suas fontes de leads (Meta, Google, formulários, quizz) ou receba chamadas direto na plataforma.' },
        { title: 'Distribua', desc: 'Os leads chegam organizados e são direcionados para os atendentes certos automaticamente.' },
        { title: 'Atenda', desc: 'Ligue, mande SMS e registre cada interação sem sair do painel — com todo o histórico à mão.' },
        { title: 'Meça', desc: 'Acompanhe os resultados em dashboards claros e tome decisões com base em dados reais.' },
      ],
    },
    pricing: {
      eyebrow: 'Preços',
      title: 'Planos que crescem com você',
      subtitle: 'Escolha o plano ideal para o tamanho da sua operação.',
      note: '* Valores ilustrativos. Entre em contato para a proposta personalizada.',
      popular: 'Mais popular',
      plans: [
        {
          name: 'Essencial',
          price: 'R$ —',
          period: '/mês',
          desc: 'Para quem está começando a organizar o processo.',
          features: ['Captação de leads via webhook', 'CRM e funil', 'Dashboards básicos', 'Até 3 atendentes'],
          cta: 'Começar',
        },
        {
          name: 'Profissional',
          price: 'R$ —',
          period: '/mês',
          desc: 'Para times que vivem de telefonia e volume de leads.',
          features: ['Tudo do Essencial', 'Telefonia integrada (ligações + SMS)', 'Gravações e relatórios', 'Atendentes ilimitados'],
          cta: 'Assinar',
        },
        {
          name: 'Agência',
          price: 'Sob consulta',
          period: '',
          desc: 'Para gerenciar vários clientes numa só plataforma.',
          features: ['Tudo do Profissional', 'Múltiplos clientes', 'Visão consolidada da agência', 'Onboarding dedicado'],
          cta: 'Falar com vendas',
        },
      ],
    },
    faq: {
      eyebrow: 'FAQ',
      title: 'Perguntas frequentes',
      items: [
        {
          q: 'O que é o CallWe?',
          a: 'Uma plataforma que une captação de leads, telefonia e CRM num só painel — pensada para agências e seus clientes acompanharem todo o processo, do primeiro contato ao fechamento.',
        },
        {
          q: 'De onde vêm os leads?',
          a: 'De Meta Ads, Google, formulários e quizz (via webhook), além das próprias chamadas recebidas. Tudo entra organizado e identificado pela origem.',
        },
        {
          q: 'Preciso trocar minha telefonia?',
          a: 'O CallWe integra com a sua telefonia para registrar chamadas, gravações e tempos automaticamente. A configuração é feita junto com a sua agência.',
        },
        {
          q: 'Funciona para agências com vários clientes?',
          a: 'Sim. Cada cliente fica numa conta separada, com a agência tendo uma visão consolidada e cada cliente acessando apenas os próprios dados.',
        },
        {
          q: 'Como acesso o sistema?',
          a: 'Pelo botão “Acessar painel do cliente”. O acesso é exclusivo para quem já tem login — fale com a sua agência para receber o seu.',
        },
      ],
    },
    final: {
      title: 'Pronto para organizar sua operação de vendas?',
      subtitle: 'Já é cliente? Acesse seu painel. Quer conhecer? Fale com a gente.',
      accessPanel: 'Acessar painel do cliente',
      talkSales: 'Falar com vendas',
    },
    footer: { terms: 'Termos', privacy: 'Privacidade', accessPanel: 'Acessar painel', rights: 'Todos os direitos reservados.' },
  },
};

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
      <Features t={t} />
      <HowItWorks t={t} />
      <Pricing t={t} />
      <Faq t={t} />
      <FinalCta t={t} />
      <SiteFooter t={t} />
    </div>
  );
}

function LangSwitcher({
  locale,
  onChange,
}: {
  locale: Locale;
  onChange: (l: Locale) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs">
      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
      {LOCALES.map((l, i) => (
        <span key={l} className="flex items-center">
          {i > 0 && <span className="mx-0.5 text-muted-foreground">·</span>}
          <button
            type="button"
            onClick={() => onChange(l)}
            className={locale === l ? 'font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'}
          >
            {LOCALE_LABEL[l]}
          </button>
        </span>
      ))}
    </div>
  );
}

function SiteHeader({ t, locale, onChange }: { t: Content; locale: Locale; onChange: (l: Locale) => void }) {
  const nav = [
    { href: '#recursos', label: t.nav.features },
    { href: '#como-funciona', label: t.nav.how },
    { href: '#precos', label: t.nav.pricing },
    { href: '#faq', label: t.nav.faq },
  ];
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Logo variant="full" className="h-7 w-auto" />
        <nav className="hidden items-center gap-7 lg:flex">
          {nav.map((n) => (
            <a key={n.href} href={n.href} className="text-sm text-muted-foreground hover:text-foreground">
              {n.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LangSwitcher locale={locale} onChange={onChange} />
          <a
            href={APP_URL}
            className="rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            {t.accessShort}
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
      <div className="mx-auto max-w-6xl px-4 py-20 text-center md:py-28">
        <span className="inline-block rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          {t.hero.badge}
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
          {t.hero.titleLead} <span className="text-brand-gradient">{t.hero.titleHighlight}</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">{t.hero.subtitle}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={APP_URL}
            className="inline-flex items-center gap-2 rounded-md bg-brand-gradient px-6 py-3 font-medium text-white transition-opacity hover:opacity-90"
          >
            {t.hero.accessPanel} <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href={SALES_CONTACT}
            className="inline-flex items-center gap-2 rounded-md border px-6 py-3 font-medium hover:bg-muted"
          >
            <MessageSquare className="h-4 w-4" /> {t.hero.talkSales}
          </a>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">{t.hero.hint}</p>
      </div>
    </section>
  );
}

function Features({ t }: { t: Content }) {
  return (
    <section id="recursos" className="border-t py-20">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading eyebrow={t.features.eyebrow} title={t.features.title} subtitle={t.features.subtitle} />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {t.features.items.map((f, i) => {
            const Icon = FEATURE_ICONS[i] ?? Magnet;
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

function HowItWorks({ t }: { t: Content }) {
  return (
    <section id="como-funciona" className="border-t bg-muted/30 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading eyebrow={t.how.eyebrow} title={t.how.title} subtitle={t.how.subtitle} />
        <div className="mt-12 grid gap-6 md:grid-cols-4">
          {t.how.steps.map((s, i) => (
            <div key={s.title} className="relative rounded-xl border bg-card p-6">
              <span className="text-brand-gradient text-3xl font-bold">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mt-2 font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing({ t }: { t: Content }) {
  return (
    <section id="precos" className="border-t py-20">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading eyebrow={t.pricing.eyebrow} title={t.pricing.title} subtitle={t.pricing.subtitle} />
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {t.pricing.plans.map((p, i) => {
            const highlight = i === HIGHLIGHT_PLAN;
            return (
              <div
                key={p.name}
                className={`relative flex flex-col rounded-2xl border p-8 ${
                  highlight ? 'border-primary shadow-lg' : 'bg-card'
                }`}
              >
                {highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-gradient px-3 py-1 text-xs font-medium text-white">
                    {t.pricing.popular}
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
                  href={i === SALES_PLAN ? SALES_CONTACT : APP_URL}
                  className={`mt-8 rounded-md px-4 py-2.5 text-center text-sm font-medium transition-opacity hover:opacity-90 ${
                    highlight ? 'bg-brand-gradient text-white' : 'border'
                  }`}
                >
                  {p.cta}
                </a>
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">{t.pricing.note}</p>
      </div>
    </section>
  );
}

function Faq({ t }: { t: Content }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="border-t bg-muted/30 py-20">
      <div className="mx-auto max-w-3xl px-4">
        <SectionHeading eyebrow={t.faq.eyebrow} title={t.faq.title} />
        <div className="mt-10 space-y-3">
          {t.faq.items.map((item, i) => {
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

function FinalCta({ t }: { t: Content }) {
  return (
    <section className="border-t py-20">
      <div className="mx-auto max-w-5xl px-4">
        <div className="overflow-hidden rounded-3xl bg-brand-gradient px-8 py-14 text-center text-white">
          <h2 className="text-3xl font-bold md:text-4xl">{t.final.title}</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/90">{t.final.subtitle}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={APP_URL}
              className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 font-medium text-primary transition-opacity hover:opacity-90"
            >
              {t.final.accessPanel} <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href={SALES_CONTACT}
              className="inline-flex items-center gap-2 rounded-md border border-white/40 px-6 py-3 font-medium text-white hover:bg-white/10"
            >
              {t.final.talkSales}
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
        <Logo variant="full" className="h-6 w-auto" />
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <a href="/terms" className="hover:text-foreground">
            {t.footer.terms}
          </a>
          <a href="/privacy" className="hover:text-foreground">
            {t.footer.privacy}
          </a>
          <a href={APP_URL} className="hover:text-foreground">
            {t.footer.accessPanel}
          </a>
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} CallWe. {t.footer.rights}
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
