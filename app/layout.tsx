import './globals.css';
import type { Metadata } from 'next';
import Providers from '../components/Providers';

export const metadata: Metadata = { title: 'Agent Atlas', description: 'Onchain agent marketplace for BNB Chain' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><Providers>{children}</Providers></body></html>;
}
