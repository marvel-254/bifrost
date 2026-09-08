import { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bifrost // AI Gateway Control Plane',
  description: 'OpenAI-compatible AI gateway and intelligent model router',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
