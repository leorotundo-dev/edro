import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { pool } from '../db';
import { ensureTenantMembership } from '../repos/tenantRepo';
import { upsertUser } from '../repositories/edroUserRepository';
import { syncFreelancerPerson } from '../repos/peopleRepo';

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
          WHERE eu.id = $1
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
          AND j.owner_id = $2
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
          AND j.owner_id = $2
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
          AND owner_id = $2
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
          AND owner_id = $2
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
    const userId = request.user?.id;
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
    const userId = request.user?.id;
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
    const userId = request.user?.id;
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
    const userId = request.user?.id;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const fpRes = await pool.query(`SELECT id FROM freelancer_profiles WHERE user_id = $1`, [userId]);
    if (!fpRes.rows.length) return reply.status(404).send({ error: 'Profile not found' });

    // Briefings where in assignees or traffic_owner + ops jobs where owner
    const res = await pool.query(
      `SELECT b.id, b.title, b.status, b.due_at,
              c.name as client_name, 'briefing' as source
       FROM edro_briefings b
       LEFT JOIN clients c ON c.id = b.client_id
       WHERE b.assignees @> jsonb_build_array(jsonb_build_object('user_id', $1::text))
          OR b.traffic_owner = (SELECT eu.name FROM edro_users eu WHERE eu.id = $1 LIMIT 1)
       UNION ALL
       SELECT j.id, j.title, j.status, j.deadline_at as due_at,
              c.name as client_name, 'ops_job' as source
       FROM jobs j
       LEFT JOIN clients c ON c.id = j.client_id
       WHERE j.owner_id = $1::text
         AND j.status NOT IN ('published', 'done', 'archived')
       ORDER BY due_at ASC NULLS LAST
       LIMIT 100`,
      [userId],
    );
    return reply.send({ jobs: res.rows });
  });

  app.get('/freelancers/portal/me/jobs/:jobId', async (request: any, reply) => {
    const userId = request.user?.id;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const { jobId } = request.params as { jobId: string };
    const { source } = request.query as { source?: string };

    // Try ops job first (or if source=ops_job)
    if (!source || source === 'ops_job') {
      const res = await pool.query(
        `SELECT j.*, c.name as client_name, jt.name as job_type_name
         FROM jobs j
         LEFT JOIN clients c ON c.id = j.client_id
         LEFT JOIN job_types jt ON jt.id = j.job_type_id
         WHERE j.id = $1 AND j.owner_id = $2::text`,
        [jobId, userId],
      );
      if (res.rows.length) {
        return reply.send({ job: { ...res.rows[0], source: 'ops_job' } });
      }
    }

    // Try briefing (or if source=briefing)
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
             OR b.traffic_owner = (SELECT eu.name FROM edro_users eu WHERE eu.id = $2 LIMIT 1)
           )`,
        [jobId, userId],
      );
      if (res.rows.length) {
        return reply.send({ job: { ...res.rows[0], source: 'briefing' } });
      }
    }

    return reply.status(404).send({ error: 'Job não encontrado ou não atribuído a você.' });
  });

  app.get('/freelancers/portal/me/payables', async (request: any, reply) => {
    const userId = request.user?.id;
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
}
