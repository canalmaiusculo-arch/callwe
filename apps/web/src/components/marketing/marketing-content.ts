// Conteúdo do site institucional (trilíngue). Copy baseada no documento de
// reestruturação. Ajuste textos, contatos e placeholders conforme necessário.

export type Locale = 'en' | 'es' | 'pt';
export const LOCALES: Locale[] = ['en', 'es', 'pt'];
export const LOCALE_FLAG: Record<Locale, string> = {
  en: '/flags/us.png',
  es: '/flags/es.png',
  pt: '/flags/br.png',
};

// URL do sistema (login / client dashboard).
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.callwe.digital';

// Contato comercial — ajuste para os canais reais.
export const CONTACT = {
  phone: '+1 (000) 000-0000',
  phoneHref: 'tel:+10000000000',
  email: 'hello@callwe.digital',
  emailHref: 'mailto:hello@callwe.digital',
  calendar: '#audit',
};

export interface Stat {
  value: string;
  caption: string;
}
export interface TitledItem {
  title: string;
  desc: string;
}
export interface QuizQuestion {
  q: string;
  options: string[];
}

export interface Content {
  langName: string;
  nav: { howItWorks: string; pricing: string; results: string; industries: string; login: string; cta: string };
  hero: {
    eyebrow: string;
    h1: string;
    subhead: string;
    cta: string;
    watch: string;
    trustLine: string;
    trustChips: string[];
    videoPlaceholder: string;
  };
  problem: { headline: string; body: string; stats: Stat[]; punch: string };
  origin: { eyebrow: string; headline: string; body: string[]; results: Stat[]; punch: string };
  solution: { headline: string; body: string; pillars: TitledItem[]; cta: string };
  how: { headline: string; steps: TitledItem[]; tagline: string };
  dashboard: { headline: string; body: string; bullets: TitledItem[]; cta: string; placeholder: string };
  industries: { headline: string; body: string; chips: string[]; line: string };
  pricing: {
    eyebrow: string;
    headline: string;
    subtitle: string;
    plans: { name: string; tagline: string; features: string[]; highlight?: boolean }[];
    cta: string;
    note: string;
  };
  why: { headline: string; cols: [string, string, string]; rowLabel: string; rows: { label: string; values: [string, string, string] }[]; line: string };
  founders: { headline: string; body: string; note: string };
  proof: {
    headline: string;
    featuredKicker: string;
    featuredBody: string;
    featuredResult: string;
    testimonials: { quote: string; who: string }[];
    note: string;
  };
  quiz: {
    headline: string;
    subhead: string;
    step: string; // "Step {n} of {total}"
    questions: QuizQuestion[];
    capture: {
      title: string;
      body: string;
      firstName: string;
      businessName: string;
      phone: string;
      email: string;
      submit: string;
      submitting: string;
      disclaimer: string;
      successTitle: string;
      successBody: string;
      error: string;
    };
  };
  finalCta: { headline: string; subhead: string; cta: string; callLabel: string; emailLabel: string; bookLabel: string };
  footer: { tagline: string; rights: string };
}

