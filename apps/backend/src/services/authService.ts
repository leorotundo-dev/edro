/**
 * Auth Service - Advanced
 * 
 * Serviços avançados de autenticação:
 * - Password reset
 * - Email verification
 * - Refresh tokens
 * - Rate limiting
 */

import { query } from '../db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const hashToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');

// ============================================
// TIPOS
// ============================================

export interface PasswordResetToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  used: boolean;
  created_at: Date;
}

export interface EmailVerification {
  id: string;
  user_id: string;
  token: string;
  verified: boolean;
  expires_at: Date;
  created_at: Date;
}

export interface RefreshToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  revoked: boolean;
  created_at: Date;
}

// ============================================
// PASSWORD RESET
// ============================================

export async function createPasswordResetToken(email: string): Promise<{
  token: string;
  userId: string;
} | null> {
  console.log(`[auth] Criando token de reset para: ${email}`);

  // Buscar usuário
  const { rows: users } = await query(`
    SELECT id, email FROM users WHERE email = $1
  `, [email]);

  if (users.length === 0) {
    console.log(`[auth] Email não encontrado: ${email}`);
    return null;
  }

  const user = users[0];

  // Gerar token único
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  
  // Expiração: 1 hora
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);

  // Invalidar tokens anteriores
  await query(`
    UPDATE password_reset_tokens
    SET used = true
    WHERE user_id = $1 AND used = false
  `, [user.id]);

  // Criar novo token
  await query(`
    INSERT INTO password_reset_tokens (
      user_id, token, expires_at
    ) VALUES ($1, $2, $3)
  `, [user.id, tokenHash, expiresAt]);

  console.log(`[auth] ✅ Token criado para ${email}`);

  return {
    token,
    userId: user.id,
  };
}

export async function validatePasswordResetToken(token: string): Promise<{
  valid: boolean;
  userId?: string;
  tokenId?: string;
  error?: string;
}> {
  console.log(`[auth] Validando token de reset`);

  const tokenHash = hashToken(token);
  const { rows } = await query<PasswordResetToken>(`
    SELECT * FROM password_reset_tokens
    WHERE (token = $1 OR token = $2) AND used = false
    ORDER BY created_at DESC
    LIMIT 1
  `, [tokenHash, token]);

  if (rows.length === 0) {
    return { valid: false, error: 'Token inválido' };
  }

  const tokenData = rows[0];

  // Verificar expiração
  if (new Date() > new Date(tokenData.expires_at)) {
    return { valid: false, error: 'Token expirado' };
  }

  return { valid: true, userId: tokenData.user_id, tokenId: tokenData.id };
}

export async function resetPassword(token: string, newPassword: string): Promise<{
  success: boolean;
  error?: string;
}> {
  console.log(`[auth] Resetando senha`);

  // Validar token
  const validation = await validatePasswordResetToken(token);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  if (!validation.tokenId) {
    return { success: false, error: 'Token invalido' };
  }

  // Hash da nova senha
  const passwordHash = await bcrypt.hash(newPassword, 10);

  // Atualizar senha
  await query(`
    UPDATE users
    SET password_hash = $1, updated_at = NOW()
    WHERE id = $2
  `, [passwordHash, validation.userId]);

  // Marcar token como usado
  await query(`
    UPDATE password_reset_tokens
    SET used = true
    WHERE id = $1
  `, [validation.tokenId]);

  console.log(`[auth] ✅ Senha resetada com sucesso`);

  return { success: true };
}

// ============================================
// EMAIL VERIFICATION
// ============================================

export async function createEmailVerificationToken(userId: string): Promise<string> {
  console.log(`[auth] Criando token de verificação para user: ${userId}`);

  // Gerar token
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);

  // Expiração: 24 horas
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  // Criar token
  await query(`
    INSERT INTO email_verifications (
      user_id, token, expires_at
    ) VALUES ($1, $2, $3)
  `, [userId, tokenHash, expiresAt]);

  return token;
}

export async function verifyEmail(token: string): Promise<{
  success: boolean;
  error?: string;
}> {
  console.log(`[auth] Verificando email`);

  const tokenHash = hashToken(token);
  const { rows } = await query<EmailVerification>(`
    SELECT * FROM email_verifications
    WHERE (token = $1 OR token = $2) AND verified = false
    ORDER BY created_at DESC
    LIMIT 1
  `, [tokenHash, token]);

  if (rows.length === 0) {
    return { success: false, error: 'Token inválido' };
  }

  const verification = rows[0];

  // Verificar expiração
  if (new Date() > new Date(verification.expires_at)) {
    return { success: false, error: 'Token expirado' };
  }

  // Marcar email como verificado
  await query(`
    UPDATE users
    SET email_verified = true, updated_at = NOW()
    WHERE id = $1
  `, [verification.user_id]);

  // Marcar verificação como completa
  await query(`
    UPDATE email_verifications
    SET verified = true
    WHERE id = $1
  `, [verification.id]);

  console.log(`[auth] ✅ Email verificado com sucesso`);

  return { success: true };
}

export async function isEmailVerified(userId: string): Promise<boolean> {
  const { rows } = await query(`
    SELECT email_verified FROM users WHERE id = $1
  `, [userId]);

  return rows[0]?.email_verified || false;
}

