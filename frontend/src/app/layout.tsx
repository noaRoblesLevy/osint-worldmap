import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WORLDVIEW - Geospatial Intelligence',
  description: 'Real-time geospatial intelligence dashboard with CesiumJS 3D globe and multi-agent architecture',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
