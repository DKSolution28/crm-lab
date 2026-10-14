import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Le serveur de dev est joint via 127.0.0.1 (Playwright) et localhost.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Playwright pose NEXT_DIST_DIR pour ne pas prendre le verrou de `next dev` sur .next.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
