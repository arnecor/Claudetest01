import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /**
   * Prevent Next.js / Turbopack from bundling these packages.
   * Prisma 7 uses a WASM query compiler loaded via dynamic import; pg uses
   * optional native bindings. Both break when Turbopack tries to inline them.
   * Marking them as external forces Node.js to resolve them at runtime instead.
   */
  serverExternalPackages: ['@prisma/client', 'prisma', '@prisma/adapter-pg', 'pg'],
};

export default nextConfig;
