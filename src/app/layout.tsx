import type { Metadata } from 'next';
import './globals.css';
import { HeaderNav } from '@/components/HeaderNav';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Noctive UTA Sentinel | Paper-Only Collateral Risk Intelligence',
  description:
    'Stress-test tokenized-equity collateral before overnight risk becomes a position problem. Paper-only UTA collateral risk intelligence for tokenized US equities.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-navy-950 text-slate-100 flex flex-col min-h-screen">
        <HeaderNav />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
