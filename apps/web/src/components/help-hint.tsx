import Link from 'next/link';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Bolinha de ajuda "?" — leva para a página de ajuda no tópico indicado.
 * Uso: <HelpHint topic="leads-webhook" /> (abre /help#leads-webhook em nova aba).
 */
export function HelpHint({ topic, className }: { topic: string; className?: string }) {
  return (
    <Link
      href={`/help#${topic}` as never}
      target="_blank"
      title="Ajuda sobre isto"
      aria-label="Ajuda"
      className={cn(
        'inline-flex shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-primary',
        className,
      )}
    >
      <HelpCircle className="h-4 w-4" />
    </Link>
  );
}
