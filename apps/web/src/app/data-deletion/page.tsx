export const metadata = {
  title: 'Exclusão de Dados — CallWe',
  description: 'Instruções para solicitação de exclusão de dados pessoais',
};

export default function DataDeletionPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-bold">Exclusão de Dados</h1>
      <p className="mb-8 text-sm text-muted-foreground">Última atualização: 28 de maio de 2026</p>

      <section className="prose prose-slate space-y-4 text-sm leading-relaxed">
        <p>
          Esta página descreve como solicitar a exclusão dos seus dados pessoais da
          plataforma CallWe, em conformidade com a Lei Geral de Proteção de Dados (LGPD)
          e com os requisitos da Meta Platforms para apps integrados.
        </p>

        <h2 className="mt-6 text-xl font-semibold">Como solicitar a exclusão</h2>

        <h3 className="mt-4 text-lg font-medium">1. Se você é um usuário da plataforma</h3>
        <p>
          Acesse <a href="/login" className="text-blue-600 underline">app.callwe.digital</a>,
          entre em <strong>Configurações &gt; Conta</strong> e clique em &quot;Excluir minha conta&quot;.
          Sua conta e dados associados serão removidos em até 30 dias úteis.
        </p>

        <h3 className="mt-4 text-lg font-medium">2. Se seus dados foram coletados via integração com Meta</h3>
        <p>
          Caso seus dados tenham sido coletados via formulário de Lead Ads ou outra
          integração com Meta (Facebook/Instagram) e processados pelo CallWe, envie um
          e-mail para{' '}
          <a href="mailto:privacidade@rkpulsedigital.com" className="text-blue-600 underline">
            privacidade@rkpulsedigital.com
          </a>{' '}
          com:
        </p>
        <ul className="ml-6 list-disc">
          <li>Assunto: <strong>Exclusão de Dados — Meta Integration</strong></li>
          <li>Seu nome completo</li>
          <li>E-mail e/ou telefone usado no formulário</li>
          <li>Nome do anunciante / página que veiculou o formulário (se souber)</li>
        </ul>

        <h3 className="mt-4 text-lg font-medium">3. Se você não tem conta mas seus dados estão no sistema</h3>
        <p>
          Acontece quando uma agência cliente nossa cadastra você como &quot;lead&quot; (contato
          comercial). Envie e-mail para{' '}
          <a href="mailto:privacidade@rkpulsedigital.com" className="text-blue-600 underline">
            privacidade@rkpulsedigital.com
          </a>{' '}
          informando seu telefone ou e-mail. Identificaremos os registros e excluiremos em
          até 30 dias úteis.
        </p>

        <h2 className="mt-6 text-xl font-semibold">O que é excluído</h2>
        <ul className="ml-6 list-disc">
          <li>Dados de cadastro (nome, e-mail, telefone)</li>
          <li>Gravações de áudio e transcrições associadas ao seu telefone</li>
          <li>Histórico de chamadas e mensagens</li>
          <li>Notas e tags criadas sobre você</li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">O que pode ser retido</h2>
        <p>
          Por obrigação legal ou regulatória (ex.: registros fiscais, atendimento de
          ordens judiciais), alguns dados podem ser mantidos pelo período legalmente
          exigido — sempre minimizados e protegidos.
        </p>

        <h2 className="mt-6 text-xl font-semibold">Prazo de atendimento</h2>
        <p>
          Solicitações são processadas em até <strong>30 dias úteis</strong> a partir do
          recebimento, conforme art. 19 da LGPD.
        </p>

        <h2 className="mt-6 text-xl font-semibold">Contato</h2>
        <p>
          Encarregado de Proteção de Dados (DPO):{' '}
          <a href="mailto:privacidade@rkpulsedigital.com" className="text-blue-600 underline">
            privacidade@rkpulsedigital.com
          </a>
        </p>
      </section>
    </main>
  );
}
