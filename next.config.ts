import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: 'standalone',
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-mariadb', 'mariadb'],
};

export default nextConfig;
