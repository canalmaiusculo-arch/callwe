import { cn } from '@/lib/utils';

/**
 * Logo do CallWe. `variant="full"` = logo horizontal com texto;
 * `variant="icon"` = só o ícone (balão). Os arquivos vivem em apps/web/public.
 * Use `className` pra controlar o tamanho (ex.: "h-8 w-auto").
 * `white` deixa o logo branco (silhueta) — pra usar sobre fundos coloridos.
 */
export function Logo({
  variant = 'full',
  white = false,
  className,
}: {
  variant?: 'full' | 'icon';
  white?: boolean;
  className?: string;
}) {
  const src = variant === 'icon' ? '/logo-icon.png' : '/logo-full.png';
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="CallWe" className={cn(className, white && 'brightness-0 invert')} />;
}
