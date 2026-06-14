import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse loads test fixtures on import; externalizing it lets Node.js
  // load it directly from node_modules, bypassing the Next.js bundler.
  serverExternalPackages: ['pdf-parse'],
};

export default nextConfig;
