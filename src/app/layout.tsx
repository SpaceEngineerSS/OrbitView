import type { Metadata, Viewport } from "next";
import { Instrument_Sans } from "next/font/google";
import { LocaleProvider } from "@/hooks/useLocale";
import { ServiceWorkerRegistration } from "@/components/common/ServiceWorkerRegistration";
import "./globals.css";

// Variable font with a width axis: narrow cuts for big figures, normal for text.
const ui = Instrument_Sans({
    variable: "--font-ui",
    subsets: ["latin", "latin-ext"],
    axes: ["wdth"],
    display: "swap",
});

const SITE = "https://orbitview-five.vercel.app";
const DESCRIPTION =
    "Real-time satellite tracking on a 3D globe: SGP4 positions for the active catalog, pass predictions, Doppler, orbital elements, lifetime estimates and close-approach screening.";

export const metadata: Metadata = {
    title: "OrbitView",
    description: DESCRIPTION,
    metadataBase: new URL(SITE),
    manifest: "/manifest.json",
    applicationName: "OrbitView",
    authors: [{ name: "Mehmet Gümüş", url: "https://github.com/SpaceEngineerSS" }],
    creator: "Mehmet Gümüş",
    category: "science",
    keywords: ["satellite tracker", "SGP4", "TLE", "pass prediction", "Doppler", "ISS", "orbital mechanics", "CesiumJS"],
    icons: {
        icon: [
            { url: "/favicon.svg", type: "image/svg+xml" },
            { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
        ],
        apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    },
    openGraph: {
        title: "OrbitView",
        description: DESCRIPTION,
        url: SITE,
        siteName: "OrbitView",
        images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "OrbitView" }],
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "OrbitView",
        description: DESCRIPTION,
        images: ["/og-image.png"],
        creator: "@persesmg",
    },
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "OrbitView" },
    formatDetection: { telephone: false },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#eef0f5" },
        { media: "(prefers-color-scheme: dark)", color: "#050608" },
    ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en" className={ui.variable} suppressHydrationWarning>
            <body>
                <LocaleProvider>
                    <ServiceWorkerRegistration />
                    {children}
                </LocaleProvider>
            </body>
        </html>
    );
}
