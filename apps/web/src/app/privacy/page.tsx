export const metadata = {
  title: 'Política de Privacidade — CallWe',
  description: 'Política de Privacidade da plataforma CallWe',
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-2 text-2xl font-bold md:text-3xl">Política de Privacidade</h1>
      <p className="mb-8 text-sm text-muted-foreground">Última atualização: 28 de maio de 2026</p>

      <section className="prose prose-slate space-y-4 text-sm leading-relaxed">
        <h2 className="mt-6 text-xl font-semibold">1. Quem somos</h2>
        <p>
          O CallWe é uma plataforma de gestão de atendimento que conecta agências de marketing
          aos seus clientes, centralizando chamadas, SMS, leads e métricas em um único painel.
          Esta política descreve como tratamos os dados pessoais que coletamos.
        </p>

        <h2 className="mt-6 text-xl font-semibold">2. Dados que coletamos</h2>
        <ul className="ml-6 list-disc">
          <li><strong>Dados de cadastro:</strong> nome, e-mail, telefone, função (atendente / admin).</li>
          <li><strong>Dados de uso:</strong> chamadas recebidas e realizadas, SMS, gravações de áudio, transcrições e notas inseridas pelos atendentes.</li>
          <li><strong>Dados de leads:</strong> nome, telefone, e-mail, origem (canal de aquisição) e histórico de interações dos contatos dos nossos clientes.</li>
          <li><strong>Dados de integrações:</strong> tokens e credenciais necessárias para conectar provedores externos (Meta Ads, CloudTalk, WhatsApp), criptografados em repouso.</li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">3. Como usamos os dados</h2>
        <ul className="ml-6 list-disc">
          <li>Operar a plataforma e exibir histórico de interações ao atendente responsável.</li>
          <li>Gerar transcrições e resumos automáticos das chamadas via modelos de IA.</li>
          <li>Sincronizar leads de campanhas publicitárias (ex.: Meta Ads) para que sejam atendidos rapidamente.</li>
          <li>Enviar notificações operacionais sobre o serviço.</li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">4. Compartilhamento</h2>
        <p>
          Não vendemos dados pessoais. Compartilhamos com provedores estritamente necessários
          para a operação: hospedagem (Hetzner), armazenamento de gravações (Cloudflare R2),
          provedor de telefonia (CloudTalk), modelos de IA (OpenAI) e provedores de e-mail
          transacional. Todos sob contrato com cláusulas de confidencialidade.
        </p>

        <h2 className="mt-6 text-xl font-semibold">5. Retenção</h2>
        <p>
          Mantemos gravações e transcrições enquanto o contrato com o cliente estiver ativo.
          Após o encerramento, dados são apagados em até 30 dias, exceto quando obrigados por
          lei a manter por mais tempo.
        </p>

        <h2 className="mt-6 text-xl font-semibold">6. Direitos do titular</h2>
        <p>
          Conforme a LGPD, você pode solicitar acesso, correção, anonimização, portabilidade
          ou eliminação dos seus dados a qualquer momento, escrevendo para
          {' '}
          <a href="mailto:privacidade@rkpulsedigital.com" className="text-blue-600 underline">
            privacidade@rkpulsedigital.com
          </a>
          .
        </p>

        <h2 className="mt-6 text-xl font-semibold">7. Segurança</h2>
        <p>
          Todas as conexões usam TLS 1.2+. Credenciais sensíveis ficam criptografadas em
          repouso. Acesso aos dados é restrito a funcionários autorizados sob registro de
          auditoria.
        </p>

        <h2 className="mt-6 text-xl font-semibold">8. Alterações</h2>
        <p>
          Podemos atualizar esta política. Avisaremos os usuários por e-mail quando houver
          mudanças relevantes.
        </p>

        <h2 className="mt-6 text-xl font-semibold">9. Contato</h2>
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
