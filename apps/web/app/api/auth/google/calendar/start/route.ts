import { NextResponse } from 'next/server';

function resolveBackendBase() {
  const explicit = process.env.EDRO_BACKEND_URL?.trim();
  if (explicit && /^https?:\/\//i.test(explicit)) {
    return explicit.replace(/\/$/, '');
  }

  const railway = process.env.RAILWAY_SERVICE_EDRO_BACKEND_URL?.trim();
  if (railway) {
    return `https://${railway.replace(/\/$/, '')}`;
  }

  const publicBackend = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  if (publicBackend && /^https?:\/\//i.test(publicBackend)) {
    return publicBackend.replace(/\/$/, '');
  }

  return process.env.NODE_ENV === 'production'
    ? 'https://edro-backend-production.up.railway.app'
    : 'http://localhost:3333';
}

export async function GET() {
  return NextResponse.redirect(`${resolveBackendBase()}/api/auth/google/calendar/start`);
}