const en: Content = {
  langName: 'English',
  nav: { howItWorks: 'How It Works', pricing: 'Pricing', results: 'Results', industries: 'Industries', login: 'Client Panel', cta: 'Book a Free Lead Audit' },
  hero: {
    eyebrow: 'HUMAN SALES TEAM · BUILT FOR U.S. BUSINESSES',
    h1: 'Your next customer called. Did anyone pick up?',
    subhead:
      "Every lead you don't answer in 5 minutes is a customer your competitor just closed. Call We gives you a trained, fluent, fully-managed sales team that answers calls, texts, and form fills in minutes — and a dashboard that shows you every dollar it brings in.",
    cta: 'Book a Free Lead Audit',
    watch: 'Watch how it works (90 sec)',
    trustLine: 'Trusted by home improvement, restaurants, cleaning, construction & service businesses across the U.S.',
    trustChips: ['Fluent English-speaking reps', 'Sub-5-minute response', 'AI-scored every call'],
    videoPlaceholder: 'Institutional video',
  },
  problem: {
    headline: "You're spending money to generate leads. Then losing them in the first hour.",
    body:
      "Most U.S. businesses don't have a sales problem. They have a response problem. The owner is on a job site. The receptionist is busy. The lead sits. By the time someone calls back — three hours later — that customer already hired someone else. This isn't an opinion. It's the most studied number in sales.",
    stats: [
      { value: '100×', caption: 'More likely to reach a lead when you respond in 5 minutes vs. 30 (MIT / Harvard Business Review, 2,241 companies)' },
      { value: '78%', caption: 'Of customers buy from the first business that responds — not the cheapest, not the best' },
      { value: '~80%', caption: 'Drop in lead quality after just 5 minutes of waiting' },
      { value: '47 hrs', caption: 'Average time a business takes to respond to a new lead. 30% are never contacted at all.' },
    ],
    punch: 'You already paid for that lead. The only question is whether you, or your competitor, gets to close it.',
  },
  origin: {
    eyebrow: 'WHY CALL WE EXISTS',
    headline: "We learned this the hard way — inside one of Florida's biggest construction companies.",
    body: [
      "Call We didn't start as a software idea. It started as a frustration. Our founders ran strategy for one of the largest construction companies in Florida. For months we built funnels, ran campaigns, and poured fuel on demand generation. The leads came in. The customers came in. And yet — revenue barely moved.",
      "So we followed the customer's actual journey inside the company. What we found was the real leak: it was never a demand problem. It was a relationship problem. Leads were arriving and dying in the gap between “interested” and “customer” — because nobody owned the commercial side. No scripts. No follow-up. No process. No team built to close.",
      'So we built one: scripts, a trained sales team, a CRM, follow-up systems, coaching — an actual commercial department where there had been none. The result, the very next month:',
    ],
    results: [
      { value: '2×', caption: 'Sales doubled the following month — with the same lead volume' },
      { value: '3.1×', caption: "Increase in the company's overall ROI" },
      { value: '$0 extra', caption: "Spent on marketing. We didn't generate more demand. We stopped wasting it." },
    ],
    punch: "A simple commercial fix outperformed every marketing campaign we'd ever run. That's when we realized this isn't one company's problem — it's nearly every company's. So we built Call We to fix it everywhere.",
  },
  solution: {
    headline: 'Call We is your outsourced sales department — answering in minutes, trained to close.',
    body:
      "We took the exact engine that doubled revenue inside a Florida construction giant and turned it into a service. We're not an answering service that takes a message — we're a managed sales team that sells. Real, fluent English-speaking reps trained in your business, responding to every call, text, email, and form fill — fast — and following up until the deal is won or lost.",
    pillars: [
      { title: 'Speed to lead', desc: 'Every inbound lead answered in minutes, not hours. Nights and weekends included.' },
      { title: 'Trained to sell, not just answer', desc: 'Real sales reps doing qualification, follow-up, and recovery — not voicemail.' },
      { title: 'Total visibility', desc: 'A complete commercial dashboard so you see every call, score, and close in real time.' },
    ],
    cta: 'Book a Free Lead Audit',
  },
  how: {
    headline: 'How Call We plugs into your business',
    steps: [
      { title: 'Connect your channels', desc: 'Meta Ads, Google, Google Local Services, website forms, your phone line — wherever leads come in, we connect to it.' },
      { title: 'We answer in minutes', desc: 'Your dedicated, fluent reps respond instantly, qualify the lead, and book or close.' },
      { title: 'We follow up relentlessly', desc: 'Automated + human follow-up and lead recovery so no opportunity goes cold.' },
      { title: 'You watch it all in the dashboard', desc: 'Every call recorded, AI-scored, and summarized. Closes, missed calls, follow-ups — all in one place.' },
    ],
    tagline: 'Wherever your lead goes, we go after it.',
  },
  dashboard: {
    headline: "Don't take our word for it. Watch the scoreboard.",
    body: 'Every Call We client gets a full commercial dashboard. Not a black box — a live scoreboard of your sales operation.',
    bullets: [
      { title: 'AI call scoring', desc: 'Our AI grades and summarizes every call, so you see quality, not just quantity.' },
      { title: 'Answered vs. missed', desc: 'Know exactly how many opportunities were caught and how many would have slipped.' },
      { title: 'Follow-ups & recovery', desc: 'See every follow-up made each day and every lead pulled back from cold.' },
      { title: 'Closes & revenue', desc: 'Track deals won, attributed to the source that drove them.' },
      { title: 'Source integrations', desc: 'Meta, Google, Google Guaranteed, website forms — all feeding one view.' },
    ],
    cta: 'See the dashboard live',
    placeholder: 'Dashboard preview',
  },
  industries: {
    headline: 'Built for businesses that live and die by inbound leads',
    body:
      'We specialize in home improvement — roofing, HVAC, remodeling, solar, and the trades — where a single lead can be worth thousands. But the speed-to-lead problem is universal, and so is our solution.',
    chips: ['Home Improvement & Trades', 'Restaurants', 'Cleaning Services', 'Construction', '+ Any business that takes inbound calls'],
    line: 'If your business needs to sell, Call We has a seat for you.',
  },
  pricing: {
    eyebrow: 'Plans',
    headline: 'Plans built around your numbers',
    subtitle:
      "No rigid tiers. Tell us your volume and goals, and we'll tailor the right plan — answer your leads, add follow-up, or scale to high call volume.",
    plans: [
      {
        name: 'Essential',
        tagline: 'For businesses that just need every lead answered, fast.',
        features: ['Speed-to-lead answering (calls, texts, forms)', 'Lead qualification', 'Live commercial dashboard', 'AI-scored calls'],
      },
      {
        name: 'Follow-Up',
        tagline: 'Answering plus relentless follow-up and lead recovery.',
        features: ['Everything in Essential', 'Automated + human follow-up', 'Lead recovery from cold', 'Daily follow-up tracking'],
        highlight: true,
      },
      {
        name: 'High Volume',
        tagline: 'For operations taking 500+ calls a month.',
        features: ['Everything in Follow-Up', 'Dedicated rep team', 'Priority routing & coverage', 'Custom reporting & integrations'],
      },
    ],
    cta: 'Request a custom plan',
    note: "Every business is different — no two plans are the same. Answer a few questions and we'll recommend the right one.",
  },
  why: {
    headline: 'Why owners choose Call We over hiring in-house',
    cols: ['In-house / DIY', 'Answering service', 'Call We'],
    rowLabel: '',
    rows: [
      { label: 'Response time', values: ['Hours (owner is busy)', 'Minutes (takes a message)', 'Minutes — and they sell'] },
      { label: 'Sales training', values: ['Rarely', 'None', 'Trained closers'] },
      { label: 'Follow-up & recovery', values: ['Inconsistent', 'None', 'Systematic'] },
      { label: 'Fluent English reps', values: ['Varies', 'Varies', 'Always'] },
      { label: 'Performance visibility', values: ['None', 'None', 'Full AI-scored dashboard'] },
      { label: 'Cost', values: ['Salary + benefits + ramp', 'Cheap, low value', 'A fraction of a hire'] },
    ],
    line: 'Hiring one sales rep costs a salary, benefits, training, and months of ramp — for one person who sleeps. Call We is an entire trained team for less.',
  },
  founders: {
    headline: 'Built by the people who fixed the commercial side — not consultants who read about it.',
    body:
      "We're not a call center that decided to sell sales. The founders of Call We came out of the strategy team at one of Florida's largest construction companies, where we built the exact commercial engine we now run for our clients — and watched it double sales and lift ROI 3.1× in a single month. Every script, every follow-up cadence, every coaching standard was forged on a real sales floor, against real revenue targets.",
    note: 'Founder photos & credentials coming soon.',
  },
  proof: {
    headline: 'The numbers our clients see',
    featuredKicker: 'The case that started it all',
    featuredBody:
      'Inside one of Florida’s largest construction companies, we replaced “no commercial process” with a trained team, scripts, CRM, and relentless follow-up. Same leads. Same marketing budget.',
    featuredResult: 'Sales doubled in 30 days and overall ROI jumped 3.1×.',
    testimonials: [
      { quote: 'We booked 40% more estimates in the first month without lifting a finger.', who: '[Name], [Company], [City]' },
      { quote: 'We never miss a call anymore — and we can prove it.', who: '[Name], [Company]' },
      { quote: 'The dashboard finally shows us where every lead goes.', who: '[Name], [Company]' },
    ],
    note: 'Real client quotes, logos, and metrics will replace these as we collect them.',
  },
  quiz: {
    headline: 'How much revenue is your response time costing you?',
    subhead: "Answer 5 quick questions and we'll show you — free.",
    step: 'Step',
    questions: [
      { q: 'What industry are you in?', options: ['Home Improvement / Trades', 'Restaurant', 'Cleaning', 'Construction', 'Other'] },
      { q: 'Roughly how many leads do you get per month?', options: ['Under 25', '25–100', '100–300', '300+'] },
      { q: 'How fast does your business answer a new lead today?', options: ['Within 5 minutes', 'Within an hour', 'A few hours', 'Honestly, not sure'] },
      { q: 'Who answers your leads right now?', options: ['Me (the owner)', 'A receptionist / admin', 'A sales rep', 'Nobody consistently'] },
      { q: "What's your average customer worth?", options: ['Under $500', '$500–$2,000', '$2,000–$10,000', '$10,000+'] },
      {
        q: 'Which plan sounds right for you?',
        options: ['Essential — just answer my leads', 'Follow-Up — answering + relentless follow-up', 'High Volume — 500+ calls/month', 'Not sure — help me choose'],
      },
    ],
    capture: {
      title: 'Your Lead Audit is ready.',
      body: "Drop your details and we'll show you exactly what slow response is costing you — and what Call We recovers.",
      firstName: 'First name',
      businessName: 'Business name',
      phone: 'Phone',
      email: 'Email',
      submit: "Show Me What I'm Losing",
      submitting: 'Sending…',
      disclaimer: 'No spam. No pressure. Just your numbers.',
      successTitle: "You're in. We'll be in touch — fast.",
      successBody: "That's exactly the speed we'll bring to your customers. Talk soon.",
      error: 'Something went wrong. Please try again or contact us directly.',
    },
  },
  finalCta: {
    headline: 'Your competitors are answering. Are you?',
    subhead:
      "Book a free lead audit. We'll review how your leads are handled today and show you the revenue hiding in your response time.",
    cta: 'Book a Free Lead Audit',
    callLabel: 'Call / text',
    emailLabel: 'Email',
    bookLabel: 'Book a time',
  },
  footer: { tagline: 'Outsourced sales teams for U.S. businesses.', rights: 'All rights reserved.' },
};

