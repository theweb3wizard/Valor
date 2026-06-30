import type {Metadata} from 'next';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Valor | Autonomous Community Rewards',
  description: 'AI-powered quality evaluation and autonomous USDC rewards for your Telegram community.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: { url: '/favicon.svg' },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster richColors position="top-right" duration={4000} visibleToasts={5} closeButton />
      </body>
    </html>
  );
}
