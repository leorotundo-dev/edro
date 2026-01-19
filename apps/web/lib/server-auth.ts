'use server';

import { cookies } from 'next/headers';

export function getServerAuthToken(): string | undefined {
  return cookies().get('edro_token')?.value;
}
