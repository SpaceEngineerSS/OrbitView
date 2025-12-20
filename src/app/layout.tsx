import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LocaleProvider } from "@/hooks/useLocale";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OrbitView - Real-time Satellite Tracking",
  description: "Track 5000+ satellites in real-time on an interactive 3D globe. Analyze orbits, predict passes, and explore space with scientific tools.",
  metadataBase: new URL("https://orbitview-five.vercel.app"),
  manifest: "/manifest.json",
  keywords: ["satellite tracking", "space", "orbit visualization", "ISS tracker", "starlink", "real-time", "3D globe", "orbital mechanics", "pass prediction", "astronomy"],
  authors: [{ name: "Mehmet Gümüş", url: "https://spacegumus.com.tr" }],
  creator: "@persesmg",
  publisher: "OrbitView",
  applicationName: "OrbitView",
  category: "science",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  icons: {
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/orbitview-logo.svg",
  },
  openGraph: {
    title: "OrbitView - Real-time Satellite Tracking",
    description: "Track 5000+ satellites in real-time. Interactive 3D globe with scientific analysis tools.",
    url: "https://orbitview-five.vercel.app",
    siteName: "OrbitView",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "OrbitView - Satellite Tracking Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OrbitView - Real-time Satellite Tracking",
    description: "Track 5000+ satellites in real-time. Interactive 3D globe with scientific analysis tools.",
    images: ["/og-image.png"],
    creator: "@persesmg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "OrbitView",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0891b2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LocaleProvider>
          <ServiceWorkerRegistration />
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
