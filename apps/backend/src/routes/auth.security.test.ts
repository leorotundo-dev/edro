import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import fastify, { type FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';

const {
  mockVerifyLoginCode,
  mockFindUserById,
  mockFindUserByEmail,
  mockFindUserMfaByUserId,
  mockRotateRefreshToken,
  mockEnsureTenantForDomain,
  mockEnsureTenantMembership,
  mockGetPrimaryTenantForUser,
  mockMapRoleToTenantRole,
  mockIssueRefreshToken,
  mockRevokeAllRefresh,
  mockSavePendingUserMfaSecret,
  mockClearPendingUserMfaSecret,
  mockMarkUserMfaVerified,
  mockEnableUserMfa,
  mockConsumeUserRecoveryCode,
  mockCreateLoginCode,
  mockConsumeLoginCode,
  mockUpsertUser,
  mockSendEmail,
  mockPoolQuery,
  mockQuery,
} = vi.hoisted(() => ({
  mockVerifyLoginCode: vi.fn(),
  mockFindUserById: vi.fn(),
  mockFindUserByEmail: vi.fn(),
  mockFindUserMfaByUserId: vi.fn(),
  mockRotateRefreshToken: vi.fn(),
  mockEnsureTenantForDomain: vi.fn(),
  mockEnsureTenantMembership: vi.fn(),
  mockGetPrimaryTenantForUser: vi.fn(),
  mockMapRoleToTenantRole: vi.fn(),
  mockIssueRefreshToken: vi.fn(),
  mockRevokeAllRefresh: vi.fn(),
  mockSavePendingUserMfaSecret: vi.fn(),
  mockClearPendingUserMfaSecret: vi.fn(),
  mockMarkUserMfaVerified: vi.fn(),
  mockEnableUserMfa: vi.fn(),
  mockConsumeUserRecoveryCode: vi.fn(),
  mockCreateLoginCode: vi.fn(),
  mockConsumeLoginCode: vi.fn(),
  mockUpsertUser: vi.fn(),
  mockSendEmail: vi.fn(),
  mockPoolQuery: vi.fn(),
  mockQuery: vi.fn(),
}));

const mfaRolloutState = vi.hoisted(() => ({
  enforced: true,
}));

vi.mock('../services/authService', () => ({
  requestLoginCode: vi.fn(),
  verifyLoginCode: (...args: any[]) => mockVerifyLoginCode(...args),
}));

vi.mock('../repositories/edroUserRepository', () => ({
  findUserByEmail: (...args: any[]) => mockFindUserByEmail(...args),
  findUserById: (...args: any[]) => mockFindUserById(...args),
  createLoginCode: (...args: any[]) => mockCreateLoginCode(...args),
  consumeLoginCode: (...args: any[]) => mockConsumeLoginCode(...args),
  upsertUser: (...args: any[]) => mockUpsertUser(...args),
}));

vi.mock('../repositories/edroUserMfaRepository', () => ({
  clearPendingUserMfaSecret: (...args: any[]) => mockClearPendingUserMfaSecret(...args),
  enableUserMfa: (...args: any[]) => mockEnableUserMfa(...args),
  findUserMfaByUserId: (...args: any[]) => mockFindUserMfaByUserId(...args),
  markUserMfaVerified: (...args: any[]) => mockMarkUserMfaVerified(...args),
  savePendingUserMfaSecret: (...args: any[]) => mockSavePendingUserMfaSecret(...args),
  consumeUserRecoveryCode: (...args: any[]) => mockConsumeUserRecoveryCode(...args),
}));

vi.mock('../auth/refresh', () => ({
  issueRefreshToken: (...args: any[]) => mockIssueRefreshToken(...args),
  rotateRefreshToken: (...args: any[]) => mockRotateRefreshToken(...args),
  revokeAllRefresh: (...args: any[]) => mockRevokeAllRefresh(...args),
}));

vi.mock('../repos/tenantRepo', () => ({
  ensureTenantForDomain: (...args: any[]) => mockEnsureTenantForDomain(...args),
  ensureTenantMembership: (...args: any[]) => mockEnsureTenantMembership(...args),
  getPrimaryTenantForUser: (...args: any[]) => mockGetPrimaryTenantForUser(...args),
  mapRoleToTenantRole: (...args: any[]) => mockMapRoleToTenantRole(...args),
}));

vi.mock('../services/emailService', () => ({
  sendEmail: (...args: any[]) => mockSendEmail(...args),
}));

vi.mock('../db', () => ({
  pool: {
    query: (...args: any[]) => mockPoolQuery(...args),
  },
  query: (...args: any[]) => mockQuery(...args),
  db: {
    query: (...args: any[]) => mockQuery(...args),
  },
}));

vi.mock('../utils/hash', () => ({
  makeHash: vi.fn().mockReturnValue('hash'),
}));

vi.mock('../env', () => ({
  allowUnsafeLocalAuthHelpers: false,
  get enforcePrivilegedMfa() {
    return mfaRolloutState.enforced;
  },
  portalLoginSecret: 'test-portal-secret',
  env: {
    NODE_ENV: 'test',
    WEB_URL: 'http://localhost:3000',
    JWT_SECRET: 'test-secret-key-long-enough',
    EDRO_LOGIN_ECHO_CODE: false,
    EDRO_ADMIN_EMAILS: '',
  },
}));

vi.mock('../services/mfaService', () => ({
  buildMfaOtpAuthUrl: vi.fn().mockReturnValue('otpauth://totp/Edro:test'),
  decryptMfaSecret: vi.fn().mockReturnValue('SECRET'),
  encryptMfaSecret: vi.fn().mockReturnValue('encrypted-secret'),
  generateMfaSecret: vi.fn().mockReturnValue('SECRET'),
  generateRecoveryCodes: vi.fn().mockReturnValue(['ABCD-EFGH', 'IJKL-MNOP']),
  hashRecoveryCode: vi.fn((value: string) => `hash:${value}`),
  isRecoveryCodeFormat: vi.fn((value: string) => value.includes('-')),
  verifyMfaCode: vi.fn().mockReturnValue(true),
}));

import authRoutes from './auth';

let app: FastifyInstance;

beforeAll(async () => {
  app = fastify({ logger: false });
  await app.register(jwt, { secret: 'test-secret-key-long-enough' });
  await app.register(authRoutes, { prefix: '/api' });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  mfaRolloutState.enforced = true;
  mockVerifyLoginCode.mockReset();
  mockFindUserById.mockReset();
  mockFindUserByEmail.mockReset();
  mockFindUserMfaByUserId.mockReset();
  mockRotateRefreshToken.mockReset();
  mockEnsureTenantForDomain.mockReset();
  mockEnsureTenantMembership.mockReset();
  mockGetPrimaryTenantForUser.mockReset();
  mockMapRoleToTenantRole.mockReset();
  mockIssueRefreshToken.mockReset();
  mockRevokeAllRefresh.mockReset();
  mockSavePendingUserMfaSecret.mockReset();
  mockClearPendingUserMfaSecret.mockReset();
  mockMarkUserMfaVerified.mockReset();
  mockEnableUserMfa.mockReset();
  mockConsumeUserRecoveryCode.mockReset();
  mockCreateLoginCode.mockReset();
  mockConsumeLoginCode.mockReset();
  mockUpsertUser.mockReset();
  mockSendEmail.mockReset();
  mockPoolQuery.mockReset();
  mockQuery.mockReset();

  mockMapRoleToTenantRole.mockImplementation((role?: string | null) => role ?? 'viewer');
  mockEnsureTenantMembership.mockResolvedValue(undefined);
});

describe('POST /api/auth/verify', () => {
  it('returns a pending MFA challenge for privileged users with MFA enabled', async () => {
    mockVerifyLoginCode.mockResolvedValueOnce({
      id: '59f2bd43-0674-4d10-86cf-e265cf5cb8db',
      email: 'admin@edro.digital',
      role: 'admin',
    });
    mockEnsureTenantForDomain.mockResolvedValueOnce({ id: 'tenant-1' });
    mockFindUserMfaByUserId.mockResolvedValueOnce({
      user_id: '59f2bd43-0674-4d10-86cf-e265cf5cb8db',
      secret_enc: 'encrypted-secret',
      enabled_at: new Date().toISOString(),
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/verify',
      payload: { email: 'admin@edro.digital', code: '123456' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.mfaRequired).toBe(true);
    expect(body.mfaEnrollmentRequired).toBe(false);
    expect(typeof body.pendingToken).toBe('string');
    expect(body.token).toBeUndefined();
  });

  it('returns pending MFA setup when the privileged user has not enrolled yet', async () => {
    mockVerifyLoginCode.mockResolvedValueOnce({
      id: '59f2bd43-0674-4d10-86cf-e265cf5cb8db',
      email: 'manager@edro.digital',
      role: 'manager',
    });
    mockEnsureTenantForDomain.mockResolvedValueOnce({ id: 'tenant-1' });
    mockFindUserMfaByUserId.mockResolvedValueOnce(null);

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/verify',
      payload: { email: 'manager@edro.digital', code: '123456' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.mfaRequired).toBe(false);
    expect(body.mfaEnrollmentRequired).toBe(true);
    expect(typeof body.pendingToken).toBe('string');
  });

  it('issues a direct session for privileged users while MFA enforcement rollout is disabled', async () => {
    mfaRolloutState.enforced = false;
    mockVerifyLoginCode.mockResolvedValueOnce({
      id: '59f2bd43-0674-4d10-86cf-e265cf5cb8db',
      email: 'admin@edro.digital',
      role: 'admin',
    });
    mockEnsureTenantForDomain.mockResolvedValueOnce({ id: 'tenant-1' });
    mockIssueRefreshToken.mockResolvedValueOnce('2026-04-01T00:00:00.000Z');

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/verify',
      payload: { email: 'admin@edro.digital', code: '123456' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(typeof body.token).toBe('string');
    expect(body.pendingToken).toBeUndefined();
    expect(body.refreshToken).toBeTruthy();
  });
});

describe('GET /api/auth/me', () => {
  it('rejects a privileged session token without MFA', async () => {
    const token = app.jwt.sign({
      sub: '59f2bd43-0674-4d10-86cf-e265cf5cb8db',
      email: 'admin@edro.digital',
      role: 'admin',
      tenant_id: 'tenant-1',
      mfa: false,
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body)).toEqual({ error: 'mfa_required' });
  });

  it('returns the session when rollout enforcement is disabled', async () => {
    mfaRolloutState.enforced = false;
    const token = app.jwt.sign({
      sub: '59f2bd43-0674-4d10-86cf-e265cf5cb8db',
      email: 'admin@edro.digital',
      role: 'admin',
      tenant_id: 'tenant-1',
      mfa: false,
    });
    mockFindUserByEmail.mockResolvedValueOnce({
      id: '59f2bd43-0674-4d10-86cf-e265cf5cb8db',
      email: 'admin@edro.digital',
      role: 'admin',
    });
    mockGetPrimaryTenantForUser.mockResolvedValueOnce({
      tenant_id: 'tenant-1',
      role: 'admin',
    });
    mockFindUserMfaByUserId.mockResolvedValueOnce(null);

    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({
      email: 'admin@edro.digital',
      mfa_enabled: false,
      mfa_enforced: false,
    });
  });
});

describe('POST /api/auth/refresh', () => {
  it('forces privileged users to reauthenticate when the refresh token is not MFA-verified', async () => {
    mockRotateRefreshToken.mockResolvedValueOnce({
      expiresAt: '2026-04-01T00:00:00.000Z',
      mfaVerified: false,
    });
    mockFindUserById.mockResolvedValueOnce({
      id: '59f2bd43-0674-4d10-86cf-e265cf5cb8db',
      email: 'admin@edro.digital',
    });
    mockGetPrimaryTenantForUser.mockResolvedValueOnce({
      tenant_id: 'tenant-1',
      role: 'admin',
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: {
        userId: '59f2bd43-0674-4d10-86cf-e265cf5cb8db',
        refreshToken: 'refresh-token-value',
      },
    });

    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body)).toEqual({ error: 'mfa_reauth_required' });
  });

  it('rotates refresh tokens successfully when MFA is already verified', async () => {
    mockRotateRefreshToken.mockResolvedValueOnce({
      expiresAt: '2026-04-01T00:00:00.000Z',
      mfaVerified: true,
    });
    mockFindUserById.mockResolvedValueOnce({
      id: '59f2bd43-0674-4d10-86cf-e265cf5cb8db',
      email: 'admin@edro.digital',
    });
    mockGetPrimaryTenantForUser.mockResolvedValueOnce({
      tenant_id: 'tenant-1',
      role: 'admin',
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: {
        userId: '59f2bd43-0674-4d10-86cf-e265cf5cb8db',
        refreshToken: 'refresh-token-value',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(typeof body.accessToken).toBe('string');
    expect(body.refreshToken).toBeTruthy();
    expect(body.refreshExpiresAt).toBe('2026-04-01T00:00:00.000Z');
  });

  it('allows privileged refresh rotation during rollout when MFA enforcement is disabled', async () => {
    mfaRolloutState.enforced = false;
    mockRotateRefreshToken.mockResolvedValueOnce({
      expiresAt: '2026-04-01T00:00:00.000Z',
      mfaVerified: false,
    });
    mockFindUserById.mockResolvedValueOnce({
      id: '59f2bd43-0674-4d10-86cf-e265cf5cb8db',
      email: 'admin@edro.digital',
    });
    mockGetPrimaryTenantForUser.mockResolvedValueOnce({
      tenant_id: 'tenant-1',
      role: 'admin',
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: {
        userId: '59f2bd43-0674-4d10-86cf-e265cf5cb8db',
        refreshToken: 'refresh-token-value',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(typeof body.accessToken).toBe('string');
    expect(body.refreshToken).toBeTruthy();
  });
});
