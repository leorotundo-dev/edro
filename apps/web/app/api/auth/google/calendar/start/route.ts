import { NextResponse } from 'next/server';
import { getBackendBaseUrl } from '@/lib/serverAuth';

export async function GET() {
  return NextResponse.redirect(`${getBackendBaseUrl()}/api/auth/google/calendar/start`);
}
