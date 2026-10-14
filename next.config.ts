import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Le serveur de dev est joint via 127.0.0.1 (Playwright) et localhost.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
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
