import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Call We — Outsourced Sales Team for U.S. Businesses | Answer Every Lead in Minutes',
  description:
    "Stop losing leads to slow response. Call We's fluent, trained sales reps answer every call, text, and form in minutes — with a full AI-scored sales dashboard. Book a free lead audit.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
