import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { CookieBanner } from "@/components/CookieBanner";
import { SwetrixAnalytics } from "@/components/SwetrixAnalytics";
import { getContent } from "@/lib/content";

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

export async function generateMetadata(): Promise<Metadata> {
  const c = await getContent();
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: c["meta.title_default"],
      template: c["meta.title_template"],
    },
    description: c["meta.description"],
    applicationName: c["meta.site_name"],
    keywords: c["meta.keywords"].split(",").map((k) => k.trim()),
    authors: [{ name: c["meta.site_name"] }],
    openGraph: {
      type: "website",
      siteName: c["meta.site_name"],
      title: c["meta.og_title"],
      description: c["meta.og_description"],
      locale: "pl_PL",
      url: SITE_URL,
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          secureUrl: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          type: "image/png",
          alt: c["meta.og_title"],
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: c["meta.twitter_title"],
      description: c["meta.twitter_description"],
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
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
