import { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bifröst — AI Gateway Dashboard',
  description: 'Lightweight OpenAI-compatible AI model gateway and intelligent router',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
