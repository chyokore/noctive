import type { Metadata } from 'next';
import './globals.css';
import { HeaderNav } from '@/components/HeaderNav';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Noctive | Autonomous Overnight Trading Intelligence Agent',
  description:
    'Autonomous paper-trading intelligence agent for tokenized US equities during market closures. Bitget AI Base Camp Hackathon S2.',
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
