import Link from 'next/link';
import { Logo } from '@/components/logo';

export const metadata = { title: 'Ajuda — CallWe' };

interface Topic {
  id: string;
  title: string;
  body: React.ReactNode;
}

const TOPICS: Topic[] = [
  {
    id: 'overview',
    title: 'Visão geral',
    body: (
      <>
        <p>
          O CallWe reúne <strong>captação de leads</strong>, <strong>telefonia</strong> e{' '}
          <strong>CRM</strong> num só painel. Os leads chegam de várias fontes (Meta, Google,
          formulários/quizz, chamadas), os atendentes trabalham os contatos, e tudo fica visível em
          dashboards e no chat compartilhado.
        </p>
        <p>
          Cada <strong>cliente</strong> é uma subconta isolada. A <strong>agência</strong> gerencia
          seus clientes, os <strong>atendentes</strong> atendem, e o <strong>cliente final</strong>{' '}
          acompanha os próprios leads e ligações no painel dele.
        </p>
      </>
    ),
  },
  {
    id: 'leads-webhook',
    title: 'Webhook de formulário / quizz',
    body: (
      <>
        <p>
          Serve para receber leads de qualquer formulário, quizz ou landing page que consiga
          disparar um <strong>webhook (HTTP POST)</strong> — sem passar por integrações intermediárias.
        </p>
        <ol>
          <li>
            Em <strong>Integrações → Formulário / Quizz</strong> (ou no detalhe do cliente, na
            agência), copie a <strong>URL do webhook</strong> e a <strong>API Key</strong>.
          </li>
          <li>Na sua ferramenta, configure o envio para essa URL via <code>POST</code>, payload <code>json</code>.</li>
          <li>
            Adicione o header <code>X-CallWe-Api-Key</code> com o valor da chave.
          </li>
          <li>
            Envie os campos <code>name</code>, <code>phone</code>, <code>email</code> (e, se quiser,{' '}
            <code>formName</code> / <code>campaignName</code>). Qualquer campo extra é guardado
            automaticamente no lead.
          </li>
        </ol>
        <p>
          O lead entra com a origem <strong>Formulário</strong>. Se a chave vazar, use{' '}
          <strong>Rotacionar chave</strong> para invalidar a antiga.
        </p>
      </>
    ),
  },
  {
    id: 'zapier',
    title: 'Zapier',
    body: (
      <>
        <p>
          O mesmo webhook funciona com o Zapier — útil quando o lead vem de uma fonte que o Zapier já
          integra (ex.: Facebook Lead Ads enquanto o app Meta está em review).
        </p>
        <ol>
          <li><strong>Trigger:</strong> a fonte do lead (ex.: Facebook Lead Ads → New Lead).</li>
          <li><strong>Action:</strong> Webhooks by Zapier → <em>POST</em>.</li>
          <li><strong>URL:</strong> a URL do webhook do cliente · <strong>Payload:</strong> <code>json</code>.</li>
          <li><strong>Header:</strong> <code>X-CallWe-Api-Key</code> com a chave da subconta.</li>
          <li>Mapeie <code>name</code>, <code>phone</code>, <code>email</code>. Para marcar a origem como Meta, envie <code>source: meta_ads</code>.</li>
        </ol>
      </>
    ),
  },
  {
    id: 'meta',
    title: 'Meta Ads (Lead Ads)',
    body: (
      <p>
        Em <strong>Integrações → Meta Ads</strong>, conecte a conta do Facebook e selecione a Página
        + o formulário. Os leads dos formulários nativos do Facebook/Instagram entram automaticamente
        com origem <strong>Meta</strong>. Enquanto o app Meta estiver em review, use o webhook via
        Zapier como alternativa.
      </p>
    ),
  },
  {
    id: 'telefonia',
    title: 'Telefonia e chamadas',
    body: (
      <p>
        As chamadas (recebidas e realizadas) são registradas automaticamente pela telefonia
        (CloudTalk), com <strong>gravação</strong>, duração, tempo de espera e status (atendida,
        perdida, etc.). Chamadas de números novos viram leads automaticamente. A configuração da
        telefonia é feita pela agência.
      </p>
    ),
  },
  {
    id: 'whatsapp',
    title: 'Resumos no WhatsApp (Z-API)',
    body: (
      <>
        <p>
          O CallWe pode enviar resumos das interações para um grupo de WhatsApp do cliente, via Z-API.
          No detalhe do cliente (agência), em <strong>WhatsApp do cliente</strong>, escolha o grupo
          onde os resumos serão enviados.
        </p>
        <p className="text-muted-foreground">
          Observação: para o número da Z-API aparecer na lista de grupos, ele precisa já estar
          adicionado ao grupo do WhatsApp em questão.
        </p>
      </>
    ),
  },
  {
    id: 'leads',
    title: 'Leads e funil',
    body: (
      <>
        <p>
          Cada lead tem um <strong>status</strong> que representa o estágio no funil: Novo →
          Contatado → Qualificado → Ganho (ou Perdido). Atualize o status conforme avança o
          atendimento — é o que alimenta as taxas de conversão e win rate nos dashboards.
        </p>
        <p>
          Clicando num lead você vê todas as informações, o histórico de chamadas/SMS e as
          observações. A origem (Meta, Formulário, Chamada, etc.) fica registrada em cada lead.
        </p>
      </>
    ),
  },
  {
    id: 'chat',
    title: 'Chat / conversas',
    body: (
      <>
        <p>
          O botão de chat (canto inferior direito) abre o inbox de conversas. Cada conversa é sobre um
          lead e é <strong>compartilhada</strong> entre agência, atendente e cliente — todos veem e
          respondem. A bolinha vermelha mostra as mensagens não lidas.
        </p>
        <p>
          Para iniciar uma conversa nova, clique em <strong>+</strong>, busque o lead e envie a
          primeira mensagem. As <strong>observações internas</strong> (dentro do lead, no workspace)
          são privadas — só a agência/atendente veem; o cliente não.
        </p>
      </>
    ),
  },
  {
    id: 'notificacoes',
    title: 'Notificações',
    body: (
      <p>
        Sempre que chega um <strong>novo lead</strong> (SMS, Meta, formulário) ou uma{' '}
        <strong>chamada perdida</strong>, aparece um alerta colorido no canto inferior esquerdo, com
        um som de sino, que fica visível até você fechar. O som só toca depois da primeira interação
        na página (regra do navegador).
      </p>
    ),
  },
  {
    id: 'dashboard',
    title: 'Dashboards e métricas',
    body: (
      <>
        <p>
          Os dashboards mostram leads, chamadas, perdidas, tempo ao telefone, funil e desempenho —
          por hoje e por período. Passe o mouse (ou toque) nos cards para ver os detalhes por trás de
          cada número.
        </p>
        <p>
          No painel do cliente há ainda o <strong>resumo das ligações por IA</strong> (com sentimento
          e nota), gráficos de volume e horários de pico.
        </p>
      </>
    ),
  },
  {
    id: 'clientes',
    title: 'Gestão de clientes (agência)',
    body: (
      <>
        <p>
          Em <strong>Clientes</strong>, a agência pode <strong>criar</strong>, <strong>editar</strong>{' '}
          (nome, plano), <strong>arquivar</strong> ou <strong>apagar</strong> cada cliente, atribuir
          números de telefone e configurar integrações.
        </p>
        <p>
          No card <strong>Acesso do cliente</strong>, convide o login do cliente (e-mail) e use{' '}
          <strong>Redefinir acesso</strong> para gerar um link de convite (se ainda não ativou) ou de
          redefinição de senha (se já ativou) — o link aparece para você copiar e enviar.
        </p>
      </>
    ),
  },
  {
    id: 'cliente-acesso',
    title: 'Acesso do cliente final',
    body: (
      <p>
        O cliente acessa pelo <strong>app.callwe.digital</strong> com o login criado pela agência.
        Ele vê apenas os próprios dados: dashboard, leads, chamadas, SMS, voicemails e o chat
        compartilhado. Não tem acesso a observações internas nem a outros clientes.
      </p>
    ),
  },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Logo variant="full" className="h-7 w-auto" />
          <span className="text-sm font-semibold text-muted-foreground">Central de Ajuda</span>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 lg:grid-cols-[220px_1fr]">
        {/* Índice */}
        <nav className="hidden lg:block">
          <div className="sticky top-24 space-y-1">
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Tópicos</p>
            {TOPICS.map((t) => (
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

        {/* Conteúdo */}
        <main className="min-w-0 space-y-10 scroll-smooth">
          <div>
            <h1 className="text-3xl font-bold">Central de Ajuda</h1>
            <p className="mt-1 text-muted-foreground">
              Como cada parte do CallWe funciona. Clicou num <strong>?</strong> no sistema? Você caiu
              no tópico certo abaixo.
            </p>
          </div>

          {TOPICS.map((t) => (
            <section key={t.id} id={t.id} className="scroll-mt-24 border-t pt-8">
              <h2 className="text-xl font-bold">{t.title}</h2>
              <div className="prose-help mt-3 space-y-3 text-sm leading-relaxed [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_li]:ml-1 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5">
                {t.body}
              </div>
            </section>
          ))}

          <div className="border-t pt-6 text-sm text-muted-foreground">
            Não achou o que precisava?{' '}
            <Link href={'/workspace' as never} className="text-primary hover:underline">
              Voltar ao painel
            </Link>
            .
          </div>
        </main>
      </div>
    </div>
  );
}
