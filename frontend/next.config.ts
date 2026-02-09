import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a standalone build for Docker (copies node_modules into .next/standalone)
  output: 'standalone',
  images: {
    // Allow images from any domain (for S3, CDN, etc.)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '9000',
      },
      {
        // MinIO inside Docker network
        protocol: 'http',
        hostname: 'minio',
        port: '9000',
      },
    ],
  },
};

export default nextConfig;
