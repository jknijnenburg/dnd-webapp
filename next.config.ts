import type { NextConfig } from "next";

const securityHeaders = [
  // Protected, session-dependent output must never be stored by shared caches.
  { key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" },
  // Not access control – just keeps well-behaved crawlers away.
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // `pg` is a Node.js driver; keep it external instead of bundling it.
  serverExternalPackages: ["pg"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        // All application routes (pages, server actions, API) – not the static assets.
        source: "/((?!_next/static|_next/image|images/|fonts/|favicon.ico).*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
