import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold">CallWe</h1>
      <p className="text-muted-foreground">Multi-tenant call center em cima da CloudTalk.</p>
      <div className="flex gap-3">
        <Link href="/login" className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
          Entrar
        </Link>
      </div>
    </main>
  );
}
