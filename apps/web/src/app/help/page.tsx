'use client';

import { Logo } from '@/components/logo';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useTranslate } from '@/i18n/provider';

interface Topic {
  id: string;
  title: string;
  paras: string[];
}
interface HelpDoc {
  centerTitle: string;
  intro: string;
  tocLabel: string;
  topics: Topic[];
}

const HELP: Record<'pt-BR' | 'en' | 'es', HelpDoc> = {
  'pt-BR': {
    centerTitle: 'Central de Ajuda',
    intro: 'Como cada parte do CallWe funciona. Clicou num “?” no sistema? Você caiu no tópico certo abaixo.',
    tocLabel: 'Tópicos',
    topics: [
      { id: 'overview', title: 'Visão geral', paras: [
        'O CallWe reúne captação de leads, telefonia e CRM num só painel. Os leads chegam de várias fontes (Meta, Google, formulários/quizz, chamadas), os atendentes trabalham os contatos, e tudo fica visível em dashboards e no chat compartilhado.',
        'Cada cliente é uma subconta isolada. A agência gerencia seus clientes, os atendentes atendem, e o cliente final acompanha os próprios leads e ligações no painel dele.' ] },
      { id: 'leads-webhook', title: 'Webhook de formulário / quizz', paras: [
        'Serve para receber leads de qualquer formulário, quizz ou landing page que dispare um webhook (HTTP POST), sem integrações intermediárias.',
        '1. Em Integrações → Formulário/Quizz (ou no detalhe do cliente), copie a URL do webhook e a API Key.',
        '2. Na sua ferramenta, configure o envio para essa URL via POST, payload json.',
        '3. Adicione o header X-CallWe-Api-Key com o valor da chave.',
        '4. Envie os campos name, phone, email (e, se quiser, formName/campaignName). Qualquer campo extra é guardado no lead. O lead entra com origem “Formulário”.' ] },
      { id: 'zapier', title: 'Zapier', paras: [
        'O mesmo webhook funciona com o Zapier — útil quando o lead vem de uma fonte que o Zapier já integra (ex.: Facebook Lead Ads).',
        'No Zapier: Trigger = a fonte do lead; Action = Webhooks by Zapier (POST) para a URL do cliente; Header X-CallWe-Api-Key com a chave; mapeie name, phone, email. Para marcar origem Meta, envie source: meta_ads.' ] },
      { id: 'meta', title: 'Meta Ads (Lead Ads)', paras: [
        'Em Integrações → Meta Ads, conecte a conta do Facebook e selecione a Página + o formulário. Os leads dos formulários do Facebook/Instagram entram automaticamente com origem “Meta”.' ] },
      { id: 'telefonia', title: 'Telefonia e chamadas', paras: [
        'As chamadas (recebidas e realizadas) são registradas automaticamente pela telefonia (CloudTalk), com gravação, duração, tempo de espera e status. Números novos viram leads automaticamente.' ] },
      { id: 'whatsapp', title: 'Resumos no WhatsApp (Z-API)', paras: [
        'O CallWe envia resumos das interações para um grupo de WhatsApp do cliente, via Z-API. Cada agência usa o próprio número: configure as credenciais em Configurações → WhatsApp; depois escolha o grupo de cada cliente no detalhe do cliente.' ] },
      { id: 'leads', title: 'Leads e funil', paras: [
        'Cada lead tem um status (Novo → Contatado → Qualificado → Ganho ou Perdido) que alimenta as taxas de conversão. Clicando num lead você vê os dados, o histórico de chamadas/SMS e as observações.' ] },
      { id: 'chat', title: 'Chat / conversas', paras: [
        'O botão de chat (canto inferior direito) abre o inbox. Cada conversa é sobre um lead e é compartilhada entre agência, atendente e cliente. A bolinha mostra as não lidas.',
        'Para iniciar uma conversa, clique em + e busque o lead. As observações internas (dentro do lead, no workspace) são privadas — o cliente não vê.' ] },
      { id: 'notificacoes', title: 'Notificações', paras: [
        'Quando chega um novo lead (SMS, Meta, formulário) ou uma chamada perdida, aparece um alerta no canto inferior esquerdo, com som de sino, que fica visível até você fechar. O som só toca depois da primeira interação na página (regra do navegador).' ] },
      { id: 'dashboard', title: 'Dashboards e métricas', paras: [
        'Os dashboards mostram leads, chamadas, perdidas, tempo ao telefone, funil e desempenho. Passe o mouse nos cards para ver os detalhes. No painel do cliente há também o resumo das ligações por IA.' ] },
      { id: 'clientes', title: 'Gestão de clientes (agência)', paras: [
        'Em Clientes, a agência cria, edita, arquiva ou apaga clientes, atribui números e configura integrações.',
        'No card Acesso do cliente, convide o login do cliente e use “Redefinir acesso” para gerar um link de convite ou de redefinição de senha.' ] },
      { id: 'cliente-acesso', title: 'Acesso do cliente final', paras: [
        'O cliente acessa pelo app.callwe.digital com o login criado pela agência. Vê apenas os próprios dados: dashboard, leads, chamadas, SMS, voicemails e o chat compartilhado.' ] },
    ],
  },
  en: {
    centerTitle: 'Help Center',
    intro: 'How each part of CallWe works. Clicked a “?” in the app? You landed on the right topic below.',
    tocLabel: 'Topics',
    topics: [
      { id: 'overview', title: 'Overview', paras: [
        'CallWe brings lead capture, phone and CRM into one panel. Leads arrive from several sources (Meta, Google, forms/quizzes, calls), agents work the contacts, and everything is visible in dashboards and the shared chat.',
        'Each client is an isolated sub-account. The agency manages its clients, agents handle them, and the end client follows their own leads and calls in their panel.' ] },
      { id: 'leads-webhook', title: 'Form / quiz webhook', paras: [
        'Receives leads from any form, quiz or landing page that can fire a webhook (HTTP POST), with no middle integrations.',
        '1. In Integrations → Form/Quiz (or the client detail), copy the webhook URL and the API Key.',
        '2. In your tool, configure the send to that URL via POST, json payload.',
        '3. Add the header X-CallWe-Api-Key with the key value.',
        '4. Send name, phone, email (and optionally formName/campaignName). Any extra field is stored on the lead. The lead arrives with source “Form”.' ] },
      { id: 'zapier', title: 'Zapier', paras: [
        'The same webhook works with Zapier — handy when the lead comes from a source Zapier already integrates (e.g., Facebook Lead Ads).',
        'In Zapier: Trigger = the lead source; Action = Webhooks by Zapier (POST) to the client URL; Header X-CallWe-Api-Key with the key; map name, phone, email. To tag it as Meta, send source: meta_ads.' ] },
      { id: 'meta', title: 'Meta Ads (Lead Ads)', paras: [
        'In Integrations → Meta Ads, connect the Facebook account and select the Page + form. Leads from Facebook/Instagram forms arrive automatically with source “Meta”.' ] },
      { id: 'telefonia', title: 'Phone & calls', paras: [
        'Calls (inbound and outbound) are logged automatically by the telephony (CloudTalk), with recording, duration, wait time and status. New numbers become leads automatically.' ] },
      { id: 'whatsapp', title: 'WhatsApp summaries (Z-API)', paras: [
        'CallWe sends interaction summaries to a client WhatsApp group via Z-API. Each agency uses its own number: set the credentials in Settings → WhatsApp, then pick each client’s group in the client detail.' ] },
      { id: 'leads', title: 'Leads & pipeline', paras: [
        'Each lead has a status (New → Contacted → Qualified → Won or Lost) that drives the conversion rates. Click a lead to see its data, the call/SMS history and the notes.' ] },
      { id: 'chat', title: 'Chat / conversations', paras: [
        'The chat button (bottom-right) opens the inbox. Each conversation is about a lead and is shared between agency, agent and client. The badge shows unread messages.',
        'To start a conversation, click + and search the lead. Internal notes (inside the lead, in the workspace) are private — the client does not see them.' ] },
      { id: 'notificacoes', title: 'Notifications', paras: [
        'When a new lead arrives (SMS, Meta, form) or a missed call happens, an alert shows in the bottom-left corner, with a bell sound, and stays until you close it. The sound only plays after the first interaction on the page (browser rule).' ] },
      { id: 'dashboard', title: 'Dashboards & metrics', paras: [
        'Dashboards show leads, calls, missed, talk time, pipeline and performance. Hover the cards to see the details. The client panel also has the AI call summaries.' ] },
      { id: 'clientes', title: 'Client management (agency)', paras: [
        'In Clients, the agency creates, edits, archives or deletes clients, assigns numbers and configures integrations.',
        'In the Client access card, invite the client login and use “Reset access” to generate an invite or password-reset link.' ] },
      { id: 'cliente-acesso', title: 'End-client access', paras: [
        'The client logs in at app.callwe.digital with the login created by the agency. They see only their own data: dashboard, leads, calls, SMS, voicemails and the shared chat.' ] },
    ],
  },
  es: {
    centerTitle: 'Centro de Ayuda',
    intro: '¿Cómo funciona cada parte de CallWe? ¿Hiciste clic en un “?” en el sistema? Caíste en el tema correcto abajo.',
    tocLabel: 'Temas',
    topics: [
      { id: 'overview', title: 'Resumen', paras: [
        'CallWe une captación de leads, telefonía y CRM en un solo panel. Los leads llegan de varias fuentes (Meta, Google, formularios/quizzes, llamadas), los agentes trabajan los contactos y todo es visible en paneles y en el chat compartido.',
        'Cada cliente es una subcuenta aislada. La agencia gestiona a sus clientes, los agentes atienden, y el cliente final sigue sus propios leads y llamadas en su panel.' ] },
      { id: 'leads-webhook', title: 'Webhook de formulario / quiz', paras: [
        'Recibe leads de cualquier formulario, quiz o landing que pueda disparar un webhook (HTTP POST), sin integraciones intermedias.',
        '1. En Integraciones → Formulario/Quiz (o en el detalle del cliente), copia la URL del webhook y la API Key.',
        '2. En tu herramienta, configura el envío a esa URL vía POST, payload json.',
        '3. Agrega el header X-CallWe-Api-Key con el valor de la clave.',
        '4. Envía name, phone, email (y, si quieres, formName/campaignName). Cualquier campo extra se guarda en el lead. El lead entra con origen “Formulario”.' ] },
      { id: 'zapier', title: 'Zapier', paras: [
        'El mismo webhook funciona con Zapier — útil cuando el lead viene de una fuente que Zapier ya integra (ej.: Facebook Lead Ads).',
        'En Zapier: Trigger = la fuente del lead; Action = Webhooks by Zapier (POST) a la URL del cliente; Header X-CallWe-Api-Key con la clave; mapea name, phone, email. Para marcar origen Meta, envía source: meta_ads.' ] },
      { id: 'meta', title: 'Meta Ads (Lead Ads)', paras: [
        'En Integraciones → Meta Ads, conecta la cuenta de Facebook y selecciona la Página + el formulario. Los leads de los formularios de Facebook/Instagram entran automáticamente con origen “Meta”.' ] },
      { id: 'telefonia', title: 'Telefonía y llamadas', paras: [
        'Las llamadas (entrantes y salientes) se registran automáticamente con la telefonía (CloudTalk), con grabación, duración, tiempo de espera y estado. Los números nuevos se vuelven leads automáticamente.' ] },
      { id: 'whatsapp', title: 'Resúmenes en WhatsApp (Z-API)', paras: [
        'CallWe envía resúmenes de las interacciones a un grupo de WhatsApp del cliente, vía Z-API. Cada agencia usa su propio número: configura las credenciales en Configuración → WhatsApp y luego elige el grupo de cada cliente en su detalle.' ] },
      { id: 'leads', title: 'Leads y embudo', paras: [
        'Cada lead tiene un estado (Nuevo → Contactado → Calificado → Ganado o Perdido) que alimenta las tasas de conversión. Haz clic en un lead para ver sus datos, el historial de llamadas/SMS y las notas.' ] },
      { id: 'chat', title: 'Chat / conversaciones', paras: [
        'El botón de chat (abajo a la derecha) abre el inbox. Cada conversación es sobre un lead y se comparte entre agencia, agente y cliente. La burbuja muestra las no leídas.',
        'Para iniciar una conversación, haz clic en + y busca el lead. Las notas internas (dentro del lead, en el workspace) son privadas — el cliente no las ve.' ] },
      { id: 'notificacoes', title: 'Notificaciones', paras: [
        'Cuando llega un lead nuevo (SMS, Meta, formulario) o una llamada perdida, aparece una alerta en la esquina inferior izquierda, con sonido de campana, que queda visible hasta que la cierras. El sonido solo suena tras la primera interacción en la página (regla del navegador).' ] },
      { id: 'dashboard', title: 'Paneles y métricas', paras: [
        'Los paneles muestran leads, llamadas, perdidas, tiempo al teléfono, embudo y desempeño. Pasa el mouse por los cards para ver los detalles. El panel del cliente también tiene los resúmenes de llamadas por IA.' ] },
      { id: 'clientes', title: 'Gestión de clientes (agencia)', paras: [
        'En Clientes, la agencia crea, edita, archiva o elimina clientes, asigna números y configura integraciones.',
        'En la tarjeta Acceso del cliente, invita el login del cliente y usa “Restablecer acceso” para generar un enlace de invitación o de restablecimiento de contraseña.' ] },
      { id: 'cliente-acesso', title: 'Acceso del cliente final', paras: [
        'El cliente entra en app.callwe.digital con el login creado por la agencia. Ve solo sus propios datos: panel, leads, llamadas, SMS, buzón de voz y el chat compartido.' ] },
    ],
  },
};

export default function HelpPage() {
  const { locale } = useTranslate();
  const doc = HELP[locale];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Logo variant="full" className="h-7 w-auto" />
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <span className="hidden text-sm font-semibold text-muted-foreground sm:inline">{doc.centerTitle}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 lg:grid-cols-[220px_1fr]">
        <nav className="hidden lg:block">
          <div className="sticky top-24 space-y-1">
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{doc.tocLabel}</p>
            {doc.topics.map((t) => (
              <a
                key={t.id}
                href={`#${t.id}`}
                className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {t.title}
              </a>
            ))}
          </div>
        </nav>

        <main className="min-w-0 space-y-10 scroll-smooth">
          <div>
            <h1 className="text-3xl font-bold">{doc.centerTitle}</h1>
            <p className="mt-1 text-muted-foreground">{doc.intro}</p>
          </div>

          {doc.topics.map((t) => (
            <section key={t.id} id={t.id} className="scroll-mt-24 border-t pt-8">
              <h2 className="text-xl font-bold">{t.title}</h2>
              <div className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
                {t.paras.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}
