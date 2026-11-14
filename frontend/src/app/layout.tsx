import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'Instagram Clone',
  description: 'Full-stack Instagram clone built with Next.js 15, Node.js, Express, Socket.io, and Gemini AI',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-white dark:bg-black text-black dark:text-white antialiased selection:bg-neutral-200 dark:selection:bg-neutral-800 transition-colors duration-150">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
