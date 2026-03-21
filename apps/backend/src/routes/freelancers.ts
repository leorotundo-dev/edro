import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { pool } from '../db';
import { ensureTenantMembership } from '../repos/tenantRepo';
import { upsertUser } from '../repositories/edroUserRepository';
import { syncFreelancerPerson } from '../repos/peopleRepo';
import { generateCopy } from '../services/ai/copyService';

// ── helpers ────────────────────────────────────────────────────────────────

function periodMonthOf(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function minutesBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

async function loadFreelancerIdentitySnapshot(freelancerId: string) {
  const res = await pool.query(
    `SELECT fp.id,
            fp.person_id,
            fp.user_id,
            fp.display_name,
            fp.email_personal,
            fp.phone,
            fp.whatsapp_jid,
            eu.email
       FROM freelancer_profiles fp
       JOIN edro_users eu ON eu.id = fp.user_id
      WHERE fp.id = $1`,
    [freelancerId],
  );
  return res.rows[0] ?? null;
}

// ── PDF generation (requires: pnpm add pdfkit @types/pdfkit in apps/backend) ──
// Falls back to plain text if pdfkit is not available.
async function generateReceiptPdf(params: {
  displayName: string;
  pixKey: string | null;
  periodMonth: string;
  totalMinutes: number | null;
  flatFeeBrl: number | null;
  amountBrl: number;
  status: string;
  paidAt: Date | null;
}): Promise<Buffer> {
  let PDFDocument: any;
  try {
    PDFDocument = (await import('pdfkit')).default;
  } catch {
    // pdfkit not installed — return plain text PDF-like content
    const lines = [
      'RECIBO DE PAGAMENTO — EDRO DIGITAL',
      '='.repeat(40),
      `Freelancer : ${params.displayName}`,
      `PIX        : ${params.pixKey ?? 'Não informado'}`,
      `Período    : ${params.periodMonth}`,
      params.totalMinutes != null
        ? `Horas      : ${formatHours(params.totalMinutes)}`
        : `Modalidade : Projeto (flat-fee)`,
      `Valor      : R$ ${params.amountBrl.toFixed(2)}`,
      `Status     : ${params.status === 'paid' ? 'PAGO' : 'A PAGAR'}`,
      params.paidAt ? `Pago em    : ${params.paidAt.toLocaleDateString('pt-BR')}` : '',
    ].filter(Boolean).join('\n');
    return Buffer.from(lines, 'utf-8');
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 60 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(18).font('Helvetica-Bold').text('RECIBO DE PAGAMENTO', { align: 'center' });
    doc.fontSize(11).font('Helvetica').text('Edro Digital', { align: 'center' });
    doc.moveDown(1.5);

    // Details
    const left = 60;
    doc.fontSize(12).font('Helvetica-Bold').text('Freelancer:', left, doc.y, { continued: true })
       .font('Helvetica').text(` ${params.displayName}`);

    if (params.pixKey) {
      doc.font('Helvetica-Bold').text('PIX:', { continued: true })
         .font('Helvetica').text(` ${params.pixKey}`);
    }

    doc.font('Helvetica-Bold').text('Período:', { continued: true })
       .font('Helvetica').text(` ${params.periodMonth}`);

    if (params.totalMinutes != null) {
      doc.font('Helvetica-Bold').text('Horas trabalhadas:', { continued: true })
         .font('Helvetica').text(` ${formatHours(params.totalMinutes)}`);
    } else {
      doc.font('Helvetica-Bold').text('Modalidade:', { continued: true })
         .font('Helvetica').text(' Projeto (flat-fee)');
    }

    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica-Bold')
       .text(`Valor: R$ ${params.amountBrl.toFixed(2)}`);

    doc.moveDown(0.5);
    const statusText = params.status === 'paid'
      ? `PAGO${params.paidAt ? ' em ' + params.paidAt.toLocaleDateString('pt-BR') : ''}`
      : 'A PAGAR';
    doc.fontSize(13).fillColor(params.status === 'paid' ? '#2e7d32' : '#e65100')
       .text(statusText, { align: 'center' });

    doc.end();
  });
}

// ── Route plugin ───────────────────────────────────────────────────────────