const es: Content = {
  langName: 'Español',
  nav: { howItWorks: 'Cómo funciona', pricing: 'Planes', results: 'Resultados', industries: 'Industrias', login: 'Panel del cliente', cta: 'Auditoría de Leads Gratis' },
  hero: {
    eyebrow: 'EQUIPO DE VENTAS HUMANO · HECHO PARA EMPRESAS EN EE. UU.',
    h1: 'Tu próximo cliente llamó. ¿Alguien contestó?',
    subhead:
      'Cada lead que no respondes en 5 minutos es un cliente que tu competencia acaba de cerrar. Call We te da un equipo de ventas entrenado, fluido y totalmente gestionado que responde llamadas, mensajes y formularios en minutos — y un panel que te muestra cada dólar que genera.',
    cta: 'Auditoría de Leads Gratis',
    watch: 'Mira cómo funciona (90 seg)',
    trustLine: 'Usado por negocios de remodelación, restaurantes, limpieza, construcción y servicios en todo EE. UU.',
    trustChips: ['Agentes con inglés fluido', 'Respuesta en menos de 5 min', 'Cada llamada calificada con IA'],
    videoPlaceholder: 'Video institucional',
  },
  problem: {
    headline: 'Gastas dinero para generar leads. Y los pierdes en la primera hora.',
    body:
      'La mayoría de los negocios en EE. UU. no tienen un problema de ventas. Tienen un problema de respuesta. El dueño está en obra. La recepcionista está ocupada. El lead espera. Para cuando alguien devuelve la llamada — tres horas después — ese cliente ya contrató a otro. No es una opinión: es el número más estudiado en ventas.',
    stats: [
      { value: '100×', caption: 'Más probabilidades de contactar un lead respondiendo en 5 minutos vs. 30 (MIT / Harvard Business Review, 2.241 empresas)' },
      { value: '78%', caption: 'De los clientes compran al primer negocio que responde — no al más barato ni al mejor' },
      { value: '~80%', caption: 'Caída en la calidad del lead tras solo 5 minutos de espera' },
      { value: '47 hrs', caption: 'Tiempo promedio que tarda un negocio en responder un lead nuevo. Al 30% nunca lo contactan.' },
    ],
    punch: 'Ya pagaste por ese lead. La única pregunta es si tú, o tu competencia, lo cierra.',
  },
  origin: {
    eyebrow: 'POR QUÉ EXISTE CALL WE',
    headline: 'Lo aprendimos a las malas — dentro de una de las constructoras más grandes de Florida.',
    body: [
      'Call We no nació como una idea de software. Nació de una frustración. Nuestros fundadores dirigían la estrategia de una de las constructoras más grandes de Florida. Durante meses construimos embudos, lanzamos campañas y le metimos combustible a la generación de demanda. Los leads llegaban. Los clientes llegaban. Y aun así — los ingresos casi no se movían.',
      'Así que seguimos el recorrido real del cliente dentro de la empresa. La fuga real no era de demanda: era de relación. Los leads llegaban y morían en el espacio entre “interesado” y “cliente” — porque nadie era dueño del lado comercial. Sin guiones. Sin seguimiento. Sin proceso. Sin un equipo armado para cerrar.',
      'Así que lo construimos: guiones, un equipo de ventas entrenado, un CRM, sistemas de seguimiento, coaching — un departamento comercial de verdad donde no había ninguno. El resultado, al mes siguiente:',
    ],
    results: [
      { value: '2×', caption: 'Las ventas se duplicaron al mes siguiente — con el mismo volumen de leads' },
      { value: '3.1×', caption: 'Aumento en el ROI general de la empresa' },
      { value: '$0 extra', caption: 'Gastado en marketing. No generamos más demanda. Dejamos de desperdiciarla.' },
    ],
    punch: 'Un simple arreglo comercial superó a toda campaña de marketing que habíamos hecho. Ahí entendimos que no es el problema de una empresa — es el de casi todas. Por eso creamos Call We.',
  },
  solution: {
    headline: 'Call We es tu departamento de ventas tercerizado — responde en minutos, entrenado para cerrar.',
    body:
      'Tomamos el mismo motor que duplicó los ingresos dentro de una gran constructora de Florida y lo convertimos en un servicio. No somos un servicio de recados — somos un equipo de ventas gestionado que vende. Agentes reales con inglés fluido, entrenados en tu negocio, respondiendo cada llamada, mensaje, correo y formulario — rápido — y haciendo seguimiento hasta ganar o perder el trato.',
    pillars: [
      { title: 'Velocidad al lead', desc: 'Cada lead entrante respondido en minutos, no en horas. Noches y fines de semana incluidos.' },
      { title: 'Entrenados para vender, no solo contestar', desc: 'Agentes de ventas reales calificando, dando seguimiento y recuperando — no buzón de voz.' },
      { title: 'Visibilidad total', desc: 'Un panel comercial completo para ver cada llamada, calificación y cierre en tiempo real.' },
    ],
    cta: 'Auditoría de Leads Gratis',
  },
  how: {
    headline: 'Cómo se conecta Call We a tu negocio',
    steps: [
      { title: 'Conecta tus canales', desc: 'Meta Ads, Google, Google Local Services, formularios web, tu línea telefónica — donde sea que lleguen los leads, nos conectamos.' },
      { title: 'Respondemos en minutos', desc: 'Tus agentes dedicados y fluidos responden al instante, califican el lead y agendan o cierran.' },
      { title: 'Hacemos seguimiento sin descanso', desc: 'Seguimiento automático + humano y recuperación de leads para que ninguna oportunidad se enfríe.' },
      { title: 'Tú lo ves todo en el panel', desc: 'Cada llamada grabada, calificada por IA y resumida. Cierres, llamadas perdidas, seguimientos — todo en un lugar.' },
    ],
    tagline: 'A donde vaya tu lead, vamos tras él.',
  },
  dashboard: {
    headline: 'No nos creas a nosotros. Mira el marcador.',
    body: 'Cada cliente de Call We recibe un panel comercial completo. No una caja negra — un marcador en vivo de tu operación de ventas.',
    bullets: [
      { title: 'Calificación de llamadas con IA', desc: 'Nuestra IA evalúa y resume cada llamada, para que veas calidad, no solo cantidad.' },
      { title: 'Contestadas vs. perdidas', desc: 'Sabe exactamente cuántas oportunidades se atendieron y cuántas se habrían escapado.' },
      { title: 'Seguimientos y recuperación', desc: 'Ve cada seguimiento del día y cada lead rescatado del olvido.' },
      { title: 'Cierres e ingresos', desc: 'Mide los tratos ganados, atribuidos a la fuente que los generó.' },
      { title: 'Integraciones de fuentes', desc: 'Meta, Google, Google Guaranteed, formularios web — todo en una sola vista.' },
    ],
    cta: 'Ver el panel en vivo',
    placeholder: 'Vista previa del panel',
  },
  industries: {
    headline: 'Hecho para negocios que viven de los leads entrantes',
    body:
      'Nos especializamos en remodelación del hogar — techos, HVAC, remodelaciones, solar y los oficios — donde un solo lead puede valer miles. Pero el problema de velocidad al lead es universal, y nuestra solución también.',
    chips: ['Remodelación y oficios', 'Restaurantes', 'Servicios de limpieza', 'Construcción', '+ Cualquier negocio que reciba llamadas'],
    line: 'Si tu negocio necesita vender, Call We tiene un lugar para ti.',
  },
  pricing: {
    eyebrow: 'Planes',
    headline: 'Planes hechos a la medida de tus números',
    subtitle:
      'Sin niveles rígidos. Cuéntanos tu volumen y tus metas, y armamos el plan correcto — responder tus leads, sumar seguimiento o escalar a alto volumen de llamadas.',
    plans: [
      {
        name: 'Esencial',
        tagline: 'Para negocios que solo necesitan que cada lead se responda, rápido.',
        features: ['Respuesta veloz (llamadas, mensajes, formularios)', 'Calificación de leads', 'Panel comercial en vivo', 'Llamadas calificadas con IA'],
      },
      {
        name: 'Seguimiento',
        tagline: 'Respuesta más seguimiento y recuperación de leads sin descanso.',
        features: ['Todo lo de Esencial', 'Seguimiento automático + humano', 'Recuperación de leads fríos', 'Seguimiento diario'],
        highlight: true,
      },
      {
        name: 'Alto Volumen',
        tagline: 'Para operaciones con 500+ llamadas al mes.',
        features: ['Todo lo de Seguimiento', 'Equipo de agentes dedicado', 'Enrutamiento y cobertura prioritarios', 'Reportes e integraciones a medida'],
      },
    ],
    cta: 'Solicita un plan personalizado',
    note: 'Cada negocio es distinto — no hay dos planes iguales. Responde unas preguntas y te recomendamos el correcto.',
  },
  why: {
    headline: 'Por qué los dueños eligen Call We en vez de contratar internamente',
    cols: ['Interno / por tu cuenta', 'Servicio de recados', 'Call We'],
    rowLabel: '',
    rows: [
      { label: 'Tiempo de respuesta', values: ['Horas (el dueño está ocupado)', 'Minutos (toma un recado)', 'Minutos — y venden'] },
      { label: 'Entrenamiento en ventas', values: ['Casi nunca', 'Ninguno', 'Cerradores entrenados'] },
      { label: 'Seguimiento y recuperación', values: ['Inconsistente', 'Ninguno', 'Sistemático'] },
      { label: 'Agentes con inglés fluido', values: ['Varía', 'Varía', 'Siempre'] },
      { label: 'Visibilidad de desempeño', values: ['Ninguna', 'Ninguna', 'Panel completo con IA'] },
      { label: 'Costo', values: ['Salario + beneficios + arranque', 'Barato, poco valor', 'Una fracción de una contratación'] },
    ],
    line: 'Contratar a un vendedor cuesta salario, beneficios, capacitación y meses de arranque — por una sola persona que duerme. Call We es un equipo entrenado completo por menos.',
  },
  founders: {
    headline: 'Hecho por quienes arreglaron el lado comercial — no por consultores que leyeron sobre él.',
    body:
      'No somos un call center que decidió vender ventas. Los fundadores de Call We vienen del equipo de estrategia de una de las constructoras más grandes de Florida, donde construimos el mismo motor comercial que hoy operamos para nuestros clientes — y lo vimos duplicar ventas y subir el ROI 3.1× en un solo mes. Cada guion, cada cadencia de seguimiento y cada estándar de coaching se forjó en un piso de ventas real, contra metas reales.',
    note: 'Fotos y credenciales de los fundadores próximamente.',
  },
  proof: {
    headline: 'Los números que ven nuestros clientes',
    featuredKicker: 'El caso que lo empezó todo',
    featuredBody:
      'Dentro de una de las constructoras más grandes de Florida, reemplazamos “sin proceso comercial” por un equipo entrenado, guiones, CRM y seguimiento implacable. Mismos leads. Mismo presupuesto de marketing.',
    featuredResult: 'Las ventas se duplicaron en 30 días y el ROI general subió 3.1×.',
    testimonials: [
      { quote: 'Agendamos 40% más estimados el primer mes sin mover un dedo.', who: '[Nombre], [Empresa], [Ciudad]' },
      { quote: 'Ya no perdemos ni una llamada — y podemos demostrarlo.', who: '[Nombre], [Empresa]' },
      { quote: 'El panel por fin nos muestra a dónde va cada lead.', who: '[Nombre], [Empresa]' },
    ],
    note: 'Reemplazaremos esto con citas, logos y métricas reales de clientes a medida que los recopilemos.',
  },
  quiz: {
    headline: '¿Cuántos ingresos te está costando tu tiempo de respuesta?',
    subhead: 'Responde 5 preguntas rápidas y te lo mostramos — gratis.',
    step: 'Paso',
    questions: [
      { q: '¿En qué industria estás?', options: ['Remodelación / oficios', 'Restaurante', 'Limpieza', 'Construcción', 'Otra'] },
      { q: '¿Cuántos leads recibes al mes, más o menos?', options: ['Menos de 25', '25–100', '100–300', '300+'] },
      { q: '¿Qué tan rápido respondes hoy un lead nuevo?', options: ['En 5 minutos', 'En una hora', 'Unas horas', 'La verdad, no sé'] },
      { q: '¿Quién responde tus leads ahora?', options: ['Yo (el dueño)', 'Recepcionista / admin', 'Un vendedor', 'Nadie de forma constante'] },
      { q: '¿Cuánto vale tu cliente promedio?', options: ['Menos de $500', '$500–$2,000', '$2,000–$10,000', '$10,000+'] },
      {
        q: '¿Qué plan te suena mejor?',
        options: ['Esencial — solo responder mis leads', 'Seguimiento — respuesta + seguimiento constante', 'Alto Volumen — 500+ llamadas/mes', 'No sé — ayúdame a elegir'],
      },
    ],
    capture: {
      title: 'Tu Auditoría de Leads está lista.',
      body: 'Déjanos tus datos y te mostramos exactamente lo que te cuesta la respuesta lenta — y lo que Call We recupera.',
      firstName: 'Nombre',
      businessName: 'Nombre del negocio',
      phone: 'Teléfono',
      email: 'Correo',
      submit: 'Muéstrame lo que estoy perdiendo',
      submitting: 'Enviando…',
      disclaimer: 'Sin spam. Sin presión. Solo tus números.',
      successTitle: 'Listo. Te contactamos — rápido.',
      successBody: 'Esa es justo la velocidad que les daremos a tus clientes. Hablamos pronto.',
      error: 'Algo salió mal. Inténtalo de nuevo o contáctanos directamente.',
    },
  },
  finalCta: {
    headline: 'Tu competencia está contestando. ¿Y tú?',
    subhead:
      'Agenda una auditoría de leads gratis. Revisamos cómo manejas tus leads hoy y te mostramos los ingresos escondidos en tu tiempo de respuesta.',
    cta: 'Auditoría de Leads Gratis',
    callLabel: 'Llamar / mensaje',
    emailLabel: 'Correo',
    bookLabel: 'Agendar una hora',
  },
  footer: { tagline: 'Equipos de ventas tercerizados para empresas en EE. UU.', rights: 'Todos los derechos reservados.' },
};

