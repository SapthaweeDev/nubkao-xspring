import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: 'standalone',
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-mariadb', 'mariadb'],
  // Ensure Prisma runtime WASM/MJS files and the custom-output generated client
  // are included by the standalone file tracer (dynamic imports aren't auto-traced)
  outputFileTracingIncludes: {
    '**': [
      './node_modules/@prisma/client/runtime/**',
      './generated/prisma/**',
    ],
  },
};

export default nextConfig;
