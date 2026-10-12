import type { NextConfig } from "next";
import path from "path";

/**
 * Content Security Policy. The page talks to three outside hosts: Esri for map
 * tiles, NOAA SWPC for space weather, and nothing else (TLEs go through our own
 * /api/tle). Cesium runs its workers from /cesium on our origin.
 * 'unsafe-inline' is needed for Next's bootstrap scripts and inline styles;
 * Cesium compiles WebAssembly (draco/basis decoders) and one of its bundled
 * dependencies uses eval, hence 'unsafe-eval' and 'wasm-unsafe-eval'.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://services.arcgisonline.com",
  "connect-src 'self' https://services.arcgisonline.com https://services.swpc.noaa.gov",
  "worker-src 'self' blob:",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Sky view needs the motion sensors; the location dialog needs geolocation.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self)",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Don't write AGENTS.md / CLAUDE.md into the repo on `next dev`.
  agentRules: false,
  devIndicators: false,
  // Pin the workspace root. Without it Turbopack can pick up a lockfile in a
  // parent folder and fail to resolve fonts and modules.
  turbopack: {
    root: path.resolve(__dirname),
  },

  async headers() {
    const all = process.env.NODE_ENV === "production"
      ? [...securityHeaders, { key: "Content-Security-Policy", value: CSP }]
      : securityHeaders;
    return [
      { source: "/(.*)", headers: all },
      { source: "/cesium/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=86400" }] },
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }] },
      { source: "/manifest.json", headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }] },
    ];
  },
};

export default nextConfig;
