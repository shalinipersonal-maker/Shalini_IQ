import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle (.next/standalone) for a minimal production container.
  output: "standalone",
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
  // Shalini_IQ build: the sample-data demo is switched off. Every demo screen opens the real live page.
  async redirects() {
    const demo = ["login", "signup", "overview", "marketplaces", "meta-ads", "advertising", "sales", "products", "ai", "clients", "leads", "reports", "settings"]; // Creative Studio (/studio) stays open: it designs for Shalini's own shop.
    return demo.flatMap((p) => [
      { source: `/${p}`, destination: "/account", permanent: false },
      { source: `/${p}/:rest*`, destination: "/account", permanent: false },
    ]);
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