// ============================================
// REFRESH TOKENS
// ============================================

export async function createRefreshToken(userId: string): Promise<string> {
  console.log(`[auth] Criando refresh token para: ${userId}`);

  // Gerar token
  const token = crypto.randomBytes(64).toString('hex');
  const tokenHash = hashToken(token);

  // Expiração: 30 dias
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  // Criar token
  await query(`
    INSERT INTO refresh_tokens (
      user_id, token, expires_at
    ) VALUES ($1, $2, $3)
  `, [userId, tokenHash, expiresAt]);

  return token;
}

export async function validateRefreshToken(token: string): Promise<{
  valid: boolean;
  userId?: string;
  error?: string;
}> {
  const tokenHash = hashToken(token);
  const { rows } = await query<RefreshToken>(`
    SELECT * FROM refresh_tokens
    WHERE (token = $1 OR token = $2) AND revoked = false
    ORDER BY created_at DESC
    LIMIT 1
  `, [tokenHash, token]);

  if (rows.length === 0) {
    return { valid: false, error: 'Token inválido' };
  }

  const tokenData = rows[0];

  // Verificar expiração
  if (new Date() > new Date(tokenData.expires_at)) {
    return { valid: false, error: 'Token expirado' };
  }

  return { valid: true, userId: tokenData.user_id };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await query(`
    UPDATE refresh_tokens
    SET revoked = true
    WHERE token = $1 OR token = $2
  `, [tokenHash, token]);
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await query(`
    UPDATE refresh_tokens
    SET revoked = true
    WHERE user_id = $1 AND revoked = false
  `, [userId]);
}

// ============================================
// RATE LIMITING
// ============================================

interface RateLimitRecord {
  identifier: string;
  attempts: number;
  window_start: Date;
}

const RATE_LIMITS = {
  login: { maxAttempts: 5, windowMinutes: 15 },
  register: { maxAttempts: 3, windowMinutes: 60 },
  passwordReset: { maxAttempts: 3, windowMinutes: 60 },
};

export async function checkRateLimit(
  identifier: string,
  action: 'login' | 'register' | 'passwordReset'
): Promise<{
  allowed: boolean;
  remaining?: number;
  resetAt?: Date;
}> {
  const limit = RATE_LIMITS[action];
  const key = `${action}:${identifier}`;

  // Buscar registro
  const { rows } = await query<RateLimitRecord>(`
    SELECT * FROM rate_limits
    WHERE identifier = $1 AND action = $2
    ORDER BY window_start DESC
    LIMIT 1
  `, [key, action]);

  const now = new Date();
  let record = rows[0];

  // Se não existe ou janela expirou, criar novo
  if (!record || isWindowExpired(record.window_start, limit.windowMinutes)) {
    await query(`
      INSERT INTO rate_limits (identifier, action, attempts, window_start)
      VALUES ($1, $2, 1, $3)
      ON CONFLICT (identifier, action) 
      DO UPDATE SET attempts = 1, window_start = $3
    `, [key, action, now]);

    return {
      allowed: true,
      remaining: limit.maxAttempts - 1,
      resetAt: new Date(now.getTime() + limit.windowMinutes * 60000),
    };
  }

  // Verificar se excedeu limite
  if (record.attempts >= limit.maxAttempts) {
    const resetAt = new Date(
      new Date(record.window_start).getTime() + limit.windowMinutes * 60000
    );

    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }

  // Incrementar tentativas
  await query(`
    UPDATE rate_limits
    SET attempts = attempts + 1
    WHERE identifier = $1 AND action = $2
  `, [key, action]);

  return {
    allowed: true,
    remaining: limit.maxAttempts - record.attempts - 1,
    resetAt: new Date(
      new Date(record.window_start).getTime() + limit.windowMinutes * 60000
    ),
  };
}

function isWindowExpired(windowStart: Date, windowMinutes: number): boolean {
  const expiresAt = new Date(windowStart);
  expiresAt.setMinutes(expiresAt.getMinutes() + windowMinutes);
  return new Date() > expiresAt;
}

// ============================================
// LIMPEZA
// ============================================

export async function cleanupExpiredTokens(): Promise<{
  passwordResetTokens: number;
  emailVerifications: number;
  refreshTokens: number;
}> {
  console.log('[auth] Limpando tokens expirados');

  const { rows: passwordReset } = await query(`
    DELETE FROM password_reset_tokens
    WHERE expires_at < NOW() OR used = true
    RETURNING id
  `);

  const { rows: emailVer } = await query(`
    DELETE FROM email_verifications
    WHERE expires_at < NOW() OR verified = true
    RETURNING id
  `);

  const { rows: refresh } = await query(`
    DELETE FROM refresh_tokens
    WHERE expires_at < NOW() OR revoked = true
    RETURNING id
  `);

  return {
    passwordResetTokens: passwordReset.length,
    emailVerifications: emailVer.length,
    refreshTokens: refresh.length,
  };
}

// ============================================
// EXPORTAÇÃO
// ============================================

export const AuthService = {
  createPasswordResetToken,
  validatePasswordResetToken,
  resetPassword,
  createEmailVerificationToken,
  verifyEmail,
  isEmailVerified,
  createRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  checkRateLimit,
  cleanupExpiredTokens,
};

export default AuthService;
