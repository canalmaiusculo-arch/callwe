'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Building2, Users, Phone } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ClientSummary {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
}

export default function AgencyDashboard() {
  const { data: clients = [] } = useQuery<ClientSummary[]>({
    queryKey: ['agency-clients'],
    queryFn: () => apiClient.get('/sub-accounts'),
  });

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Visão geral da agência</h1>
      <p className="mt-1 text-muted-foreground">
        {clients.length} {clients.length === 1 ? 'cliente cadastrado' : 'clientes cadastrados'}
      </p>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <ActionCard href="/agency/clients" icon={Building2} title="Clientes" desc="Adicionar e gerenciar clientes" />
        <ActionCard href="/agency/team" icon={Users} title="Atendentes" desc="Convidar e atribuir clientes" />
        <ActionCard href="/agency/numbers" icon={Phone} title="Números" desc="Ver todos os números CloudTalk" />
      </div>
    </div>
  );
}

function ActionCard({ href, icon: Icon, title, desc }: { href: string; icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <Link href={href as never}>
      <Card className="transition-colors hover:bg-muted/30">
        <CardHeader>
          <Icon className="h-6 w-6 text-primary" />
          <CardTitle className="mt-2 text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{desc}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
