/**
 * Logo do CallWe. `variant="full"` = logo horizontal com texto;
 * `variant="icon"` = só o ícone (balão). Os arquivos vivem em apps/web/public.
 * Use `className` pra controlar o tamanho (ex.: "h-8 w-auto").
 */
export function Logo({
  variant = 'full',
  className,
}: {
  variant?: 'full' | 'icon';
  className?: string;
}) {
  const src = variant === 'icon' ? '/logo-icon.png' : '/logo-full.png';
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="CallWe" className={className} />;
}