const pt: Content = {
  langName: 'Português',
  nav: { howItWorks: 'Como funciona', pricing: 'Planos', results: 'Resultados', industries: 'Setores', login: 'Painel do cliente', cta: 'Auditoria de Leads Grátis' },
  hero: {
    eyebrow: 'TIME DE VENDAS HUMANO · FEITO PARA EMPRESAS NOS EUA',
    h1: 'Seu próximo cliente ligou. Alguém atendeu?',
    subhead:
      'Cada lead que você não responde em 5 minutos é um cliente que seu concorrente acabou de fechar. A Call We te dá um time de vendas treinado, fluente e totalmente gerenciado que responde ligações, mensagens e formulários em minutos — e um painel que mostra cada dólar que isso gera.',
    cta: 'Auditoria de Leads Grátis',
    watch: 'Veja como funciona (90 seg)',
    trustLine: 'Usado por empresas de reforma, restaurantes, limpeza, construção e serviços em todos os EUA.',
    trustChips: ['Atendentes com inglês fluente', 'Resposta em menos de 5 min', 'Cada ligação avaliada por IA'],
    videoPlaceholder: 'Vídeo institucional',
  },
  problem: {
    headline: 'Você gasta dinheiro pra gerar leads. E os perde na primeira hora.',
    body:
      'A maioria das empresas nos EUA não tem um problema de vendas. Tem um problema de resposta. O dono está na obra. A recepcionista está ocupada. O lead espera. Quando alguém retorna a ligação — três horas depois — esse cliente já contratou outro. Não é opinião: é o número mais estudado em vendas.',
    stats: [
      { value: '100×', caption: 'Mais chances de alcançar um lead respondendo em 5 minutos vs. 30 (MIT / Harvard Business Review, 2.241 empresas)' },
      { value: '78%', caption: 'Dos clientes compram da primeira empresa que responde — não da mais barata nem da melhor' },
      { value: '~80%', caption: 'Queda na qualidade do lead após apenas 5 minutos de espera' },
      { value: '47 hrs', caption: 'Tempo médio que uma empresa leva pra responder um lead novo. 30% nunca são contatados.' },
    ],
    punch: 'Você já pagou por esse lead. A única dúvida é se você, ou seu concorrente, vai fechá-lo.',
  },
  origin: {
    eyebrow: 'POR QUE A CALL WE EXISTE',
    headline: 'Aprendemos isso na marra — dentro de uma das maiores construtoras da Flórida.',
    body: [
      'A Call We não nasceu como ideia de software. Nasceu de uma frustração. Nossos fundadores tocavam a estratégia de uma das maiores construtoras da Flórida. Por meses construímos funis, rodamos campanhas e jogamos combustível na geração de demanda. Os leads chegavam. Os clientes chegavam. E mesmo assim — a receita mal se mexia.',
      'Então seguimos a jornada real do cliente dentro da empresa. O vazamento real não era de demanda: era de relacionamento. Os leads chegavam e morriam no espaço entre “interessado” e “cliente” — porque ninguém era dono do lado comercial. Sem scripts. Sem follow-up. Sem processo. Sem time montado pra fechar.',
      'Então montamos um: scripts, um time de vendas treinado, um CRM, sistemas de follow-up, coaching — um departamento comercial de verdade onde não havia nenhum. O resultado, já no mês seguinte:',
    ],
    results: [
      { value: '2×', caption: 'As vendas dobraram no mês seguinte — com o mesmo volume de leads' },
      { value: '3.1×', caption: 'Aumento no ROI geral da empresa' },
      { value: '$0 a mais', caption: 'Gasto em marketing. Não geramos mais demanda. Paramos de desperdiçá-la.' },
    ],
    punch: 'Um simples ajuste comercial superou toda campanha de marketing que já tínhamos feito. Aí entendemos que não é o problema de uma empresa — é de quase todas. Por isso criamos a Call We.',
  },
  solution: {
    headline: 'A Call We é seu departamento de vendas terceirizado — responde em minutos, treinado pra fechar.',
    body:
      'Pegamos o mesmo motor que dobrou a receita dentro de uma gigante da construção na Flórida e transformamos em serviço. Não somos uma secretária eletrônica que anota recado — somos um time de vendas gerenciado que vende. Atendentes reais com inglês fluente, treinados no seu negócio, respondendo cada ligação, mensagem, e-mail e formulário — rápido — e fazendo follow-up até ganhar ou perder o negócio.',
    pillars: [
      { title: 'Velocidade no lead', desc: 'Cada lead que entra respondido em minutos, não em horas. Noites e fins de semana inclusos.' },
      { title: 'Treinados pra vender, não só atender', desc: 'Vendedores reais qualificando, fazendo follow-up e recuperando — não caixa postal.' },
      { title: 'Visibilidade total', desc: 'Um painel comercial completo pra você ver cada ligação, nota e fechamento em tempo real.' },
    ],
    cta: 'Auditoria de Leads Grátis',
  },
  how: {
    headline: 'Como a Call We se conecta ao seu negócio',
    steps: [
      { title: 'Conecte seus canais', desc: 'Meta Ads, Google, Google Local Services, formulários do site, sua linha telefônica — de onde vierem os leads, a gente conecta.' },
      { title: 'Respondemos em minutos', desc: 'Seus atendentes dedicados e fluentes respondem na hora, qualificam o lead e agendam ou fecham.' },
      { title: 'Fazemos follow-up sem parar', desc: 'Follow-up automático + humano e recuperação de leads pra nenhuma oportunidade esfriar.' },
      { title: 'Você vê tudo no painel', desc: 'Cada ligação gravada, avaliada por IA e resumida. Fechamentos, perdidas, follow-ups — tudo num lugar.' },
    ],
    tagline: 'Pra onde seu lead for, a gente vai atrás.',
  },
  dashboard: {
    headline: 'Não acredite na gente. Olhe o placar.',
    body: 'Todo cliente Call We recebe um painel comercial completo. Não uma caixa-preta — um placar ao vivo da sua operação de vendas.',
    bullets: [
      { title: 'Avaliação de ligações por IA', desc: 'Nossa IA avalia e resume cada ligação, pra você ver qualidade, não só quantidade.' },
      { title: 'Atendidas vs. perdidas', desc: 'Saiba exatamente quantas oportunidades foram pegas e quantas teriam escapado.' },
      { title: 'Follow-ups e recuperação', desc: 'Veja cada follow-up feito no dia e cada lead resgatado do esquecimento.' },
      { title: 'Fechamentos e receita', desc: 'Acompanhe negócios ganhos, atribuídos à fonte que os trouxe.' },
      { title: 'Integrações de fontes', desc: 'Meta, Google, Google Guaranteed, formulários do site — tudo numa visão só.' },
    ],
    cta: 'Ver o painel ao vivo',
    placeholder: 'Prévia do painel',
  },
  industries: {
    headline: 'Feito para negócios que vivem de leads que entram',
    body:
      'Somos especialistas em reforma residencial — telhados, climatização, remodelação, solar e os ofícios — onde um único lead pode valer milhares. Mas o problema de velocidade no lead é universal, e nossa solução também.',
    chips: ['Reforma e ofícios', 'Restaurantes', 'Serviços de limpeza', 'Construção', '+ Qualquer negócio que recebe ligações'],
    line: 'Se o seu negócio precisa vender, a Call We tem um lugar pra você.',
  },
  pricing: {
    eyebrow: 'Planos',
    headline: 'Planos sob medida pros seus números',
    subtitle:
      'Sem níveis rígidos. Conta pra gente seu volume e suas metas, e a gente monta o plano certo — responder seus leads, adicionar follow-up ou escalar pra alto volume de ligações.',
    plans: [
      {
        name: 'Essencial',
        tagline: 'Para quem só precisa que cada lead seja respondido, rápido.',
        features: ['Resposta veloz (ligações, mensagens, formulários)', 'Qualificação de leads', 'Painel comercial ao vivo', 'Ligações avaliadas por IA'],
      },
      {
        name: 'Follow-up',
        tagline: 'Resposta mais follow-up e recuperação de leads sem parar.',
        features: ['Tudo do Essencial', 'Follow-up automático + humano', 'Recuperação de leads frios', 'Acompanhamento diário de follow-up'],
        highlight: true,
      },
      {
        name: 'Alto Volume',
        tagline: 'Para operações com 500+ ligações por mês.',
        features: ['Tudo do Follow-up', 'Time de atendentes dedicado', 'Roteamento e cobertura prioritários', 'Relatórios e integrações sob medida'],
      },
    ],
    cta: 'Solicite um plano personalizado',
    note: 'Cada negócio é diferente — não existem dois planos iguais. Responda algumas perguntas e a gente recomenda o ideal.',
  },
  why: {
    headline: 'Por que os donos escolhem a Call We em vez de contratar internamente',
    cols: ['Interno / por conta', 'Secretária eletrônica', 'Call We'],
    rowLabel: '',
    rows: [
      { label: 'Tempo de resposta', values: ['Horas (o dono está ocupado)', 'Minutos (só anota recado)', 'Minutos — e eles vendem'] },
      { label: 'Treinamento de vendas', values: ['Quase nunca', 'Nenhum', 'Vendedores treinados'] },
      { label: 'Follow-up e recuperação', values: ['Inconsistente', 'Nenhum', 'Sistemático'] },
      { label: 'Atendentes com inglês fluente', values: ['Varia', 'Varia', 'Sempre'] },
      { label: 'Visibilidade de desempenho', values: ['Nenhuma', 'Nenhuma', 'Painel completo com IA'] },
      { label: 'Custo', values: ['Salário + benefícios + rampa', 'Barato, pouco valor', 'Uma fração de uma contratação'] },
    ],
    line: 'Contratar um vendedor custa salário, benefícios, treinamento e meses de rampa — por uma pessoa só, que dorme. A Call We é um time treinado inteiro por menos.',
  },
  founders: {
    headline: 'Feito por quem consertou o lado comercial — não por consultores que leram sobre isso.',
    body:
      'Não somos um call center que resolveu vender vendas. Os fundadores da Call We vêm do time de estratégia de uma das maiores construtoras da Flórida, onde construímos o mesmo motor comercial que hoje operamos pros nossos clientes — e vimos dobrar as vendas e subir o ROI 3.1× num único mês. Cada script, cada cadência de follow-up e cada padrão de coaching foi forjado num chão de vendas real, contra metas reais.',
    note: 'Fotos e credenciais dos fundadores em breve.',
  },
  proof: {
    headline: 'Os números que nossos clientes veem',
    featuredKicker: 'O caso que começou tudo',
    featuredBody:
      'Dentro de uma das maiores construtoras da Flórida, trocamos o “sem processo comercial” por um time treinado, scripts, CRM e follow-up implacável. Mesmos leads. Mesmo orçamento de marketing.',
    featuredResult: 'As vendas dobraram em 30 dias e o ROI geral subiu 3.1×.',
    testimonials: [
      { quote: 'Agendamos 40% mais orçamentos no primeiro mês sem mexer um dedo.', who: '[Nome], [Empresa], [Cidade]' },
      { quote: 'A gente não perde mais nenhuma ligação — e consegue provar.', who: '[Nome], [Empresa]' },
      { quote: 'O painel finalmente mostra pra onde vai cada lead.', who: '[Nome], [Empresa]' },
    ],
    note: 'Vamos substituir por depoimentos, logos e métricas reais de clientes conforme coletamos.',
  },
  quiz: {
    headline: 'Quanto de receita o seu tempo de resposta está custando?',
    subhead: 'Responda 5 perguntas rápidas e a gente te mostra — de graça.',
    step: 'Passo',
    questions: [
      { q: 'Em qual setor você está?', options: ['Reforma / ofícios', 'Restaurante', 'Limpeza', 'Construção', 'Outro'] },
      { q: 'Mais ou menos quantos leads você recebe por mês?', options: ['Menos de 25', '25–100', '100–300', '300+'] },
      { q: 'Quão rápido seu negócio responde um lead novo hoje?', options: ['Em 5 minutos', 'Em uma hora', 'Algumas horas', 'Sinceramente, não sei'] },
      { q: 'Quem responde seus leads hoje?', options: ['Eu (o dono)', 'Recepcionista / admin', 'Um vendedor', 'Ninguém de forma consistente'] },
      { q: 'Quanto vale seu cliente médio?', options: ['Menos de $500', '$500–$2.000', '$2.000–$10.000', '$10.000+'] },
      {
        q: 'Qual plano faz mais sentido pra você?',
        options: ['Essencial — só responder meus leads', 'Follow-up — resposta + follow-up constante', 'Alto Volume — 500+ ligações/mês', 'Não sei — me ajuda a escolher'],
      },
    ],
    capture: {
      title: 'Sua Auditoria de Leads está pronta.',
      body: 'Deixe seus dados e a gente mostra exatamente o que a resposta lenta está custando — e o que a Call We recupera.',
      firstName: 'Nome',
      businessName: 'Nome do negócio',
      phone: 'Telefone',
      email: 'E-mail',
      submit: 'Me mostre o que estou perdendo',
      submitting: 'Enviando…',
      disclaimer: 'Sem spam. Sem pressão. Só os seus números.',
      successTitle: 'Pronto. A gente entra em contato — rápido.',
      successBody: 'É exatamente essa a velocidade que vamos dar aos seus clientes. Até já.',
      error: 'Algo deu errado. Tente de novo ou fale com a gente direto.',
    },
  },
  finalCta: {
    headline: 'Seus concorrentes estão atendendo. E você?',
    subhead:
      'Agende uma auditoria de leads grátis. A gente revisa como seus leads são tratados hoje e mostra a receita escondida no seu tempo de resposta.',
    cta: 'Auditoria de Leads Grátis',
    callLabel: 'Ligar / mensagem',
    emailLabel: 'E-mail',
    bookLabel: 'Agendar um horário',
  },
  footer: { tagline: 'Times de vendas terceirizados para empresas nos EUA.', rights: 'Todos os direitos reservados.' },
};

export const CONTENT: Record<Locale, Content> = { en, es, pt };
