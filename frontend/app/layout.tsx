export const dynamic = 'force-dynamic'

import type { Metadata } from "next";
import { Inter, IBM_Plex_Serif } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const ibmPlexSerif = IBM_Plex_Serif({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-ibm-plex-serif'
})

export const metadata: Metadata = {
  title: "Ankan's Bank",
  description: "A modern banking platform for managing your finances, tracking spending, and achieving your goals.",
  icons: {
    icon: '/icons/logo.svg'
  },
  openGraph: {
    title: "Ankan's Bank",
    description: "A modern banking platform for managing your finances, tracking spending, and achieving your goals.",
    type: 'website',
    images: [{ url: '/icons/og.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Ankan's Bank",
    description: "A modern banking platform for managing your finances, tracking spending, and achieving your goals.",
    images: ['/icons/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${ibmPlexSerif.variable} bg-[#0a0e1a] text-slate-200 antialiased`}>{children}</body>
    </html>
  );
}
