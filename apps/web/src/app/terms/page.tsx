export const metadata = {
  title: 'Termos de Serviço — CallWe',
  description: 'Termos de Serviço da plataforma CallWe',
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-2 text-2xl font-bold md:text-3xl">Termos de Serviço</h1>
      <p className="mb-8 text-sm text-muted-foreground">Última atualização: 28 de maio de 2026</p>

      <section className="prose prose-slate space-y-4 text-sm leading-relaxed">
        <h2 className="mt-6 text-xl font-semibold">1. Aceitação</h2>
        <p>
          Ao usar a plataforma CallWe (&quot;Plataforma&quot;, &quot;Serviço&quot;), você concorda com estes
          Termos. Se não concorda, não utilize o Serviço.
        </p>

        <h2 className="mt-6 text-xl font-semibold">2. Descrição do Serviço</h2>
        <p>
          O CallWe é uma plataforma SaaS de gestão de atendimento que centraliza chamadas
          telefônicas, SMS, leads de campanhas publicitárias, gravações, transcrições e
          análises automatizadas. É oferecido em modelo de assinatura.
        </p>

        <h2 className="mt-6 text-xl font-semibold">3. Cadastro e responsabilidade</h2>
        <ul className="ml-6 list-disc">
          <li>Você é responsável pela exatidão das informações fornecidas no cadastro.</li>
          <li>Você é responsável por manter a confidencialidade das suas credenciais.</li>
          <li>Não compartilhe sua conta com terceiros. Cada atendente deve ter login próprio.</li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">4. Uso aceitável</h2>
        <p>É proibido:</p>
        <ul className="ml-6 list-disc">
          <li>Usar o Serviço para qualquer atividade ilegal, fraudulenta ou que viole direitos de terceiros.</li>
          <li>Tentar acessar dados ou sistemas para os quais não tem autorização.</li>
          <li>Realizar engenharia reversa, descompilar ou tentar extrair o código-fonte.</li>
          <li>Enviar spam, mensagens não solicitadas ou conteúdo abusivo via integrações.</li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">5. Integrações de terceiros</h2>
        <p>
          O Serviço integra com provedores externos (CloudTalk, Meta, WhatsApp, OpenAI, entre
          outros). O uso dessas integrações está sujeito também aos termos dos respectivos
          provedores. Cobranças adicionais de provedores externos são de responsabilidade do
          cliente.
        </p>

        <h2 className="mt-6 text-xl font-semibold">6. Pagamento e cancelamento</h2>
        <p>
          O Serviço é cobrado mensalmente conforme o plano contratado. Cancelamento pode ser
          feito a qualquer momento sem multa, com efeito ao final do ciclo já pago.
        </p>

        <h2 className="mt-6 text-xl font-semibold">7. Propriedade intelectual</h2>
        <p>
          O código, design e marca CallWe pertencem aos seus desenvolvedores. Os dados
          inseridos pelos clientes permanecem propriedade do cliente.
        </p>

        <h2 className="mt-6 text-xl font-semibold">8. Limitação de responsabilidade</h2>
        <p>
          O Serviço é fornecido &quot;como está&quot;. Faremos esforços razoáveis para manter
          disponibilidade alta, mas não garantimos disponibilidade ininterrupta. A
          responsabilidade total do CallWe está limitada ao valor pago pelo cliente nos 3
          meses anteriores ao incidente.
        </p>

        <h2 className="mt-6 text-xl font-semibold">9. Privacidade</h2>
        <p>
          O tratamento de dados pessoais segue nossa{' '}
          <a href="/privacy" className="text-blue-600 underline">Política de Privacidade</a>
          .
        </p>

        <h2 className="mt-6 text-xl font-semibold">10. Encerramento</h2>
        <p>
          Podemos suspender ou encerrar contas em caso de violação destes Termos, atividade
          fraudulenta ou inadimplência, com aviso prévio razoável quando possível.
        </p>

        <h2 className="mt-6 text-xl font-semibold">11. Lei aplicável</h2>
        <p>
          Estes Termos são regidos pelas leis da República Federativa do Brasil. Foro:
          comarca da sede da empresa operadora.
        </p>

        <h2 className="mt-6 text-xl font-semibold">12. Contato</h2>
        <p>
          Dúvidas:{' '}
          <a href="mailto:contato@rkpulsedigital.com" className="text-blue-600 underline">
            contato@rkpulsedigital.com
          </a>
        </p>
      </section>
    </main>
  );
}
