import { NextResponse, type NextRequest } from 'next/server';

// Subdomínio do sistema. Sobrescreva com NEXT_PUBLIC_APP_HOST se o domínio mudar.
const APP_HOST = process.env.NEXT_PUBLIC_APP_HOST ?? 'app.callwe.digital';
const ROOT_HOST = APP_HOST.replace(/^app\./, '');

// Rotas que pertencem ao sistema (não ao site institucional).
const APP_ROUTES = [
  '/login',
  '/accept-invite',
  '/forgot-password',
  '/reset-password',
  '/admin',
  '/agency',
  '/agent',
  '/client',
  '/workspace',
  '/select-sub-account',
];

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') ?? '';
  const { pathname } = req.nextUrl;

  const isMarketingHost = host === ROOT_HOST || host === `www.${ROOT_HOST}`;

  // No domínio raiz, qualquer rota do sistema é redirecionada para o subdomínio do app.
  if (isMarketingHost && APP_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
    const url = req.nextUrl.clone();
    url.host = APP_HOST;
    url.protocol = 'https:';
    url.port = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Ignora assets, _next e qualquer arquivo com extensão (.png, .ico, etc.).
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
