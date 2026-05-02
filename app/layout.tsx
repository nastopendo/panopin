import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { CookieBanner } from "@/components/CookieBanner";
import { SwetrixAnalytics } from "@/components/SwetrixAnalytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const DEFAULT_OG_IMAGE = `${SITE_URL}/api/og/default`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Panopin — sprawdź jak dobrze znasz swoją okolicę",
    template: "%s · Panopin",
  },
  description:
    "Obejrzyj panoramę 360° z okolicy i postaw pinezkę tam, gdzie myślisz że została zrobiona. " +
    "5 lokalizacji w rundzie — im celniej tym więcej punktów.",
  applicationName: "Panopin",
  keywords: ["panopin", "geoguessr", "panorama 360", "gra lokalna", "moja okolica", "zgadywanka"],
  authors: [{ name: "Panopin" }],
  openGraph: {
    type: "website",
    siteName: "Panopin",
    title: "Panopin — sprawdź jak dobrze znasz swoją okolicę",
    description: "Obejrzyj panoramę 360° z okolicy i postaw pinezkę tam, gdzie myślisz że została zrobiona. 5 lokalizacji w rundzie — im celniej tym więcej punktów.",
    locale: "pl_PL",
    url: SITE_URL,
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        secureUrl: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "Panopin — sprawdź jak dobrze znasz swoją okolicę",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Panopin — jak dobrze znasz swoją okolicę?",
    description: "Obejrzyj panoramę 360° i postaw pinezkę tam, gdzie myślisz że została zrobiona.",
    images: [DEFAULT_OG_IMAGE],
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1a1f",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col bg-background text-foreground"
        suppressHydrationWarning
      >
        {children}
        <SwetrixAnalytics />
        <CookieBanner />
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
