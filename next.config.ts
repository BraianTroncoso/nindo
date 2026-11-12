import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // nindo is a fully static PWA: no server, no API routes, no secrets.
  // `next build` emits out/ which any static host (Vercel free included) can serve.
  output: "export",
  images: { unoptimized: true },
  // Don't regenerate AGENTS.md on every dev run; this repo documents itself.
  agentRules: false,
  turbopack: {
    // Pin the workspace root so a stray lockfile above this folder is ignored.
    root: import.meta.dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
