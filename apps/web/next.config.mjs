import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

// Railway auto-injects RAILWAY_SERVICE_*_URL for inter-service networking
const isProd = process.env.NODE_ENV === 'production';
const CLIENTE_URL = process.env.RAILWAY_SERVICE_EDRO_WEB_CLIENTE_URL
  ?? process.env.NEXT_PUBLIC_CLIENTE_URL
  ?? (isProd ? 'https://edro-web-cliente-production.up.railway.app' : 'http://localhost:3445');
const FREELANCER_URL = process.env.RAILWAY_SERVICE_EDRO_WEB_FREELANCER_URL
  ?? process.env.NEXT_PUBLIC_FREELANCER_URL
  ?? (isProd ? 'https://edro-web-freelancer-production.up.railway.app' : 'http://localhost:3444');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: "base-uri 'self'; frame-ancestors 'self'; object-src 'none'" },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  transpilePackages: ['@mui/material', '@mui/system', '@mui/lab'],
  turbopack: {
    root: repoRoot,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/admin/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/cliente',
        destination: `${CLIENTE_URL}`,
      },
      {
        source: '/cliente/:path*',
        destination: `${CLIENTE_URL}/:path*`,
      },
      {
        source: '/freelancer',
        destination: `${FREELANCER_URL}`,
      },
      {
        source: '/freelancer/:path*',
        destination: `${FREELANCER_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
