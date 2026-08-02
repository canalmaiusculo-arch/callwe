import type { Metadata } from 'next';
import { Inter, Hanken_Grotesk } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';

// Corpo / interface — workhorse, ótima em telas densas.
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

// Títulos — humanista, amigável, acessível.
const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'Call We — Outsourced Sales Team for U.S. Businesses | Answer Every Lead in Minutes',
  description:
    "Stop losing leads to slow response. Call We's fluent, trained sales reps answer every call, text, and form in minutes — with a full AI-scored sales dashboard. Book a free lead audit.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${hanken.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
