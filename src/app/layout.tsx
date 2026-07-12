import type { Metadata } from "next";
import { Rajdhani, JetBrains_Mono } from "next/font/google";
import { LocaleProvider } from "@/hooks/useLocale";
import { ServiceWorkerRegistration } from "@/components/common/ServiceWorkerRegistration";
import "./globals.css";
import "@/components/ui/VanillaGlass/vanilla-glass.css";


const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "OrbitView | Next-Gen Satellite Tracker",
  description: "Advanced orbital visualization platform.",
  metadataBase: new URL("https://orbitview.vercel.app"),
  manifest: "/manifest.json",
  keywords: ["satellite tracking", "space", "orbit visualization", "ISS tracker", "starlink", "real-time", "3D globe", "orbital mechanics", "pass prediction", "astronomy"],
  authors: [{ name: "Mehmet Gümüş", url: "https://github.com/SpaceEngineerSS" }],
  creator: "Mehmet Gümüş",
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
    shortcut: "/orbitview-logo.png",
  },
  openGraph: {
    title: "OrbitView - Real-time Satellite Tracking",
    description: "Track 5000+ satellites in real-time. Interactive 3D globe with scientific analysis tools.",
    url: "https://orbitview.vercel.app",
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
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${rajdhani.variable} ${jetbrainsMono.variable} antialiased bg-slate-950`}
      >
        <LocaleProvider>
          <ServiceWorkerRegistration />
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
