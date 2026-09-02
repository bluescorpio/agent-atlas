import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Agent Atlas', description: 'Onchain agent marketplace for BNB Chain' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
