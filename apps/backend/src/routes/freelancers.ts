import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { pool } from '../db';

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
    const { tenantId } = request;
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
    user_id: z.string().uuid(),
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
  });

  app.post('/freelancers', { preHandler: [requirePerm('clients:write')] }, async (request: any, reply) => {
    const body = freelancerCreateSchema.parse(request.body);
    const { tenantId } = request;

    // Verify the user belongs to this tenant and has staff/admin role
    const userCheck = await pool.query(
      `SELECT id FROM edro_users WHERE id = $1 AND tenant_id = $2`,
      [body.user_id, tenantId],
    );
    if (!userCheck.rows.length) return reply.status(404).send({ error: 'User not found in tenant' });

    const res = await pool.query(
      `INSERT INTO freelancer_profiles (user_id, display_name, specialty, hourly_rate_brl, pix_key, phone, whatsapp_jid, department, role_title, email_personal, notes, cpf, rg, birth_date, bank_name, bank_agency, bank_account)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
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
         is_active = true,
         updated_at = now()
       RETURNING *`,
      [body.user_id, body.display_name, body.specialty ?? null, body.hourly_rate_brl ?? null, body.pix_key ?? null,
       body.phone ?? null, body.whatsapp_jid ?? null, body.department ?? null, body.role_title ?? null,
       body.email_personal ?? null, body.notes ?? null, body.cpf ?? null, body.rg ?? null, body.birth_date ?? null,
       body.bank_name ?? null, body.bank_agency ?? null, body.bank_account ?? null],
    );
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

    if (!sets.length) return reply.status(400).send({ error: 'Nothing to update' });
    sets.push(`updated_at = now()`);
    vals.push(id);

    const res = await pool.query(
      `UPDATE freelancer_profiles SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      vals,
    );
    if (!res.rows.length) return reply.status(404).send({ error: 'Not found' });
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
    const { tenantId } = request;

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
    const { tenantId } = request;

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
    const allowed = ['phone', 'whatsapp_jid', 'department', 'role_title', 'email_personal', 'notes'];
    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;
    for (const key of allowed) {
      if (body[key] !== undefined) {
        sets.push(`${key} = $${idx++}`);
        vals.push(body[key] || null);
      }
    }
    if (!sets.length) return reply.status(400).send({ error: 'No fields to update' });

    sets.push(`updated_at = now()`);
    vals.push(freelancerId);

    const res = await pool.query(
      `UPDATE freelancer_profiles SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      vals,
    );
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
    const freelancerId = fpRes.rows[0].id;

    // Return briefings where this freelancer appears in assignees array
    const res = await pool.query(
      `SELECT b.id, b.title, b.status, b.due_at,
              c.name as client_name
       FROM edro_briefings b
       LEFT JOIN clients c ON c.id = b.client_id
       WHERE b.assignees @> jsonb_build_array(jsonb_build_object('user_id', $1::text))
          OR b.traffic_owner = (SELECT eu.name FROM edro_users eu WHERE eu.id = $2 LIMIT 1)
       ORDER BY b.created_at DESC
       LIMIT 50`,
      [userId, userId],
    );
    return reply.send({ jobs: res.rows });
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
