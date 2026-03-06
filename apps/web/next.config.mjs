import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

// Railway auto-injects RAILWAY_SERVICE_*_URL for inter-service networking
const CLIENTE_URL = process.env.RAILWAY_SERVICE_EDRO_WEB_CLIENTE_URL
  ?? process.env.NEXT_PUBLIC_CLIENTE_URL
  ?? 'http://localhost:3445';
const FREELANCER_URL = process.env.RAILWAY_SERVICE_EDRO_WEB_FREELANCER_URL
  ?? process.env.NEXT_PUBLIC_FREELANCER_URL
  ?? 'http://localhost:3444';

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@mui/material', '@mui/system', '@mui/lab'],
  turbopack: {
    root: repoRoot,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  async rewrites() {
    return [
      {
        source: '/cliente/:path*',
        destination: `${CLIENTE_URL}/cliente/:path*`,
      },
      {
        source: '/freelancer/:path*',
        destination: `${FREELANCER_URL}/freelancer/:path*`,
      },
    ];
  },
};

export default nextConfig;
