import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Panopin — Zgadnij gdzie zrobiono panoramę 360°",
    template: "%s · Panopin",
  },
  description:
    "Otwartoźródłowa gra geo-zgadywanka oparta o panoramy 360° z Twojej okolicy. " +
    "Obejrzyj zdjęcie, postaw pinezkę, zdobywaj punkty.",
  applicationName: "Panopin",
  keywords: ["panopin", "geoguessr", "panorama 360", "gra geograficzna", "lokalna społeczność"],
  authors: [{ name: "Panopin" }],
  openGraph: {
    type: "website",
    siteName: "Panopin",
    title: "Panopin — gra w odgadywanie lokalizacji panoram 360°",
    description: "Obejrzyj panoramę 360° i wskaż na mapie gdzie została zrobiona. 5 lokalizacji, im bliżej tym więcej punktów.",
    locale: "pl_PL",
  },
  twitter: {
    card: "summary_large_image",
    title: "Panopin",
    description: "Otwartoźródłowa gra geo-zgadywanka z panoramami 360°.",
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
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
