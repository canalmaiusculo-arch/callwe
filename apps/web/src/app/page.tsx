import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { MarketingPage } from '@/components/marketing/marketing-page';

export const dynamic = 'force-dynamic';

export default async function RootPage() {
  const host = (await headers()).get('host') ?? '';
  // No subdomínio do app (app.callwe.digital), a raiz vai direto pro login.
  if (host.startsWith('app.')) {
    redirect('/login');
  }
  // Demais hosts (domínio raiz / localhost) recebem o site institucional.
  return <MarketingPage />;
}
