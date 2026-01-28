import { query } from '../db';

export async function findTenantBySlug(slug: string) {
  const { rows } = await query<{ id: string; name: string; slug: string }>(
    `SELECT id, name, slug FROM tenants WHERE slug=$1 LIMIT 1`,
    [slug]
  );
  return rows[0] ?? null;
}

export async function ensureTenantForDomain(domain: string, createIfMissing = true) {
  const slug = domain.toLowerCase();
  const existing = await findTenantBySlug(slug);
  if (existing || !createIfMissing) return existing;

  const name = slug === 'edro.digital' ? 'Edro Digital' : slug;
  const { rows } = await query<{ id: string; name: string; slug: string }>(
    `INSERT INTO tenants (name, slug) VALUES ($1,$2) RETURNING id, name, slug`,
    [name, slug]
  );
  return rows[0] ?? null;
}

export function mapRoleToTenantRole(role?: string | null) {
  const normalized = (role || '').toLowerCase();
  if (normalized === 'admin' || normalized === 'gestor') return 'admin';
  if (normalized === 'manager') return 'manager';
  if (normalized === 'reviewer') return 'reviewer';
  if (normalized === 'viewer') return 'viewer';
  return 'reviewer';
}

export async function ensureTenantMembership(params: {
  tenant_id: string;
  user_id: string;
  role: string;
}) {
  await query(
    `INSERT INTO tenant_users (tenant_id, user_id, role)
     VALUES ($1,$2,$3)
     ON CONFLICT (tenant_id, user_id)
     DO UPDATE SET role=EXCLUDED.role`,
    [params.tenant_id, params.user_id, params.role]
  );
}

export async function getPrimaryTenantForUser(userId: string) {
  const { rows } = await query<{ tenant_id: string; role: string }>(
    `SELECT tenant_id, role
     FROM tenant_users
     WHERE user_id=$1
     ORDER BY role='admin' DESC
     LIMIT 1`,
    [userId]
  );
  return rows[0] ?? null;
}