export default async function freelancersRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);
  app.addHook('preHandler', tenantGuard());

  // ── Freelancer profiles ─────────────────────────────────────────────────

  app.get('/freelancers', { preHandler: [requirePerm('clients:read')] }, async (request: any, reply) => {
    const tenantId = (request as any).user?.tenant_id;
    const rows = await pool.query(
      `SELECT fp.*, eu.email
       FROM freelancer_profiles fp
       JOIN edro_users eu ON eu.id = fp.user_id
       JOIN tenant_users tu ON tu.user_id = eu.id AND tu.tenant_id = $1
       ORDER BY fp.display_name`,
      [tenantId],
    );
    return reply.send(rows.rows);
  });

  const freelancerCreateSchema = z.object({
    user_id: z.string().uuid().optional().nullable(),
    user_email: z.string().email().optional().nullable(),
    display_name: z.string().min(1),
    specialty: z.string().optional().nullable(),
    hourly_rate_brl: z.number().positive().optional().nullable(),
    pix_key: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    whatsapp_jid: z.string().optional().nullable(),
    department: z.string().optional().nullable(),
    role_title: z.string().optional().nullable(),
    email_personal: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    cpf: z.string().optional().nullable(),
    rg: z.string().optional().nullable(),
    birth_date: z.string().optional().nullable(),
    bank_name: z.string().optional().nullable(),
    bank_agency: z.string().optional().nullable(),
    bank_account: z.string().optional().nullable(),
    skills: z.array(z.string()).optional().nullable(),
    available_days: z.array(z.string()).optional().nullable(),
    available_hours_start: z.string().optional().nullable(),
    available_hours_end: z.string().optional().nullable(),
    weekly_capacity_hours: z.number().positive().optional().nullable(),
    contract_type: z.string().optional().nullable(),
    tools: z.array(z.string()).optional().nullable(),
    ai_tools: z.array(z.string()).optional().nullable(),
    experience_level: z.enum(['junior', 'mid', 'senior']).optional().nullable(),
    max_concurrent_jobs: z.number().int().min(1).max(20).optional().nullable(),
    portfolio_url: z.string().optional().nullable(),
    platform_expertise: z.array(z.string()).optional().nullable(),
    languages: z.array(z.string()).optional().nullable(),
    unavailable_until: z.string().optional().nullable(), // ISO date YYYY-MM-DD
  }).superRefine((body, ctx) => {
    if (!body.user_id && !body.user_email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selecione um usuário existente ou informe um e-mail de acesso.',
        path: ['user_email'],
      });
    }
  });

  app.post('/freelancers', { preHandler: [requirePerm('clients:write')] }, async (request: any, reply) => {
    const body = freelancerCreateSchema.parse(request.body);
    const tenantId = (request as any).user?.tenant_id;

    let userId = body.user_id ?? null;

    if (userId) {
      const userCheck = await pool.query(
        `SELECT eu.id
           FROM edro_users eu
           JOIN tenant_users tu ON tu.user_id = eu.id
          WHERE eu.id = $1::uuid
            AND tu.tenant_id = $2
          LIMIT 1`,
        [userId, tenantId],
      );
      if (!userCheck.rows.length) {
        return reply.status(404).send({ error: 'Usuário não encontrado neste tenant.' });
      }
    } else {
      const normalizedEmail = body.user_email?.trim().toLowerCase();
      if (!normalizedEmail) {
        return reply.status(400).send({ error: 'Informe o e-mail de acesso do freelancer.' });
      }

      const user = await upsertUser({
        email: normalizedEmail,
        name: body.display_name,
        role: 'staff',
      });
      userId = user.id;

      await ensureTenantMembership({
        tenant_id: tenantId,
        user_id: user.id,
        role: 'viewer',
      });
    }

    const res = await pool.query(
      `INSERT INTO freelancer_profiles (user_id, display_name, specialty, hourly_rate_brl, pix_key, phone, whatsapp_jid, department, role_title, email_personal, notes, cpf, rg, birth_date, bank_name, bank_agency, bank_account, skills, available_days, available_hours_start, available_hours_end, weekly_capacity_hours, contract_type, tools, ai_tools, experience_level, max_concurrent_jobs, portfolio_url, platform_expertise, languages)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30)
       ON CONFLICT (user_id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         specialty = EXCLUDED.specialty,
         hourly_rate_brl = EXCLUDED.hourly_rate_brl,
         pix_key = EXCLUDED.pix_key,
         phone = EXCLUDED.phone,
         whatsapp_jid = EXCLUDED.whatsapp_jid,
         department = EXCLUDED.department,
         role_title = EXCLUDED.role_title,
         email_personal = EXCLUDED.email_personal,
         notes = EXCLUDED.notes,
         cpf = EXCLUDED.cpf,
         rg = EXCLUDED.rg,
         birth_date = EXCLUDED.birth_date,
         bank_name = EXCLUDED.bank_name,
         bank_agency = EXCLUDED.bank_agency,
         bank_account = EXCLUDED.bank_account,
         skills = EXCLUDED.skills,
         available_days = EXCLUDED.available_days,
         available_hours_start = EXCLUDED.available_hours_start,
         available_hours_end = EXCLUDED.available_hours_end,
         weekly_capacity_hours = EXCLUDED.weekly_capacity_hours,
         contract_type = EXCLUDED.contract_type,
         tools = EXCLUDED.tools,
         ai_tools = EXCLUDED.ai_tools,
         experience_level = EXCLUDED.experience_level,
         max_concurrent_jobs = COALESCE(EXCLUDED.max_concurrent_jobs, 3),
         portfolio_url = EXCLUDED.portfolio_url,
         platform_expertise = EXCLUDED.platform_expertise,
         languages = EXCLUDED.languages,
         is_active = true,
         updated_at = now()
       RETURNING *`,
      [userId, body.display_name, body.specialty ?? null, body.hourly_rate_brl ?? null, body.pix_key ?? null,
       body.phone ?? null, body.whatsapp_jid ?? null, body.department ?? null, body.role_title ?? null,
       body.email_personal ?? null, body.notes ?? null, body.cpf ?? null, body.rg ?? null, body.birth_date ?? null,
       body.bank_name ?? null, body.bank_agency ?? null, body.bank_account ?? null,
       body.skills ?? null, body.available_days ?? null, body.available_hours_start ?? null,
       body.available_hours_end ?? null, body.weekly_capacity_hours ?? null, body.contract_type ?? null,
       body.tools ?? null, body.ai_tools ?? null, body.experience_level ?? null,
       body.max_concurrent_jobs ?? null, body.portfolio_url ?? null,
       body.platform_expertise ?? null, body.languages ?? null],
    );
    const snapshot = await loadFreelancerIdentitySnapshot(res.rows[0].id);
    if (snapshot) {
      res.rows[0].person_id = await syncFreelancerPerson({
        freelancerId: snapshot.id,
        tenantId,
        displayName: snapshot.display_name,
        userId: snapshot.user_id,
        email: snapshot.email,
        emailPersonal: snapshot.email_personal,
        phone: snapshot.phone,
        whatsappJid: snapshot.whatsapp_jid,
        existingPersonId: snapshot.person_id ?? null,
      });
    }
    return reply.status(201).send(res.rows[0]);
  });

  app.get('/freelancers/:id', { preHandler: [requirePerm('clients:read')] }, async (request: any, reply) => {
    const { id } = request.params;
    const res = await pool.query(
      `SELECT fp.*, eu.email
       FROM freelancer_profiles fp
       JOIN edro_users eu ON eu.id = fp.user_id
       WHERE fp.id = $1`,
      [id],
    );
    if (!res.rows.length) return reply.status(404).send({ error: 'Not found' });
    return reply.send(res.rows[0]);
  });

  // ── GET /freelancers/:id/stats — full profile stats for the lúdic profile page ──
  app.get('/freelancers/:id/stats', { preHandler: [requirePerm('clients:read')] }, async (request: any, reply) => {
    const { id } = request.params;
    const tenantId = (request as any).user?.tenant_id;

    // Profile
    const profileRes = await pool.query(
      `SELECT fp.*, eu.email
         FROM freelancer_profiles fp
         JOIN edro_users eu ON eu.id = fp.user_id
        WHERE fp.id = $1`,
      [id],
    );
    if (!profileRes.rows.length) return reply.status(404).send({ error: 'Not found' });
    const profile = profileRes.rows[0];

    // Recent jobs (last 20 owned by this freelancer in this tenant)
    const jobsRes = await pool.query(
      `SELECT j.id, j.title, j.status, j.job_type, j.complexity, j.priority_band,
              j.deadline_at, j.completed_at, j.estimated_minutes, j.actual_minutes,
              j.revision_count, j.created_at,
              c.name AS client_name
         FROM jobs j
         LEFT JOIN clients c ON c.id = j.client_id
        WHERE j.tenant_id = $1
          AND j.owner_id = $2::uuid
          AND j.status NOT IN ('archived')
        ORDER BY j.created_at DESC
        LIMIT 20`,
      [tenantId, profile.user_id],
    );

    // Workload this week
    const workloadRes = await pool.query(
      `SELECT
         COUNT(*)::int                                          AS active_jobs,
         COALESCE(SUM(j.estimated_minutes), 0)::int            AS active_minutes
         FROM jobs j
        WHERE j.tenant_id = $1
          AND j.owner_id = $2::uuid
          AND j.status NOT IN ('done', 'published', 'archived', 'cancelled')`,
      [tenantId, profile.user_id],
    );

    // Monthly job counts (last 6 months)
    const trendRes = await pool.query(
      `SELECT to_char(date_trunc('month', completed_at), 'YYYY-MM') AS month,
              COUNT(*)::int                                           AS count,
              AVG(CASE WHEN deadline_at IS NOT NULL AND completed_at > deadline_at THEN 0 ELSE 100 END)::int AS punctuality
         FROM jobs
        WHERE tenant_id = $1
          AND owner_id = $2::uuid
          AND status IN ('done', 'published')
          AND completed_at > now() - interval '6 months'
        GROUP BY 1
        ORDER BY 1`,
      [tenantId, profile.user_id],
    );

    // Time accuracy: avg estimated vs actual (last 30 done jobs)
    const accuracyRes = await pool.query(
      `SELECT
         AVG(estimated_minutes)::int  AS avg_estimated,
         AVG(actual_minutes)::int     AS avg_actual,
         COUNT(*)::int                AS sample_count
         FROM jobs
        WHERE tenant_id = $1
          AND owner_id = $2::uuid
          AND status IN ('done', 'published')
          AND actual_minutes IS NOT NULL
          AND estimated_minutes IS NOT NULL
        LIMIT 30`,
      [tenantId, profile.user_id],
    );

    const wl = workloadRes.rows[0];
    const acc = accuracyRes.rows[0];

    return reply.send({
      profile,
      recentJobs: jobsRes.rows,
      workload: {
        activeJobs: wl?.active_jobs ?? 0,
        activeMinutes: wl?.active_minutes ?? 0,
        weeklyCapacityMinutes: (profile.weekly_capacity_hours ?? 20) * 60,
      },
      monthlyTrend: trendRes.rows,
      timeAccuracy: acc?.sample_count > 0 ? {
        avgEstimated: acc.avg_estimated,
        avgActual: acc.avg_actual,
        sampleCount: acc.sample_count,
        driftPercent: acc.avg_estimated > 0
          ? Math.round(((acc.avg_actual - acc.avg_estimated) / acc.avg_estimated) * 100)
          : 0,
      } : null,
    });
  });

  const freelancerPatchSchema = z.object({
    display_name: z.string().min(1).optional(),
    specialty: z.string().optional().nullable(),
    hourly_rate_brl: z.number().positive().optional().nullable(),
    pix_key: z.string().optional().nullable(),
    is_active: z.boolean().optional(),
    phone: z.string().optional().nullable(),
    whatsapp_jid: z.string().optional().nullable(),
    department: z.string().optional().nullable(),
    role_title: z.string().optional().nullable(),
    email_personal: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    cpf: z.string().optional().nullable(),
    rg: z.string().optional().nullable(),
    birth_date: z.string().optional().nullable(),
    bank_name: z.string().optional().nullable(),
    bank_agency: z.string().optional().nullable(),
    bank_account: z.string().optional().nullable(),
    skills: z.array(z.string()).optional().nullable(),
    available_days: z.array(z.string()).optional().nullable(),
    available_hours_start: z.string().optional().nullable(),
    available_hours_end: z.string().optional().nullable(),
    weekly_capacity_hours: z.number().positive().optional().nullable(),
    contract_type: z.string().optional().nullable(),
    tools: z.array(z.string()).optional().nullable(),
    ai_tools: z.array(z.string()).optional().nullable(),
    experience_level: z.enum(['junior', 'mid', 'senior']).optional().nullable(),
    max_concurrent_jobs: z.number().int().min(1).max(20).optional().nullable(),
    portfolio_url: z.string().optional().nullable(),
    platform_expertise: z.array(z.string()).optional().nullable(),
    languages: z.array(z.string()).optional().nullable(),
    unavailable_until: z.string().optional().nullable(),
  });

  app.patch('/freelancers/:id', { preHandler: [requirePerm('clients:write')] }, async (request: any, reply) => {
    const { id } = request.params;
    const body = freelancerPatchSchema.parse(request.body);

    const sets: string[] = [];
    const vals: any[] = [];
    let i = 1;
    if (body.display_name  !== undefined) { sets.push(`display_name = $${i++}`);    vals.push(body.display_name); }
    if (body.specialty     !== undefined) { sets.push(`specialty = $${i++}`);        vals.push(body.specialty); }
    if (body.hourly_rate_brl !== undefined) { sets.push(`hourly_rate_brl = $${i++}`); vals.push(body.hourly_rate_brl); }
    if (body.pix_key       !== undefined) { sets.push(`pix_key = $${i++}`);          vals.push(body.pix_key); }
    if (body.is_active     !== undefined) { sets.push(`is_active = $${i++}`);         vals.push(body.is_active); }
    if (body.phone         !== undefined) { sets.push(`phone = $${i++}`);             vals.push(body.phone); }
    if (body.whatsapp_jid  !== undefined) { sets.push(`whatsapp_jid = $${i++}`);      vals.push(body.whatsapp_jid); }
    if (body.department    !== undefined) { sets.push(`department = $${i++}`);         vals.push(body.department); }
    if (body.role_title    !== undefined) { sets.push(`role_title = $${i++}`);         vals.push(body.role_title); }
    if (body.email_personal !== undefined) { sets.push(`email_personal = $${i++}`);   vals.push(body.email_personal); }
    if (body.notes         !== undefined) { sets.push(`notes = $${i++}`);              vals.push(body.notes); }
    if (body.cpf           !== undefined) { sets.push(`cpf = $${i++}`);                vals.push(body.cpf); }
    if (body.rg            !== undefined) { sets.push(`rg = $${i++}`);                 vals.push(body.rg); }
    if (body.birth_date    !== undefined) { sets.push(`birth_date = $${i++}`);         vals.push(body.birth_date); }
    if (body.bank_name     !== undefined) { sets.push(`bank_name = $${i++}`);          vals.push(body.bank_name); }
    if (body.bank_agency   !== undefined) { sets.push(`bank_agency = $${i++}`);        vals.push(body.bank_agency); }
    if (body.bank_account  !== undefined) { sets.push(`bank_account = $${i++}`);       vals.push(body.bank_account); }
    if (body.skills              !== undefined) { sets.push(`skills = $${i++}`);                vals.push(body.skills); }
    if (body.available_days      !== undefined) { sets.push(`available_days = $${i++}`);         vals.push(body.available_days); }
    if (body.available_hours_start !== undefined) { sets.push(`available_hours_start = $${i++}`); vals.push(body.available_hours_start); }
    if (body.available_hours_end  !== undefined) { sets.push(`available_hours_end = $${i++}`);   vals.push(body.available_hours_end); }
    if (body.weekly_capacity_hours !== undefined) { sets.push(`weekly_capacity_hours = $${i++}`); vals.push(body.weekly_capacity_hours); }
    if (body.contract_type       !== undefined) { sets.push(`contract_type = $${i++}`);          vals.push(body.contract_type); }
    if (body.tools               !== undefined) { sets.push(`tools = $${i++}`);                  vals.push(body.tools); }
    if (body.ai_tools            !== undefined) { sets.push(`ai_tools = $${i++}`);               vals.push(body.ai_tools); }
    if (body.experience_level    !== undefined) { sets.push(`experience_level = $${i++}`);       vals.push(body.experience_level); }
    if (body.max_concurrent_jobs !== undefined) { sets.push(`max_concurrent_jobs = $${i++}`);    vals.push(body.max_concurrent_jobs); }
    if (body.portfolio_url       !== undefined) { sets.push(`portfolio_url = $${i++}`);          vals.push(body.portfolio_url); }
    if (body.platform_expertise  !== undefined) { sets.push(`platform_expertise = $${i++}`);     vals.push(body.platform_expertise); }
    if (body.languages           !== undefined) { sets.push(`languages = $${i++}`);              vals.push(body.languages); }
    if (body.unavailable_until   !== undefined) { sets.push(`unavailable_until = $${i++}`);      vals.push(body.unavailable_until ? new Date(body.unavailable_until) : null); }

    if (!sets.length) return reply.status(400).send({ error: 'Nothing to update' });
    sets.push(`updated_at = now()`);
    vals.push(id);

    const res = await pool.query(
      `UPDATE freelancer_profiles SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      vals,
    );
    if (!res.rows.length) return reply.status(404).send({ error: 'Not found' });
    const tenantId = (request as any).user?.tenant_id;
    const snapshot = await loadFreelancerIdentitySnapshot(res.rows[0].id);
    if (snapshot) {
      res.rows[0].person_id = await syncFreelancerPerson({
        freelancerId: snapshot.id,
        tenantId,
        displayName: snapshot.display_name,
        userId: snapshot.user_id,
        email: snapshot.email,
        emailPersonal: snapshot.email_personal,
        phone: snapshot.phone,
        whatsappJid: snapshot.whatsapp_jid,
        existingPersonId: snapshot.person_id ?? null,
      });
    }
    return reply.send(res.rows[0]);
  });

  // ── Timer ───────────────────────────────────────────────────────────────

  app.post('/freelancers/timer/start', { preHandler: [requirePerm('clients:write')] }, async (request: any, reply) => {
    const { freelancer_id, briefing_id } = z.object({
      freelancer_id: z.string().uuid(),
      briefing_id: z.string().uuid(),
    }).parse(request.body);

    // Check if already running
    const existing = await pool.query(
      `SELECT * FROM active_timers WHERE freelancer_id = $1 AND briefing_id = $2`,
      [freelancer_id, briefing_id],
    );
    if (existing.rows.length) return reply.send({ timer: existing.rows[0], already_running: true });

    const res = await pool.query(
      `INSERT INTO active_timers (freelancer_id, briefing_id) VALUES ($1,$2)
       ON CONFLICT (freelancer_id, briefing_id) DO NOTHING
       RETURNING *`,
      [freelancer_id, briefing_id],
    );
    const timer = res.rows[0] ?? existing.rows[0];
    return reply.status(201).send({ timer });
  });

  app.post('/freelancers/timer/stop', { preHandler: [requirePerm('clients:write')] }, async (request: any, reply) => {
    const { freelancer_id, briefing_id, description } = z.object({
      freelancer_id: z.string().uuid(),
      briefing_id: z.string().uuid(),
      description: z.string().optional().nullable(),
    }).parse(request.body);

    const timerRes = await pool.query(
      `DELETE FROM active_timers WHERE freelancer_id = $1 AND briefing_id = $2 RETURNING *`,
      [freelancer_id, briefing_id],
    );
    if (!timerRes.rows.length) return reply.status(404).send({ error: 'No active timer found' });

    const timer = timerRes.rows[0];
    const startedAt = new Date(timer.started_at);
    const endedAt = new Date();
    const minutes = minutesBetween(startedAt, endedAt);

    if (minutes < 1) {
      return reply.status(400).send({ error: 'Timer ran for less than 1 minute — not recorded' });
    }

    const entryRes = await pool.query(
      `INSERT INTO time_entries (freelancer_id, briefing_id, started_at, ended_at, minutes, description)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [freelancer_id, briefing_id, startedAt, endedAt, minutes, description ?? null],
    );
    return reply.send({ entry: entryRes.rows[0] });
  });

  app.get('/freelancers/:id/timer/active', { preHandler: [requirePerm('clients:read')] }, async (request: any, reply) => {
    const { id } = request.params;
    const res = await pool.query(
      `SELECT at.*, b.title as briefing_title
       FROM active_timers at
       JOIN edro_briefings b ON b.id = at.briefing_id
       WHERE at.freelancer_id = $1`,
      [id],
    );
    return reply.send({ timers: res.rows });
  });

  // ── Time entries ────────────────────────────────────────────────────────

  app.get('/freelancers/:id/time-entries', { preHandler: [requirePerm('clients:read')] }, async (request: any, reply) => {
    const { id } = request.params;
    const { month } = (request.query as any);

    let q = `SELECT te.*, b.title as briefing_title
             FROM time_entries te
             JOIN edro_briefings b ON b.id = te.briefing_id
             WHERE te.freelancer_id = $1`;
    const vals: any[] = [id];

    if (month) {
      // month = 'YYYY-MM'
      q += ` AND to_char(te.started_at, 'YYYY-MM') = $2`;
      vals.push(month);
    }

    q += ' ORDER BY te.started_at DESC';
    const res = await pool.query(q, vals);
    return reply.send({ entries: res.rows });
  });

  app.post('/freelancers/:id/time-entries', { preHandler: [requirePerm('clients:write')] }, async (request: any, reply) => {
    const { id } = request.params;
    const body = z.object({
      briefing_id: z.string().uuid(),
      started_at: z.string(),
      ended_at: z.string(),
      description: z.string().optional().nullable(),
    }).parse(request.body);

    const startedAt = new Date(body.started_at);
    const endedAt = new Date(body.ended_at);
    if (endedAt <= startedAt) return reply.status(400).send({ error: 'ended_at must be after started_at' });
    const minutes = minutesBetween(startedAt, endedAt);

    const res = await pool.query(
      `INSERT INTO time_entries (freelancer_id, briefing_id, started_at, ended_at, minutes, description)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, body.briefing_id, startedAt, endedAt, minutes, body.description ?? null],
    );
    return reply.status(201).send({ entry: res.rows[0] });
  });

  // ── Payables ────────────────────────────────────────────────────────────

  app.get('/freelancers/payables', { preHandler: [requirePerm('clients:read')] }, async (request: any, reply) => {
    const { month } = (request.query as any);
    const tenantId = (request as any).user?.tenant_id;

    const qs = month
      ? `AND fp2.period_month = $2`
      : '';
    const vals: any[] = [tenantId];
    if (month) vals.push(month);

    const res = await pool.query(
      `SELECT fp2.*, fpr.display_name, fpr.pix_key, fpr.hourly_rate_brl, eu.email
       FROM freelancer_payables fp2
       JOIN freelancer_profiles fpr ON fpr.id = fp2.freelancer_id
       JOIN edro_users eu ON eu.id = fpr.user_id
       JOIN tenant_users tu ON tu.user_id = eu.id AND tu.tenant_id = $1
       WHERE 1=1 ${qs}
       ORDER BY fpr.display_name`,
      vals,
    );
    return reply.send({ payables: res.rows });
  });

  app.post('/freelancers/payables/close-month', { preHandler: [requirePerm('clients:write')] }, async (request: any, reply) => {
    const { month } = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }).parse(request.body);
    const tenantId = (request as any).user?.tenant_id;

    // Get all active freelancers for this tenant with hourly rates
    const freelancers = await pool.query(
      `SELECT fp.id, fp.hourly_rate_brl, fp.display_name
       FROM freelancer_profiles fp
       JOIN edro_users eu ON eu.id = fp.user_id
       JOIN tenant_users tu ON tu.user_id = eu.id AND tu.tenant_id = $1
       WHERE fp.is_active = true AND fp.hourly_rate_brl IS NOT NULL`,
      [tenantId],
    );

    const results = [];
    for (const fl of freelancers.rows) {
      // Sum time entries for this month
      const sumRes = await pool.query(
        `SELECT COALESCE(SUM(minutes), 0)::int AS total_minutes
         FROM time_entries
         WHERE freelancer_id = $1 AND to_char(started_at, 'YYYY-MM') = $2`,
        [fl.id, month],
      );
      const totalMinutes: number = sumRes.rows[0].total_minutes;
      if (totalMinutes === 0) continue;

      const amountBrl = Math.round((totalMinutes / 60) * parseFloat(fl.hourly_rate_brl) * 100) / 100;

      // Upsert payable
      const payableRes = await pool.query(
        `INSERT INTO freelancer_payables (freelancer_id, period_month, total_minutes, amount_brl)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (freelancer_id, period_month) DO UPDATE SET
           total_minutes = EXCLUDED.total_minutes,
           amount_brl = EXCLUDED.amount_brl
         RETURNING *`,
        [fl.id, month, totalMinutes, amountBrl],
      );
      results.push({ ...payableRes.rows[0], display_name: fl.display_name });
    }

    return reply.send({ closed: results, count: results.length });
  });

  app.patch('/freelancers/payables/:id/mark-paid', { preHandler: [requirePerm('clients:write')] }, async (request: any, reply) => {
    const { id } = request.params;
    const { paid_at } = z.object({ paid_at: z.string().optional() }).parse(request.body ?? {});

    const res = await pool.query(
      `UPDATE freelancer_payables SET status = 'paid', paid_at = $1 WHERE id = $2 RETURNING *`,
      [paid_at ? new Date(paid_at) : new Date(), id],
    );
    if (!res.rows.length) return reply.status(404).send({ error: 'Not found' });
    return reply.send(res.rows[0]);
  });

  app.get('/freelancers/payables/:id/pdf', { preHandler: [requirePerm('clients:read')] }, async (request: any, reply) => {
    const { id } = request.params;

    const res = await pool.query(
      `SELECT fp2.*, fpr.display_name, fpr.pix_key
       FROM freelancer_payables fp2
       JOIN freelancer_profiles fpr ON fpr.id = fp2.freelancer_id
       WHERE fp2.id = $1`,
      [id],
    );
    if (!res.rows.length) return reply.status(404).send({ error: 'Not found' });

    const row = res.rows[0];
    const pdfBuffer = await generateReceiptPdf({
      displayName: row.display_name,
      pixKey: row.pix_key,
      periodMonth: row.period_month,
      totalMinutes: row.total_minutes,
      flatFeeBrl: row.flat_fee_brl ? parseFloat(row.flat_fee_brl) : null,
      amountBrl: parseFloat(row.amount_brl),
      status: row.status,
      paidAt: row.paid_at ? new Date(row.paid_at) : null,
    });

    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="recibo-${row.period_month}-${row.display_name.replace(/\s/g, '_')}.pdf"`);
    return reply.send(pdfBuffer);
  });

  // ── Portal routes (for freelancer self-service) ─────────────────────────
  // These are accessed by staff role users with their own JWT.

  app.get('/freelancers/portal/me', async (request: any, reply) => {
    const userId = (request.user as any)?.sub;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const res = await pool.query(
      `SELECT fp.*, eu.email,
              (SELECT json_agg(at2) FROM active_timers at2 WHERE at2.freelancer_id = fp.id) as active_timers
       FROM freelancer_profiles fp
       JOIN edro_users eu ON eu.id = fp.user_id
       WHERE fp.user_id = $1`,
      [userId],
    );
    if (!res.rows.length) return reply.status(404).send({ error: 'Freelancer profile not found' });
    return reply.send(res.rows[0]);
  });

  app.patch('/freelancers/portal/me', async (request: any, reply) => {
    const userId = (request.user as any)?.sub;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const fpRes = await pool.query(`SELECT id FROM freelancer_profiles WHERE user_id = $1`, [userId]);
    if (!fpRes.rows.length) return reply.status(404).send({ error: 'Profile not found' });
    const freelancerId = fpRes.rows[0].id;

    const body = request.body as Record<string, any>;
    const scalarAllowed = ['phone', 'whatsapp_jid', 'department', 'role_title', 'email_personal', 'notes',
      'available_hours_start', 'available_hours_end', 'weekly_capacity_hours', 'unavailable_until'];
    const arrayAllowed = ['available_days'];
    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;
    for (const key of scalarAllowed) {
      if (body[key] !== undefined) {
        sets.push(`${key} = $${idx++}`);
        vals.push(body[key] || null);
      }
    }
    for (const key of arrayAllowed) {
      if (body[key] !== undefined) {
        sets.push(`${key} = $${idx++}::text[]`);
        vals.push(Array.isArray(body[key]) ? body[key] : null);
      }
    }
    if (!sets.length) return reply.status(400).send({ error: 'No fields to update' });

    sets.push(`updated_at = now()`);
    vals.push(freelancerId);

    const res = await pool.query(
      `UPDATE freelancer_profiles SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      vals,
    );
    const tenantId = request.user?.tenant_id;
    const snapshot = res.rows[0]?.id ? await loadFreelancerIdentitySnapshot(res.rows[0].id) : null;
    if (snapshot) {
      res.rows[0].person_id = await syncFreelancerPerson({
        freelancerId: snapshot.id,
        tenantId,
        displayName: snapshot.display_name,
        userId: snapshot.user_id,
        email: snapshot.email,
        emailPersonal: snapshot.email_personal,
        phone: snapshot.phone,
        whatsappJid: snapshot.whatsapp_jid,
        existingPersonId: snapshot.person_id ?? null,
      });
    }
    return reply.send(res.rows[0]);
  });

  app.get('/freelancers/portal/me/entries', async (request: any, reply) => {
    const userId = (request.user as any)?.sub;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });
    const { month } = (request.query as any);

    const fpRes = await pool.query(`SELECT id FROM freelancer_profiles WHERE user_id = $1`, [userId]);
    if (!fpRes.rows.length) return reply.status(404).send({ error: 'Profile not found' });
    const freelancerId = fpRes.rows[0].id;

    let q = `SELECT te.*, b.title as briefing_title FROM time_entries te
             JOIN edro_briefings b ON b.id = te.briefing_id
             WHERE te.freelancer_id = $1`;
    const vals: any[] = [freelancerId];
    if (month) { q += ` AND to_char(te.started_at, 'YYYY-MM') = $2`; vals.push(month); }
    q += ' ORDER BY te.started_at DESC';

    const res = await pool.query(q, vals);
    return reply.send({ entries: res.rows });
  });

  app.get('/freelancers/portal/me/jobs', async (request: any, reply) => {
    const userId = (request.user as any)?.sub;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const fpRes = await pool.query(`SELECT id FROM freelancer_profiles WHERE user_id = $1`, [userId]);
    if (!fpRes.rows.length) return reply.status(404).send({ error: 'Profile not found' });

    // Briefings + ops jobs + Trello cards assigned by email
    const res = await pool.query(
      `SELECT b.id, b.title, b.status, b.due_at,
              ec.name as client_name, 'briefing' as source,
              NULL::text as board_name, NULL::text as list_name, false as due_complete,
              NULL::numeric as fee_brl, NULL::text as job_size,
              false as pending_acceptance,
              NULL::text as delivered_link, NULL::text as adjustment_feedback,
              NULL::timestamptz as approved_at, NULL::timestamptz as delivered_at
       FROM edro_briefings b
       LEFT JOIN edro_clients ec ON ec.id = b.client_id
       WHERE b.assignees @> jsonb_build_array(jsonb_build_object('user_id', $1::text))
          OR b.traffic_owner = (SELECT eu.name FROM edro_users eu WHERE eu.id = $1::uuid LIMIT 1)
       UNION ALL
       SELECT j.id, j.title, j.status, j.deadline_at as due_at,
              c.name as client_name, 'ops_job' as source,
              NULL::text as board_name, NULL::text as list_name, false as due_complete,
              j.fee_brl, j.job_size,
              false as pending_acceptance,
              j.delivered_link, j.adjustment_feedback,
              j.approved_at, j.delivered_at
       FROM jobs j
       LEFT JOIN clients c ON c.id = j.client_id
       WHERE j.owner_id = $1::uuid
         AND j.status NOT IN ('published', 'done', 'archived')
       UNION ALL
       SELECT pc.id, pc.title,
              pl.name as status,
              pc.due_date::timestamptz as due_at,
              COALESCE(cl.name, pb.name) as client_name,
              'trello_card' as source,
              pb.name as board_name,
              pl.name as list_name,
              pc.due_complete,
              NULL::numeric as fee_brl,
              NULL::text as job_size,
              false as pending_acceptance,
              NULL::text as delivered_link, NULL::text as adjustment_feedback,
              NULL::timestamptz as approved_at, NULL::timestamptz as delivered_at
       FROM project_cards pc
       JOIN project_card_members pcm ON pcm.card_id = pc.id
       JOIN edro_users eu ON LOWER(eu.email) = LOWER(pcm.email)
       JOIN project_lists pl ON pl.id = pc.list_id
       JOIN project_boards pb ON pb.id = pc.board_id
       LEFT JOIN clients cl ON cl.id::text = pb.client_id
       WHERE eu.id = $1::uuid
         AND pc.is_archived = false
       ORDER BY due_at ASC NULLS LAST
       LIMIT 100`,
      [userId],
    );
    return reply.send({ jobs: res.rows });
  });

  // POST /freelancers/portal/me/jobs/:jobId/respond — aceitar ou recusar job
  app.post('/freelancers/portal/me/jobs/:jobId/respond', async (request: any, reply) => {
    const userId = (request.user as any)?.sub;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const { jobId } = request.params as { jobId: string };
    const { action, reason, source } = (request.body as any) ?? {};

    if (!action || !['accept', 'reject'].includes(action)) {
      return reply.status(400).send({ error: 'action must be "accept" or "reject"' });
    }

    // Briefing job
    if (!source || source === 'briefing') {
      const { rows: briefRows } = await pool.query(
        `SELECT id, title, status, assignees, traffic_owner FROM edro_briefings WHERE id = $1`,
        [jobId]
      );
      if (!briefRows[0]) return reply.status(404).send({ error: 'Job não encontrado.' });
      const b = briefRows[0];

      // Atualiza assignees: adiciona accepted / reason no entry do freelancer
      const assignees: any[] = Array.isArray(b.assignees) ? b.assignees : [];
      const updatedAssignees = assignees.map((a: any) => {
        if (a.user_id === userId) {
          return {
            ...a,
            accepted: action === 'accept',
            accepted_at: new Date().toISOString(),
            rejection_reason: action === 'reject' ? (reason ?? null) : null,
          };
        }
        return a;
      });

      // Se aceito e briefing em copy_ia → move para alinhamento
      const newStatus =
        action === 'accept' && ['copy_ia', 'briefing'].includes(b.status)
          ? 'alinhamento'
          : b.status;

      await pool.query(
        `UPDATE edro_briefings SET assignees = $1::jsonb, status = $2 WHERE id = $3`,
        [JSON.stringify(updatedAssignees), newStatus, jobId]
      );

      // Auto-schedule Google Calendar alignment meeting when freelancer accepts
      if (action === 'accept' && newStatus === 'alinhamento') {
        setImmediate(async () => {
          try {
            const { rows: briefFull } = await pool.query(
              `SELECT b.title, b.payload, b.traffic_owner, b.due_at,
                      (SELECT tenant_id FROM tenants LIMIT 1) AS tenant_id,
                      ec.name AS client_name
                 FROM edro_briefings b
                 LEFT JOIN edro_clients ec ON ec.id = b.client_id
                WHERE b.id = $1`,
              [jobId]
            );
            const bf = briefFull[0];
            if (!bf?.tenant_id) return;

            // Schedule tomorrow at 10:00 local (or +2 business days if deadline is tight)
            const now = new Date();
            const meetStart = new Date(now);
            meetStart.setDate(meetStart.getDate() + 1);
            meetStart.setHours(10, 0, 0, 0);

            // Collect attendee emails: traffic_owner + manager_email from payload
            const attendees: string[] = [];
            if (bf.traffic_owner && bf.traffic_owner.includes('@')) attendees.push(bf.traffic_owner);
            const managerEmail = bf.payload?.manager_email;
            if (managerEmail && managerEmail.includes('@') && !attendees.includes(managerEmail)) {
              attendees.push(managerEmail);
            }

            const { createCalendarMeeting } = await import('../services/integrations/googleCalendarService');
            const meeting = await createCalendarMeeting({
              tenantId: bf.tenant_id,
              title: `Alinhamento — ${bf.title}${bf.client_name ? ` (${bf.client_name})` : ''}`,
              startAt: meetStart,
              durationMinutes: 30,
              attendeeEmails: attendees,
              description: `Reunião de alinhamento para o job: ${bf.title}\n\nLink do briefing: ${process.env.WEB_URL ?? ''}/edro/${jobId}`,
              clientName: bf.client_name ?? null,
            });

            // Save meeting URL back to briefing
            await pool.query(
              `UPDATE edro_briefings
                  SET meeting_url = $2,
                      payload = jsonb_set(COALESCE(payload,'{}'), '{alignment_meeting_url}', to_jsonb($2::text))
                WHERE id = $1`,
              [jobId, meeting.meetUrl]
            );
          } catch (err) {
            console.warn('[freelancers/respond] Google Calendar auto-schedule failed:', err);
          }
        });
      }

      return reply.send({ ok: true, action, new_status: newStatus });
    }

    // Trello card (project_card)
    if (source === 'trello_card') {
      // Para Trello cards, usamos os membros — apenas sinalizamos com um comentário
      const { rows: cardRows } = await pool.query(
        `SELECT pc.id, pc.title, pc.trello_card_id, pb.tenant_id
           FROM project_cards pc
           JOIN project_boards pb ON pb.id = pc.board_id
          WHERE pc.id = $1`,
        [jobId]
      );
      if (!cardRows[0]) return reply.status(404).send({ error: 'Card não encontrado.' });

      if (action === 'reject' && reason && cardRows[0].trello_card_id) {
        // Tenta adicionar comentário no Trello com o motivo da recusa
        try {
          const { getTrelloCredentials } = await import('../services/trelloSyncService');
          const creds = await getTrelloCredentials(cardRows[0].tenant_id);
          if (creds) {
            const params = new URLSearchParams({ key: creds.apiKey, token: creds.apiToken, text: `❌ Job recusado. Motivo: ${reason}` });
            await fetch(`https://api.trello.com/1/cards/${cardRows[0].trello_card_id}/actions/comments?${params}`, {
              method: 'POST', signal: AbortSignal.timeout(8_000),
            });
          }
        } catch { /* best-effort */ }
      }

      return reply.send({ ok: true, action });
    }

    return reply.status(400).send({ error: 'source inválido' });
  });

  // POST /freelancers/portal/me/jobs/:jobId/complete — freelancer marks job as done → aprovacao_interna
  app.post('/freelancers/portal/me/jobs/:jobId/complete', async (request: any, reply) => {
    const userId = (request.user as any)?.sub;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const { jobId } = request.params as { jobId: string };
    const { notes, source } = (request.body as any) ?? {};

    if (!source || source === 'briefing') {
      const { rows: briefRows } = await pool.query(
        `SELECT b.id, b.title, b.status, b.assignees, b.traffic_owner, b.payload,
                (SELECT tenant_id FROM tenants LIMIT 1) AS tenant_id,
                ec.name AS client_name
           FROM edro_briefings b
           LEFT JOIN edro_clients ec ON ec.id = b.client_id
          WHERE b.id = $1`,
        [jobId]
      );
      if (!briefRows[0]) return reply.status(404).send({ error: 'Job não encontrado.' });

      const b = briefRows[0];

      // Only the assigned freelancer (or any assigned person) can mark complete
      const assignees: any[] = Array.isArray(b.assignees) ? b.assignees : [];
      const isAssigned = assignees.some((a: any) => a.user_id === userId && a.accepted !== false);
      if (!isAssigned) {
        return reply.status(403).send({ error: 'Você não está assignado a este job.' });
      }

      // Must be in producao or ajustes to mark complete
      if (!['producao', 'ajustes'].includes(b.status)) {
        return reply.status(409).send({
          error: `Job em "${b.status}" não pode ser marcado como concluído. Precisa estar em Produção ou Ajustes.`,
          current_status: b.status,
        });
      }

      // Update status → aprovacao_interna, save completion notes
      await pool.query(
        `UPDATE edro_briefings
            SET status = 'aprovacao_interna',
                payload = jsonb_set(
                  COALESCE(payload,'{}'),
                  '{freelancer_completion_notes}',
                  to_jsonb($2::text)
                ),
                updated_at = now()
          WHERE id = $1`,
        [jobId, notes ?? '']
      );

      // Notify managers via email
      setImmediate(async () => {
        try {
          const notifyEmails: string[] = [];
          if (b.traffic_owner && b.traffic_owner.includes('@')) notifyEmails.push(b.traffic_owner);
          const managerEmail = b.payload?.manager_email;
          if (managerEmail && !notifyEmails.includes(managerEmail)) notifyEmails.push(managerEmail);

          if (notifyEmails.length === 0) return;

          const { sendEmail } = await import('../services/emailService');
          const { rows: flRows } = await pool.query(
            `SELECT name, email FROM users WHERE id = $1 LIMIT 1`,
            [userId]
          );
          const flName = flRows[0]?.name ?? flRows[0]?.email ?? 'Freelancer';
          const webUrl = process.env.WEB_URL ?? '';
          const briefingUrl = `${webUrl}/edro/${jobId}`;
          const clientLabel = b.client_name ? ` — ${b.client_name}` : '';

          const subject = `[Edro] Job pronto para aprovação: "${b.title}"${clientLabel}`;
          const text = `${flName} marcou o job "${b.title}" como concluído.\n\nPróxima etapa: Aprovação Interna.\n\nAcessar: ${briefingUrl}${notes ? `\n\nNotas: ${notes}` : ''}`;

          for (const to of notifyEmails) {
            await sendEmail({ to, subject, text }).catch(() => {});
          }
        } catch (err) {
          console.warn('[freelancers/complete] Email notification failed:', err);
        }
      });

      return reply.send({ ok: true, new_status: 'aprovacao_interna' });
    }

    return reply.status(400).send({ error: 'source inválido' });
  });

  app.get('/freelancers/portal/me/jobs/:jobId', async (request: any, reply) => {
    const userId = (request.user as any)?.sub;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const { jobId } = request.params as { jobId: string };
    const { source } = request.query as { source?: string };

    // ── Trello card ──────────────────────────────────────────────────────────
    if (!source || source === 'trello_card') {
      const res = await pool.query(
        `SELECT pc.id, pc.title, pc.description, pc.due_date, pc.due_complete,
                pc.labels, pc.cover_color, pc.trello_url,
                pl.name as list_name,
                pb.id as board_id, pb.name as board_name,
                COALESCE(cl.name, pb.name) as client_name,
                'trello_card' as source
         FROM project_cards pc
         JOIN project_card_members pcm ON pcm.card_id = pc.id
         JOIN edro_users eu ON LOWER(eu.email) = LOWER(pcm.email)
         JOIN project_lists pl ON pl.id = pc.list_id
         JOIN project_boards pb ON pb.id = pc.board_id
         LEFT JOIN clients cl ON cl.id::text = pb.client_id
         WHERE pc.id = $1 AND eu.id = $2::uuid AND pc.is_archived = false`,
        [jobId, userId],
      );
      if (res.rows.length) {
        const card = res.rows[0];
        // Load checklists
        const clRes = await pool.query(
          `SELECT id, name, items FROM project_card_checklists WHERE card_id = $1 ORDER BY created_at`,
          [jobId],
        );
        // Load comments (last 20)
        const cmRes = await pool.query(
          `SELECT body, author_name, author_avatar, commented_at
           FROM project_card_comments WHERE card_id = $1 ORDER BY commented_at DESC LIMIT 20`,
          [jobId],
        );
        // Load all lists on this board for "move to" actions
        const listsRes = await pool.query(
          `SELECT id, name FROM project_lists WHERE board_id = $2 AND is_archived = false ORDER BY position`,
          [jobId, card.board_id],
        );
        return reply.send({
          job: {
            ...card,
            checklists: clRes.rows,
            comments: cmRes.rows,
            board_lists: listsRes.rows,
          },
        });
      }
    }

    // ── Ops job ──────────────────────────────────────────────────────────────
    if (!source || source === 'ops_job') {
      const res = await pool.query(
        `SELECT j.*, c.name as client_name, jt.name as job_type_name
         FROM jobs j
         LEFT JOIN clients c ON c.id = j.client_id
         LEFT JOIN job_types jt ON jt.id = j.job_type_id
         WHERE j.id = $1 AND j.owner_id = $2::uuid`,
        [jobId, userId],
      );
      if (res.rows.length) {
        return reply.send({ job: { ...res.rows[0], source: 'ops_job' } });
      }
    }

    // ── Briefing ─────────────────────────────────────────────────────────────
    if (!source || source === 'briefing') {
      const res = await pool.query(
        `SELECT b.id, b.title, b.status, b.due_at, b.payload, b.created_at,
                b.copy_approved_at, b.copy_approval_comment,
                c.name as client_name
         FROM edro_briefings b
         LEFT JOIN clients c ON c.id = b.client_id
         WHERE b.id = $1
           AND (
             b.assignees @> jsonb_build_array(jsonb_build_object('user_id', $2::text))
             OR b.traffic_owner = (SELECT eu.name FROM edro_users eu WHERE eu.id = $2::uuid LIMIT 1)
           )`,
        [jobId, userId],
      );
      if (res.rows.length) {
        return reply.send({ job: { ...res.rows[0], source: 'briefing' } });
      }
    }

    return reply.status(404).send({ error: 'Job não encontrado ou não atribuído a você.' });
  });

  // ── Trello card actions (bidirectional sync) ──────────────────────────────

  app.patch('/freelancers/portal/me/trello-cards/:cardId', async (request: any, reply) => {
    const userId = (request.user as any)?.sub;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const { cardId } = request.params as { cardId: string };
    const body = request.body as {
      due_complete?: boolean;
      move_to_list_id?: string;  // Edro list UUID
      comment?: string;
    };

    // Verify this user is actually a member of the card
    const authRes = await pool.query(
      `SELECT pc.id, pc.trello_card_id, pc.board_id, pc.list_id,
              pb.tenant_id
       FROM project_cards pc
       JOIN project_card_members pcm ON pcm.card_id = pc.id
       JOIN edro_users eu ON LOWER(eu.email) = LOWER(pcm.email)
       JOIN project_boards pb ON pb.id = pc.board_id
       WHERE pc.id = $1 AND eu.id = $2::uuid AND pc.is_archived = false`,
      [cardId, userId],
    );
    if (!authRes.rows.length) return reply.status(403).send({ error: 'Sem acesso a este card.' });

    const card = authRes.rows[0];
    const tenantId: string = card.tenant_id;

    // ── Apply local DB update ─────────────────────────────────────────────
    const updates: string[] = [];
    const vals: any[] = [];

    if (typeof body.due_complete === 'boolean') {
      vals.push(body.due_complete);
      updates.push(`due_complete = $${vals.length}`);
    }
    if (body.move_to_list_id) {
      // Verify new list belongs to same board
      const lRes = await pool.query(
        `SELECT id, position FROM project_lists WHERE id = $1 AND board_id = $2`,
        [body.move_to_list_id, card.board_id],
      );
      if (lRes.rows.length) {
        vals.push(body.move_to_list_id);
        updates.push(`list_id = $${vals.length}`);
      }
    }

    if (updates.length) {
      vals.push(cardId);
      await pool.query(
        `UPDATE project_cards SET ${updates.join(', ')}, updated_at = now() WHERE id = $${vals.length}`,
        vals,
      );
    }

    // ── Add comment to DB ─────────────────────────────────────────────────
    if (body.comment?.trim()) {
      const userRes = await pool.query(`SELECT name FROM edro_users WHERE id = $1::uuid`, [userId]);
      const authorName = userRes.rows[0]?.name ?? 'Freelancer';
      await pool.query(
        `INSERT INTO project_card_comments (card_id, tenant_id, body, author_name, commented_at)
         VALUES ($1, $2, $3, $4, now())`,
        [cardId, tenantId, body.comment.trim(), authorName],
      );
    }

    // ── Sync back to Trello ───────────────────────────────────────────────
    if (card.trello_card_id) {
      try {
        const { getTrelloCredentials } = await import('../services/trelloSyncService');
        const creds = await getTrelloCredentials(tenantId);
        if (creds) {
          const trelloBase = 'https://api.trello.com/1';
          const auth = `key=${creds.apiKey}&token=${creds.apiToken}`;

          if (typeof body.due_complete === 'boolean') {
            await fetch(
              `${trelloBase}/cards/${card.trello_card_id}?${auth}&dueComplete=${body.due_complete}`,
              { method: 'PUT', signal: AbortSignal.timeout(8000) },
            );
          }
          if (body.move_to_list_id) {
            const newList = await pool.query(
              `SELECT trello_list_id FROM project_lists WHERE id = $1`,
              [body.move_to_list_id],
            );
            if (newList.rows[0]?.trello_list_id) {
              await fetch(
                `${trelloBase}/cards/${card.trello_card_id}?${auth}&idList=${newList.rows[0].trello_list_id}`,
                { method: 'PUT', signal: AbortSignal.timeout(8000) },
              );
            }
          }
          if (body.comment?.trim()) {
            await fetch(
              `${trelloBase}/cards/${card.trello_card_id}/actions/comments?${auth}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: body.comment.trim() }),
                signal: AbortSignal.timeout(8000),
              },
            );
          }
        }
      } catch (err: any) {
        console.warn('[trello sync] freelancer update sync failed:', err?.message);
        // Non-fatal — local DB is already updated
      }
    }

    return reply.send({ ok: true });
  });

  // Toggle a single checklist item (marks it complete/incomplete in DB + Trello)
  app.patch('/freelancers/portal/me/trello-cards/:cardId/checklist-items/:itemId', async (request: any, reply) => {
    const userId = (request.user as any)?.sub;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const { cardId, itemId } = request.params as { cardId: string; itemId: string };
    const { checked } = request.body as { checked: boolean };

    // Verify access
    const authRes = await pool.query(
      `SELECT pc.trello_card_id, pb.tenant_id
       FROM project_cards pc
       JOIN project_card_members pcm ON pcm.card_id = pc.id
       JOIN edro_users eu ON LOWER(eu.email) = LOWER(pcm.email)
       JOIN project_boards pb ON pb.id = pc.board_id
       WHERE pc.id = $1 AND eu.id = $2::uuid`,
      [cardId, userId],
    );
    if (!authRes.rows.length) return reply.status(403).send({ error: 'Sem acesso.' });

    // Find which checklist contains this item and update the JSON array
    const clRes = await pool.query(
      `SELECT id, items FROM project_card_checklists WHERE card_id = $1`,
      [cardId],
    );
    let trelloItemId: string | null = null;
    let trelloChecklistId: string | null = null;

    for (const cl of clRes.rows) {
      const items: any[] = cl.items ?? [];
      const idx = items.findIndex((it: any) => it.id === itemId || it.trello_id === itemId);
      if (idx >= 0) {
        items[idx].checked = checked;
        trelloItemId = items[idx].trello_id ?? null;
        trelloChecklistId = cl.trello_checklist_id ?? null;
        await pool.query(
          `UPDATE project_card_checklists SET items = $1, updated_at = now() WHERE id = $2`,
          [JSON.stringify(items), cl.id],
        );
        break;
      }
    }

    // Sync to Trello if we have the IDs
    if (trelloItemId && authRes.rows[0].trello_card_id) {
      try {
        const { getTrelloCredentials } = await import('../services/trelloSyncService');
        const creds = await getTrelloCredentials(authRes.rows[0].tenant_id);
        if (creds) {
          const auth = `key=${creds.apiKey}&token=${creds.apiToken}`;
          await fetch(
            `https://api.trello.com/1/cards/${authRes.rows[0].trello_card_id}/checkItem/${trelloItemId}?${auth}&state=${checked ? 'complete' : 'incomplete'}`,
            { method: 'PUT', signal: AbortSignal.timeout(8000) },
          );
        }
      } catch (err: any) {
        console.warn('[trello sync] checklist item sync failed:', err?.message);
      }
    }

    return reply.send({ ok: true });
  });

  app.get('/freelancers/portal/me/payables', async (request: any, reply) => {
    const userId = (request.user as any)?.sub;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const fpRes = await pool.query(`SELECT id FROM freelancer_profiles WHERE user_id = $1`, [userId]);
    if (!fpRes.rows.length) return reply.status(404).send({ error: 'Profile not found' });
    const freelancerId = fpRes.rows[0].id;

    const res = await pool.query(
      `SELECT * FROM freelancer_payables WHERE freelancer_id = $1 ORDER BY period_month DESC`,
      [freelancerId],
    );
    return reply.send({ payables: res.rows });
  });

  // ── Creative Studio — copy versions for a briefing job ────────────────────

  // Helper: check briefing is assigned to this user
  async function assertBriefingAccess(briefingId: string, userId: string) {
    const res = await pool.query(
      `SELECT b.id, b.title, b.status, b.payload, b.due_at, c.name as client_name,
              b.copy_approved_at, b.copy_approval_comment
       FROM edro_briefings b
       LEFT JOIN clients c ON c.id = b.client_id
       WHERE b.id = $1
         AND (
           b.assignees @> jsonb_build_array(jsonb_build_object('user_id', $2::text))
           OR b.traffic_owner = (SELECT eu.name FROM edro_users eu WHERE eu.id = $2 LIMIT 1)
         )`,
      [briefingId, userId],
    );
    return res.rows[0] ?? null;
  }

  // GET /freelancers/portal/me/studio — list briefings in copy-production status
  app.get('/freelancers/portal/me/studio', async (request: any, reply) => {
    const userId = (request.user as any)?.sub;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const res = await pool.query(
      `SELECT b.id, b.title, b.status, b.due_at, b.payload,
              ec.name as client_name,
              (SELECT COUNT(*) FROM edro_copy_versions cv WHERE cv.briefing_id = b.id) as copy_count
       FROM edro_briefings b
       LEFT JOIN edro_clients ec ON ec.id = b.client_id
       WHERE (
         b.assignees @> jsonb_build_array(jsonb_build_object('user_id', $1::text))
         OR b.traffic_owner = (SELECT eu.name FROM edro_users eu WHERE eu.id = $1::uuid LIMIT 1)
       )
       AND b.status NOT IN ('done', 'iclips_out', 'published')
       ORDER BY b.due_at ASC NULLS LAST, b.created_at DESC`,
      [userId],
    );
    return reply.send({ briefings: res.rows });
  });

  // GET /freelancers/portal/me/studio/:briefingId — briefing detail + copy versions
  app.get('/freelancers/portal/me/studio/:briefingId', async (request: any, reply) => {
    const userId = (request.user as any)?.sub;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });
    const { briefingId } = request.params as { briefingId: string };

    const briefing = await assertBriefingAccess(briefingId, userId);
    if (!briefing) return reply.status(404).send({ error: 'Briefing não encontrado ou não atribuído.' });

    const versions = await pool.query(
      `SELECT id, output, model, status, created_at, payload
       FROM edro_copy_versions
       WHERE briefing_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [briefingId],
    );

    return reply.send({ briefing, versions: versions.rows });
  });

  // POST /freelancers/portal/me/studio/:briefingId/generate — AI copy generation
  app.post('/freelancers/portal/me/studio/:briefingId/generate', async (request: any, reply) => {
    const userId = (request.user as any)?.sub;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });
    const { briefingId } = request.params as { briefingId: string };
    const { instructions, platform } = z.object({
      instructions: z.string().max(1000).optional(),
      platform: z.string().optional(),
    }).parse(request.body);

    const briefing = await assertBriefingAccess(briefingId, userId);
    if (!briefing) return reply.status(404).send({ error: 'Briefing não encontrado ou não atribuído.' });

    const payload = (briefing.payload ?? {}) as Record<string, any>;
    const payloadLines = Object.entries(payload)
      .filter(([k, v]) => v && !['client_id', 'tenant_id'].includes(k))
      .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${String(v)}`)
      .slice(0, 15)
      .join('\n');

    const prompt = [
      `Briefing: ${briefing.title}`,
      `Cliente: ${briefing.client_name ?? 'não informado'}`,
      platform ? `Plataforma: ${platform}` : null,
      payloadLines ? `\nDetalhes:\n${payloadLines}` : null,
      instructions ? `\nInstruções adicionais: ${instructions}` : null,
    ].filter(Boolean).join('\n');

    try {
      const result = await generateCopy({
        prompt,
        usageContext: { tenant_id: (briefing as any).tenant_id ?? '', feature: 'freelancer-copy-gen', metadata: { briefing_id: briefingId } },
      });

      const output = result.output ?? '';

      // Persist the version
      const inserted = await pool.query(
        `INSERT INTO edro_copy_versions (briefing_id, output, model, status, payload)
         VALUES ($1, $2, $3, 'draft', $4)
         RETURNING id, output, model, status, created_at`,
        [briefingId, output, result.model ?? null,
         JSON.stringify({ generated_by: 'freelancer_portal', platform: platform ?? null })],
      );

      return reply.send({ version: inserted.rows[0] });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || 'Falha na geração de copy.' });
    }
  });

  // PATCH /freelancers/portal/me/studio/:briefingId/copy — save manual copy
  app.patch('/freelancers/portal/me/studio/:briefingId/copy', async (request: any, reply) => {
    const userId = (request.user as any)?.sub;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });
    const { briefingId } = request.params as { briefingId: string };
    const { output, versionId } = z.object({
      output: z.string().min(1),
      versionId: z.string().uuid().optional(),
    }).parse(request.body);

    const briefing = await assertBriefingAccess(briefingId, userId);
    if (!briefing) return reply.status(404).send({ error: 'Briefing não encontrado.' });

    if (versionId) {
      // Update existing version
      const res = await pool.query(
        `UPDATE edro_copy_versions SET output = $1 WHERE id = $2 AND briefing_id = $3 RETURNING id, output, status, created_at`,
        [output, versionId, briefingId],
      );
      return reply.send({ version: res.rows[0] });
    } else {
      // Insert new manual version
      const res = await pool.query(
        `INSERT INTO edro_copy_versions (briefing_id, output, model, status, payload)
         VALUES ($1, $2, 'manual', 'draft', '{"source":"freelancer_manual"}')
         RETURNING id, output, model, status, created_at`,
        [briefingId, output],
      );
      return reply.send({ version: res.rows[0] });
    }
  });

  // POST /freelancers/portal/me/studio/:briefingId/submit — submit copy for review
  app.post('/freelancers/portal/me/studio/:briefingId/submit', async (request: any, reply) => {
    const userId = (request.user as any)?.sub;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });
    const { briefingId } = request.params as { briefingId: string };
    const { versionId, notes } = z.object({
      versionId: z.string().uuid(),
      notes: z.string().max(500).optional(),
    }).parse(request.body);

    const briefing = await assertBriefingAccess(briefingId, userId);
    if (!briefing) return reply.status(404).send({ error: 'Briefing não encontrado.' });

    // Mark version as selected
    await pool.query(
      `UPDATE edro_copy_versions SET status = 'selected' WHERE id = $1 AND briefing_id = $2`,
      [versionId, briefingId],
    );

    // Advance briefing status to review
    const nextStatus = briefing.status === 'copy_ia' ? 'aprovacao'
      : briefing.status === 'producao' ? 'revisao'
      : 'revisao';

    await pool.query(
      `UPDATE edro_briefings SET status = $1, updated_at = NOW() WHERE id = $2`,
      [nextStatus, briefingId],
    );

    // Log notes if provided
    if (notes) {
      await pool.query(
        `INSERT INTO briefing_stage_log (briefing_id, stage, note, author_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [briefingId, nextStatus, notes, userId],
      ).catch(() => {}); // non-fatal
    }

    return reply.send({ ok: true, newStatus: nextStatus });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ── B2B LEGAL COMPLIANCE ROUTES ──────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  // GET /freelancers/portal/cnpj/:cnpj — proxy BrasilAPI for CNPJ auto-fill
  app.get('/freelancers/portal/cnpj/:cnpj', async (request: any, reply) => {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) return reply.status(401).send({ error: 'Unauthorized' });

    const { cnpj } = request.params as { cnpj: string };
    const clean = cnpj.replace(/\D/g, '');
    if (clean.length !== 14) return reply.status(400).send({ error: 'CNPJ inválido' });

    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
      if (!res.ok) return reply.status(404).send({ error: 'CNPJ não encontrado na Receita Federal' });
      const data = await res.json() as any;
      return reply.send({
        cnpj: clean,
        razao_social: data.razao_social ?? null,
        nome_fantasia: data.nome_fantasia ?? null,
        situacao: data.descricao_situacao_cadastral ?? null,
        logradouro: data.logradouro ?? null,
        numero: data.numero ?? null,
        complemento: data.complemento ?? null,
        bairro: data.bairro ?? null,
        municipio: data.municipio ?? null,
        uf: data.uf ?? null,
        cep: data.cep ?? null,
      });
    } catch {
      return reply.status(502).send({ error: 'Erro ao consultar BrasilAPI' });
    }
  });

  // POST /freelancers/portal/me/onboarding — save PJ onboarding data
  app.post('/freelancers/portal/me/onboarding', async (request: any, reply) => {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) return reply.status(401).send({ error: 'Unauthorized' });
    let userId: string;
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      userId = payload.sub ?? payload.id;
    } catch { return reply.status(401).send({ error: 'Token inválido' }); }

    const body = request.body as Record<string, any>;

    // Validate mandatory PJ fields
    if (!body.cnpj || !body.razao_social || !body.representante_nome || !body.pix_key) {
      return reply.status(400).send({ error: 'Campos obrigatórios: cnpj, razao_social, representante_nome, pix_key' });
    }

    // Block CPF as pix_key_type
    if (body.pix_key_type === 'cpf') {
      return reply.status(400).send({ error: 'Chave PIX deve ser do CNPJ, e-mail ou telefone da empresa — não CPF.' });
    }

    await pool.query(
      `UPDATE freelancer_profiles SET
        cnpj = $2, razao_social = $3, nome_fantasia = $4,
        inscricao_municipal = $5,
        address_street = $6, address_number = $7, address_complement = $8,
        address_district = $9, address_city = $10, address_state = $11, address_cep = $12,
        representante_nome = $13, representante_cpf = $14, estado_civil = $15,
        pix_key = $16, pix_key_type = $17,
        portfolio_url = $18, weekly_capacity = $19,
        skills = COALESCE($20::text[], skills),
        phone = COALESCE($21, phone),
        updated_at = now()
       WHERE user_id = $1`,
      [
        userId,
        body.cnpj?.replace(/\D/g, ''),
        body.razao_social,
        body.nome_fantasia ?? null,
        body.inscricao_municipal ?? null,
        body.address_street ?? null,
        body.address_number ?? null,
        body.address_complement ?? null,
        body.address_district ?? null,
        body.address_city ?? null,
        body.address_state ?? null,
        body.address_cep?.replace(/\D/g, '') ?? null,
        body.representante_nome,
        body.representante_cpf?.replace(/\D/g, '') ?? null,
        body.estado_civil ?? null,
        body.pix_key,
        body.pix_key_type ?? 'cnpj',
        body.portfolio_url ?? null,
        body.weekly_capacity ?? 40,
        body.skills?.length ? body.skills : null,
        body.phone ?? null,
      ],
    );

    return reply.send({ ok: true, message: 'Cadastro salvo. Aguardando assinatura do contrato.' });
  });

  // POST /freelancers/portal/me/terms/accept — clickwrap acceptance (logs IP + timestamp)
  app.post('/freelancers/portal/me/terms/accept', async (request: any, reply) => {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) return reply.status(401).send({ error: 'Unauthorized' });
    let userId: string;
    let tenantId: string;
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      userId = payload.sub ?? payload.id;
      tenantId = payload.tenant_id ?? '';
    } catch { return reply.status(401).send({ error: 'Token inválido' }); }

    const body = request.body as { terms_version?: string };
    const version = body.terms_version ?? '1.0';

    // Get client IP (respects X-Forwarded-For from proxies)
    const ip = (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      ?? request.ip
      ?? 'unknown';
    const userAgent = (request.headers['user-agent'] as string) ?? null;

    // Insert acceptance log (immutable audit trail)
    await pool.query(
      `INSERT INTO freelancer_term_acceptances (user_id, tenant_id, terms_version, accepted_at, ip_address, user_agent)
       VALUES ($1, $2, $3, now(), $4, $5)`,
      [userId, tenantId, version, ip, userAgent],
    );

    // Mark profile as onboarding_complete + terms accepted
    await pool.query(
      `UPDATE freelancer_profiles
          SET onboarding_complete = true,
              terms_accepted_at = now(),
              terms_accepted_ip = $2,
              terms_version = $3,
              updated_at = now()
        WHERE user_id = $1`,
      [userId, ip, version],
    );

    return reply.send({ ok: true, accepted_at: new Date().toISOString(), ip, version });
  });

  // GET /freelancers/portal/me/score — Scorecard B2B do Fornecedor
  app.get('/freelancers/portal/me/score', async (request: any, reply) => {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) return reply.status(401).send({ error: 'Unauthorized' });
    let userId: string;
    let tenantId: string;
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      userId = payload.sub ?? payload.id;
      tenantId = payload.tenant_id ?? '';
    } catch { return reply.status(401).send({ error: 'Token inválido' }); }

    // Fetch profile score fields
    const { rows: profileRows } = await pool.query(
      `SELECT sla_score, deliveries_total, deliveries_on_time, deliveries_late, score_updated_at
         FROM freelancer_profiles WHERE user_id = $1`,
      [userId],
    );
    const profile = profileRows[0] ?? { sla_score: 100, deliveries_total: 0, deliveries_on_time: 0, deliveries_late: 0 };

    // Recent SLA violations (last 90 days)
    const { rows: violations } = await pool.query(
      `SELECT job_title, deadline_at, delivered_at, days_late, glosa_brl
         FROM freelancer_sla_violations
        WHERE freelancer_id = $1 AND created_at > now() - interval '90 days'
        ORDER BY created_at DESC LIMIT 10`,
      [userId],
    );

    // Recent completed deliveries from jobs (last 30 days)
    const { rows: recentJobs } = await pool.query(
      `SELECT j.title, j.deadline_at, j.updated_at AS completed_at,
              CASE WHEN j.deadline_at IS NOT NULL AND j.updated_at > j.deadline_at
                   THEN CEIL(EXTRACT(EPOCH FROM (j.updated_at - j.deadline_at)) / 86400)
                   ELSE 0 END AS days_late
         FROM jobs j
        WHERE j.owner_id = $1 AND j.tenant_id = $2
          AND j.status IN ('approved', 'published', 'concluido')
          AND j.updated_at > now() - interval '30 days'
        ORDER BY j.updated_at DESC LIMIT 10`,
      [userId, tenantId],
    );

    const slaScore = parseFloat(profile.sla_score) || 100;
    const scoreLabel = slaScore >= 90 ? 'Excelente' : slaScore >= 75 ? 'Bom' : slaScore >= 60 ? 'Regular' : 'Crítico';
    const scoreColor = slaScore >= 90 ? 'green' : slaScore >= 75 ? 'blue' : slaScore >= 60 ? 'yellow' : 'red';

    return reply.send({
      score: {
        value: slaScore,
        label: scoreLabel,
        color: scoreColor,
        deliveries_total: profile.deliveries_total ?? 0,
        deliveries_on_time: profile.deliveries_on_time ?? 0,
        deliveries_late: profile.deliveries_late ?? 0,
        updated_at: profile.score_updated_at ?? null,
      },
      violations,
      recent_deliveries: recentJobs,
    });
  });

  // GET /freelancers/portal/me/onboarding-status — check if onboarding is complete
  app.get('/freelancers/portal/me/onboarding-status', async (request: any, reply) => {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) return reply.status(401).send({ error: 'Unauthorized' });
    let userId: string;
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      userId = payload.sub ?? payload.id;
    } catch { return reply.status(401).send({ error: 'Token inválido' }); }

    const { rows } = await pool.query(
      `SELECT onboarding_complete, terms_accepted_at, cnpj, razao_social,
              pix_key, skills, sla_score
         FROM freelancer_profiles WHERE user_id = $1`,
      [userId],
    );
    const profile = rows[0];
    if (!profile) return reply.status(404).send({ error: 'Perfil não encontrado' });

    return reply.send({
      onboarding_complete: profile.onboarding_complete ?? false,
      terms_accepted: !!profile.terms_accepted_at,
      has_cnpj: !!profile.cnpj,
      has_pix: !!profile.pix_key,
      has_skills: !!(profile.skills?.length),
      razao_social: profile.razao_social ?? null,
      sla_score: parseFloat(profile.sla_score) || 100,
    });
  });

  // POST /freelancers/payables/:id/nf — supplier uploads NF-e link
  app.post('/freelancers/portal/me/payables/:payableId/nf', async (request: any, reply) => {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) return reply.status(401).send({ error: 'Unauthorized' });
    let userId: string;
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      userId = payload.sub ?? payload.id;
    } catch { return reply.status(401).send({ error: 'Token inválido' }); }

    const { payableId } = request.params as { payableId: string };
    const body = request.body as { nf_url?: string; nf_number?: string };
    if (!body.nf_url) return reply.status(400).send({ error: 'nf_url é obrigatório' });

    // Verify payable belongs to this freelancer
    const profileRes = await pool.query(`SELECT id FROM freelancer_profiles WHERE user_id = $1`, [userId]);
    const profileId = profileRes.rows[0]?.id;
    if (!profileId) return reply.status(403).send({ error: 'Perfil não encontrado' });

    const { rows } = await pool.query(
      `UPDATE freelancer_payables
          SET nf_url = $1, nf_number = $2, nf_uploaded_at = now()
        WHERE id = $3 AND freelancer_id = $4
        RETURNING id, nf_url, nf_number, nf_uploaded_at`,
      [body.nf_url, body.nf_number ?? null, payableId, profileId],
    );
    if (!rows.length) return reply.status(404).send({ error: 'Competência não encontrada' });
    return reply.send({ ok: true, payable: rows[0] });
  });

  // ── T-Shirt Pricing & Pool ────────────────────────────────────────────────

  // GET /freelancers/portal/job-sizes — reference pricing table
  app.get('/freelancers/portal/job-sizes', async (_request: any, reply) => {
    const { rows } = await pool.query(
      `SELECT size, label, description, ref_price_brl
         FROM job_size_prices
        ORDER BY sort_order`,
    );
    return reply.send({ sizes: rows });
  });

  // GET /freelancers/portal/me/pool — open escopos available for self-selection
  app.get('/freelancers/portal/me/pool', async (request: any, reply) => {
    const userId = (request.user as any)?.sub;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const fpRes = await pool.query(
      `SELECT fp.id, fp.skills, fp.tenant_id FROM freelancer_profiles WHERE user_id = $1`,
      [userId],
    );
    if (!fpRes.rows.length) return reply.status(404).send({ error: 'Profile not found' });
    const { tenant_id } = fpRes.rows[0];

    const { rows } = await pool.query(
      `SELECT j.id, j.title, j.status, j.deadline_at AS due_at,
              j.fee_brl, j.job_size, j.summary,
              c.name AS client_name,
              sp.label AS size_label,
              sp.description AS size_description
         FROM jobs j
         LEFT JOIN clients c ON c.id = j.client_id
         LEFT JOIN job_size_prices sp ON sp.size = j.job_size
        WHERE j.tenant_id = $1
          AND j.pool_visible = true
          AND j.owner_id IS NULL
          AND j.status IN ('ready', 'intake', 'planned')
        ORDER BY j.priority_score DESC, j.deadline_at ASC NULLS LAST
        LIMIT 30`,
      [tenant_id],
    );
    return reply.send({ pool: rows });
  });

  // POST /freelancers/portal/me/pool/:jobId/accept — self-select a pool job
  app.post('/freelancers/portal/me/pool/:jobId/accept', async (request: any, reply) => {
    const userId = (request.user as any)?.sub;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const { jobId } = request.params as { jobId: string };

    const fpRes = await pool.query(
      `SELECT fp.id, fp.tenant_id FROM freelancer_profiles WHERE user_id = $1`,
      [userId],
    );
    if (!fpRes.rows.length) return reply.status(404).send({ error: 'Profile not found' });
    const { tenant_id } = fpRes.rows[0];

    const { rows } = await pool.query(
      `UPDATE jobs
          SET owner_id = $1::uuid,
              status = 'allocated',
              pool_visible = false,
              updated_at = now()
        WHERE id = $2::uuid
          AND tenant_id = $3
          AND pool_visible = true
          AND owner_id IS NULL
          AND status IN ('ready', 'intake', 'planned')
        RETURNING id, title, status, fee_brl, job_size, deadline_at`,
      [userId, jobId, tenant_id],
    );

    if (!rows.length) {
      return reply.status(409).send({ error: 'Escopo não disponível — pode ter sido aceito por outro fornecedor.' });
    }
    return reply.send({ ok: true, job: rows[0] });
  });

  // GET /freelancers/portal/me/earnings/current-month — sum of fee_brl for this month
  app.get('/freelancers/portal/me/earnings/current-month', async (request: any, reply) => {
    const userId = (request.user as any)?.sub;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const { rows } = await pool.query(
      `SELECT
         COUNT(*)::int                        AS completed_count,
         COALESCE(SUM(fee_brl), 0)::numeric   AS total_brl,
         json_agg(json_build_object(
           'id', id, 'title', title, 'fee_brl', fee_brl,
           'job_size', job_size, 'completed_at', completed_at
         ) ORDER BY completed_at DESC)         AS jobs
       FROM jobs
       WHERE owner_id = $1::uuid
         AND status IN ('done', 'published', 'approved')
         AND date_trunc('month', completed_at) = date_trunc('month', now())`,
      [userId],
    );

    const row = rows[0];
    return reply.send({
      completed_count: row.completed_count,
      total_brl: row.total_brl,
      jobs: row.jobs ?? [],
    });
  });

  // ── Kanban: Deliver escopo (Em Execução → Em Homologação) ───────────────────

  // POST /freelancers/portal/me/jobs/:id/deliver
  // Freelancer submits delivery link → job enters 'in_review', SLA pauses.
  app.post('/freelancers/portal/me/jobs/:id/deliver', async (request: any, reply) => {
    const userId = (request.user as any)?.sub;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const { id } = request.params as { id: string };
    const { delivered_link, delivery_notes } = request.body as {
      delivered_link: string;
      delivery_notes?: string;
    };

    if (!delivered_link?.trim()) {
      return reply.status(400).send({ error: 'Link de entrega obrigatório' });
    }

    // Verify ownership and eligible status
    const check = await pool.query(
      `SELECT id FROM jobs
       WHERE id = $1::uuid
         AND owner_id = $2::uuid
         AND status IN ('allocated', 'in_progress', 'adjustment')`,
      [id, userId],
    );
    if (!check.rows.length) {
      return reply.status(404).send({ error: 'Escopo não encontrado ou não elegível para entrega' });
    }

    await pool.query(
      `UPDATE jobs
          SET status          = 'in_review',
              delivered_at    = now(),
              delivered_link  = $1,
              delivery_notes  = $2,
              sla_paused_at   = now(),
              updated_at      = now()
        WHERE id = $3::uuid`,
      [delivered_link.trim(), delivery_notes?.trim() ?? null, id],
    );

    return reply.send({ ok: true });
  });

  // ── Billing Dashboard ─────────────────────────────────────────────────────────

  // GET /freelancers/portal/me/billing
  // Returns current cycle (live) + NF action state + previous cycle + statement
  app.get('/freelancers/portal/me/billing', async (request: any, reply) => {
    const userId = (request.user as any)?.sub;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const fpRes = await pool.query(
      `SELECT fp.id, fp.tenant_id, fp.user_id FROM freelancer_profiles fp WHERE fp.user_id = $1`,
      [userId],
    );
    if (!fpRes.rows.length) return reply.status(404).send({ error: 'Profile not found' });
    const { id: freelancerId, tenant_id } = fpRes.rows[0];

    const now = new Date();
    const dayOfMonth = now.getDate();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    // ── Current month (live from jobs) ────────────────────────────────────────
    const currRes = await pool.query(
      `SELECT
         COALESCE(SUM(fee_brl) FILTER (WHERE status = 'approved'), 0)                           AS approved_brl,
         COALESCE(SUM(COALESCE(glosa_brl, 0)) FILTER (WHERE status = 'approved'), 0)            AS glosa_brl,
         COALESCE(SUM(fee_brl) FILTER (WHERE status IN
           ('allocated','in_progress','in_review','adjustment')), 0)                            AS pending_brl
       FROM jobs
       WHERE owner_id = $1::uuid AND tenant_id = $2
         AND date_trunc('month', COALESCE(approved_at, created_at)) = date_trunc('month', now())
         AND status NOT IN ('archived','cancelled')`,
      [userId, tenant_id],
    );
    const curr = currRes.rows[0];
    const approvedBrl = Number(curr.approved_brl);
    const glosaBrl    = Number(curr.glosa_brl);
    const pendingBrl  = Number(curr.pending_brl);

    // ── Statement: this month's jobs ──────────────────────────────────────────
    const stmtRes = await pool.query(
      `SELECT j.id, j.title, j.status, j.approved_at,
              j.fee_brl, COALESCE(j.glosa_brl, 0) AS glosa_brl,
              (j.fee_brl - COALESCE(j.glosa_brl, 0)) AS net_brl,
              j.deadline_at, j.job_size, j.job_category
       FROM jobs j
       WHERE j.owner_id = $1::uuid AND j.tenant_id = $2
         AND date_trunc('month', COALESCE(j.approved_at, j.created_at)) = date_trunc('month', now())
         AND j.status NOT IN ('archived','cancelled')
       ORDER BY j.approved_at DESC NULLS LAST, j.created_at DESC
       LIMIT 50`,
      [userId, tenant_id],
    );

    // ── Previous cycle (for NF action) ────────────────────────────────────────
    const nfWindowOpen = dayOfMonth >= 1 && dayOfMonth <= 5;
    const analysisWindow = dayOfMonth >= 6 && dayOfMonth <= 9;

    let prevCycle: any = null;

    // Auto-freeze previous month on D1–D5
    if (nfWindowOpen || analysisWindow || dayOfMonth === 10) {
      let cycleRes = await pool.query(
        `SELECT * FROM freelancer_billing_cycles WHERE freelancer_id = $1 AND period_month = $2`,
        [freelancerId, prevMonth],
      );

      if (!cycleRes.rows.length && nfWindowOpen) {
        // Snapshot D0: sum all approved jobs in previous month
        const snapRes = await pool.query(
          `SELECT
             COALESCE(SUM(fee_brl), 0)                  AS approved_brl,
             COALESCE(SUM(COALESCE(glosa_brl, 0)), 0)   AS glosa_brl
           FROM jobs
           WHERE owner_id = $1::uuid AND tenant_id = $2
             AND status = 'approved'
             AND date_trunc('month', approved_at) = date_trunc('month', now() - interval '1 month')`,
          [userId, tenant_id],
        );
        const snap = snapRes.rows[0];
        const nfDueDate    = new Date(now.getFullYear(), now.getMonth(), 5);
        const paymentDate  = new Date(now.getFullYear(), now.getMonth(), 10);

        await pool.query(
          `INSERT INTO freelancer_billing_cycles
             (freelancer_id, tenant_id, period_month, approved_brl, glosa_brl, nf_due_date, payment_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (freelancer_id, period_month) DO NOTHING`,
          [freelancerId, tenant_id, prevMonth, snap.approved_brl, snap.glosa_brl, nfDueDate, paymentDate],
        );

        cycleRes = await pool.query(
          `SELECT * FROM freelancer_billing_cycles WHERE freelancer_id = $1 AND period_month = $2`,
          [freelancerId, prevMonth],
        );
      }

      prevCycle = cycleRes.rows[0] ?? null;
    }

    // ── Month name helper ─────────────────────────────────────────────────────
    const MONTH_NAMES: Record<string, string> = {
      '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
      '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
      '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro',
    };
    const [prevYear, prevMM] = prevMonth.split('-');
    const prevMonthName = `${MONTH_NAMES[prevMM] ?? prevMM}/${prevYear}`;

    return reply.send({
      day_of_month: dayOfMonth,
      current: {
        period_month: currentMonth,
        approved_brl: Number(approvedBrl.toFixed(2)),
        pending_brl: Number(pendingBrl.toFixed(2)),
        glosa_brl: Number(glosaBrl.toFixed(2)),
        net_brl: Number((approvedBrl - glosaBrl).toFixed(2)),
      },
      nf_action: prevCycle
        ? {
            cycle_id: prevCycle.id,
            period_month: prevCycle.period_month,
            period_name: prevMonthName,
            amount_brl: Number((Number(prevCycle.approved_brl) - Number(prevCycle.glosa_brl)).toFixed(2)),
            status: prevCycle.status,
            nf_submitted: !!prevCycle.nf_submitted_at,
            nf_url: prevCycle.nf_url ?? null,
            nf_number: prevCycle.nf_number ?? null,
            nf_due_date: prevCycle.nf_due_date,
            payment_date: prevCycle.payment_date,
            paid_at: prevCycle.paid_at ?? null,
            window_open: nfWindowOpen,
            overdue: dayOfMonth > 5 && prevCycle.status === 'nf_pending',
          }
        : null,
      // Agency CNPJ data — admin must configure via tenant settings
      agency_data: {
        description_suggestion: `Serviços de comunicação, design e marketing referentes ao mês de ${prevMonthName}`,
      },
      statement: stmtRes.rows,
    });
  });

  // POST /freelancers/portal/me/billing/:cycleId/submit-nf
  app.post('/freelancers/portal/me/billing/:cycleId/submit-nf', async (request: any, reply) => {
    const userId = (request.user as any)?.sub;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const { cycleId } = request.params as { cycleId: string };
    const { nf_url, nf_number } = request.body as { nf_url: string; nf_number?: string };

    if (!nf_url?.trim()) return reply.status(400).send({ error: 'Link da NF-e obrigatório' });

    const fpRes = await pool.query(
      `SELECT id FROM freelancer_profiles WHERE user_id = $1`,
      [userId],
    );
    if (!fpRes.rows.length) return reply.status(404).send({ error: 'Profile not found' });
    const freelancerId = fpRes.rows[0].id;

    const res = await pool.query(
      `UPDATE freelancer_billing_cycles
          SET nf_url         = $1,
              nf_number      = $2,
              nf_submitted_at = now(),
              status          = 'nf_analysis',
              updated_at      = now()
        WHERE id = $3::uuid AND freelancer_id = $4
          AND status IN ('nf_pending','overdue')
        RETURNING id`,
      [nf_url.trim(), nf_number?.trim() ?? null, cycleId, freelancerId],
    );

    if (!res.rows.length) return reply.status(404).send({ error: 'Ciclo não encontrado ou já processado' });
    return reply.send({ ok: true });
  });
}
