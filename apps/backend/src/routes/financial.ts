import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard, requirePerm } from '../auth/rbac';
import { requireClientPerm } from '../auth/clientPerms';
import { tenantGuard } from '../auth/tenantGuard';
import { pool } from '../db';
import { omieClient } from '../providers/omie/omieClient';

// ── PDF helper (pdfkit, falls back to text) ────────────────────────────────

async function generateProposalPdf(p: {
  title: string;
  clientName: string;
  items: Array<{ description: string; qty: number; unit_price: number; total: number }>;
  subtotal: number;
  discount: number;
  total: number;
  validityDays: number;
  notes?: string | null;
}): Promise<Buffer> {
  let PDFDocument: any;
  try { PDFDocument = (await import('pdfkit')).default; } catch {
    const lines = [
      `PROPOSTA COMERCIAL — ${p.title}`,
      `Cliente: ${p.clientName}`,
      `Validade: ${p.validityDays} dias`,
      '---',
      ...p.items.map((i) => `${i.description} × ${i.qty} = R$ ${i.total.toFixed(2)}`),
      '---',
      `Subtotal: R$ ${p.subtotal.toFixed(2)}`,
      p.discount > 0 ? `Desconto: R$ ${p.discount.toFixed(2)}` : '',
      `TOTAL: R$ ${p.total.toFixed(2)}`,
      p.notes ? `\nObservações: ${p.notes}` : '',
    ].filter(Boolean).join('\n');
    return Buffer.from(lines, 'utf-8');
  }
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 60 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).font('Helvetica-Bold').text('PROPOSTA COMERCIAL', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(13).font('Helvetica').text(p.title, { align: 'center' });
    doc.fontSize(11).fillColor('#666').text(`Cliente: ${p.clientName} · Validade: ${p.validityDays} dias`, { align: 'center' });
    doc.moveDown(1).fillColor('#000');

    // Items table header
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Descrição', 60, doc.y, { continued: false });

    p.items.forEach((item) => {
      doc.font('Helvetica').fontSize(10);
      doc.text(`${item.description}`, 60, doc.y, { width: 300, continued: true });
      doc.text(`${item.qty}x`, { width: 50, align: 'right', continued: true });
      doc.text(`R$ ${item.unit_price.toFixed(2)}`, { width: 80, align: 'right', continued: true });
      doc.text(`R$ ${item.total.toFixed(2)}`, { width: 80, align: 'right' });
    });

    doc.moveDown(0.5);
    doc.font('Helvetica').text(`Subtotal: R$ ${p.subtotal.toFixed(2)}`, { align: 'right' });
    if (p.discount > 0) doc.text(`Desconto: R$ ${p.discount.toFixed(2)}`, { align: 'right' });
    doc.font('Helvetica-Bold').fontSize(13).text(`TOTAL: R$ ${p.total.toFixed(2)}`, { align: 'right' });

    if (p.notes) {
      doc.moveDown(1).font('Helvetica').fontSize(10).text(`Observações: ${p.notes}`);
    }
    doc.end();
  });
}

// ── Route plugin ───────────────────────────────────────────────────────────

export default async function financialRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);
  app.addHook('preHandler', tenantGuard());

  // ── Service Contracts ───────────────────────────────────────────────────

  app.get('/financial/contracts', { preHandler: [requirePerm('clients:read')] }, async (request: any, reply) => {
    const { tenantId } = request;
    const { client_id, status } = request.query as any;

    let q = `SELECT sc.*, c.name as client_name
             FROM service_contracts sc
             JOIN clients c ON c.id = sc.client_id
             WHERE sc.tenant_id = $1`;
    const vals: any[] = [tenantId];
    let i = 2;
    if (client_id) { q += ` AND sc.client_id = $${i++}`; vals.push(client_id); }
    if (status)    { q += ` AND sc.status = $${i++}`;    vals.push(status); }
    q += ' ORDER BY sc.created_at DESC';

    const res = await pool.query(q, vals);
    return reply.send({ contracts: res.rows });
  });

  const contractSchema = z.object({
    client_id:         z.string(),
    type:              z.enum(['retainer', 'project', 'hourly']).default('retainer'),
    title:             z.string().min(1),
    monthly_value_brl: z.number().positive().optional().nullable(),
    project_value_brl: z.number().positive().optional().nullable(),
    hourly_rate_brl:   z.number().positive().optional().nullable(),
    start_date:        z.string().optional().nullable(),
    end_date:          z.string().optional().nullable(),
    status:            z.enum(['draft', 'active', 'paused', 'ended']).default('active'),
    notes:             z.string().optional().nullable(),
  });

  app.post('/financial/contracts', { preHandler: [requirePerm('clients:write')] }, async (request: any, reply) => {
    const { tenantId } = request;
    const body = contractSchema.parse(request.body);

    // Optionally sync client to Omie
    let omieClientId: number | null = null;
    if (omieClient.ok()) {
      try {
        const clientRow = await pool.query(`SELECT name, profile FROM clients WHERE id = $1`, [body.client_id]);
        if (clientRow.rows.length) {
          const c = clientRow.rows[0];
          const res = await omieClient.incluirCliente({
            razao_social: c.name,
            codigo_cliente_integracao: body.client_id,
            email: c.profile?.email ?? undefined,
          });
          omieClientId = res.codigo_cliente_omie ?? null;
        }
      } catch (e) {
        app.log.warn(`Omie client sync failed: ${(e as Error).message}`);
      }
    }

    const res = await pool.query(
      `INSERT INTO service_contracts
         (tenant_id, client_id, type, title, monthly_value_brl, project_value_brl,
          hourly_rate_brl, start_date, end_date, status, notes, omie_client_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [tenantId, body.client_id, body.type, body.title,
       body.monthly_value_brl ?? null, body.project_value_brl ?? null,
       body.hourly_rate_brl ?? null, body.start_date ?? null,
       body.end_date ?? null, body.status, body.notes ?? null, omieClientId],
    );
    return reply.status(201).send(res.rows[0]);
  });

  app.get('/financial/contracts/:id', { preHandler: [requirePerm('clients:read')] }, async (request: any, reply) => {
    const { id } = request.params as any;
    const { tenantId } = request;
    const res = await pool.query(
      `SELECT sc.*, c.name as client_name FROM service_contracts sc
       JOIN clients c ON c.id = sc.client_id
       WHERE sc.id = $1 AND sc.tenant_id = $2`,
      [id, tenantId],
    );
    if (!res.rows.length) return reply.status(404).send({ error: 'Not found' });
    return reply.send(res.rows[0]);
  });

  app.patch('/financial/contracts/:id', { preHandler: [requirePerm('clients:write')] }, async (request: any, reply) => {
    const { id } = request.params as any;
    const tenantId = (request as any).user?.tenant_id;
    const body = contractSchema.partial().parse(request.body);
    const sets: string[] = [];
    const vals: any[] = [];
    let i = 1;
    const fields: Record<string, any> = body as any;
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined) { sets.push(`${k} = $${i++}`); vals.push(v); }
    }
    if (!sets.length) return reply.status(400).send({ error: 'Nothing to update' });
    vals.push(id);
    vals.push(tenantId);
    const res = await pool.query(
      `UPDATE service_contracts SET ${sets.join(', ')} WHERE id = $${i} AND tenant_id = $${i + 1} RETURNING *`, vals,
    );
    if (!res.rows.length) return reply.status(404).send({ error: 'Not found' });
    return reply.send(res.rows[0]);
  });

  // ── Proposals ───────────────────────────────────────────────────────────

  const proposalItemSchema = z.object({
    description: z.string(),
    qty:         z.number().positive(),
    unit_price:  z.number().nonnegative(),
    total:       z.number().nonnegative(),
  });

  const proposalSchema = z.object({
    client_id:     z.string().optional().nullable(),
    contract_id:   z.string().uuid().optional().nullable(),
    title:         z.string().min(1),
    items:         z.array(proposalItemSchema).default([]),
    discount_brl:  z.number().nonnegative().default(0),
    validity_days: z.number().int().positive().default(15),
    notes:         z.string().optional().nullable(),
  });

  app.get('/financial/proposals', { preHandler: [requirePerm('clients:read')] }, async (request: any, reply) => {
    const { tenantId } = request;
    const { status, client_id } = request.query as any;
    let q = `SELECT p.*, c.name as client_name FROM proposals p
             LEFT JOIN clients c ON c.id = p.client_id
             WHERE p.tenant_id = $1`;
    const vals: any[] = [tenantId];
    let i = 2;
    if (status)    { q += ` AND p.status = $${i++}`;    vals.push(status); }
    if (client_id) { q += ` AND p.client_id = $${i++}`; vals.push(client_id); }
    q += ' ORDER BY p.created_at DESC';
    const res = await pool.query(q, vals);
    return reply.send({ proposals: res.rows });
  });

  app.post('/financial/proposals', { preHandler: [requirePerm('clients:write')] }, async (request: any, reply) => {
    const { tenantId } = request;
    const userId = request.user?.id;
    const body = proposalSchema.parse(request.body);

    const subtotal = body.items.reduce((s, item) => s + item.total, 0);
    const total    = Math.max(0, subtotal - body.discount_brl);

    const res = await pool.query(
      `INSERT INTO proposals
         (tenant_id, client_id, contract_id, title, items, subtotal_brl, discount_brl, total_brl,
          validity_days, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [tenantId, body.client_id ?? null, body.contract_id ?? null, body.title,
       JSON.stringify(body.items), subtotal, body.discount_brl, total,
       body.validity_days, body.notes ?? null, userId ?? null],
    );
    return reply.status(201).send(res.rows[0]);
  });

  app.get('/financial/proposals/:id', { preHandler: [requirePerm('clients:read')] }, async (request: any, reply) => {
    const { id } = request.params as any;
    const { tenantId } = request;
    const res = await pool.query(
      `SELECT p.*, c.name as client_name FROM proposals p
       LEFT JOIN clients c ON c.id = p.client_id
       WHERE p.id = $1 AND p.tenant_id = $2`,
      [id, tenantId],
    );
    if (!res.rows.length) return reply.status(404).send({ error: 'Not found' });
    return reply.send(res.rows[0]);
  });

  app.patch('/financial/proposals/:id', { preHandler: [requirePerm('clients:write')] }, async (request: any, reply) => {
    const { id } = request.params as any;
    const tenantId = (request as any).user?.tenant_id;
    const body = proposalSchema.partial().parse(request.body);

    // Recalculate totals if items changed
    let subtotal: number | undefined;
    let total: number | undefined;
    if (body.items) {
      subtotal = body.items.reduce((s, item) => s + item.total, 0);
      const discount = body.discount_brl ?? 0;
      total = Math.max(0, subtotal - discount);
    }

    const sets: string[] = [];
    const vals: any[] = [];
    let i = 1;
    if (body.client_id   !== undefined) { sets.push(`client_id = $${i++}`);    vals.push(body.client_id); }
    if (body.contract_id !== undefined) { sets.push(`contract_id = $${i++}`);  vals.push(body.contract_id); }
    if (body.title       !== undefined) { sets.push(`title = $${i++}`);         vals.push(body.title); }
    if (body.items       !== undefined) { sets.push(`items = $${i++}`);          vals.push(JSON.stringify(body.items)); }
    if (subtotal         !== undefined) { sets.push(`subtotal_brl = $${i++}`);  vals.push(subtotal); }
    if (body.discount_brl !== undefined) { sets.push(`discount_brl = $${i++}`); vals.push(body.discount_brl); }
    if (total            !== undefined) { sets.push(`total_brl = $${i++}`);     vals.push(total); }
    if (body.validity_days !== undefined) { sets.push(`validity_days = $${i++}`); vals.push(body.validity_days); }
    if (body.notes       !== undefined) { sets.push(`notes = $${i++}`);          vals.push(body.notes); }

    if (!sets.length) return reply.status(400).send({ error: 'Nothing to update' });
    vals.push(id);
    vals.push(tenantId);
    const res = await pool.query(
      `UPDATE proposals SET ${sets.join(', ')} WHERE id = $${i} AND tenant_id = $${i + 1} RETURNING *`, vals,
    );
    if (!res.rows.length) return reply.status(404).send({ error: 'Not found' });
    return reply.send(res.rows[0]);
  });

  // Send proposal — generates accept_token
  app.post('/financial/proposals/:id/send', { preHandler: [requirePerm('clients:write')] }, async (request: any, reply) => {
    const { id } = request.params as any;
    const tenantId = (request as any).user?.tenant_id;
    const token = crypto.randomUUID();
    const res = await pool.query(
      `UPDATE proposals SET status = 'sent', sent_at = NOW(), accept_token = $1
       WHERE id = $2 AND status = 'draft' AND tenant_id = $3 RETURNING *`,
      [token, id, tenantId],
    );
    if (!res.rows.length) return reply.status(404).send({ error: 'Not found or already sent' });
    const proposal = res.rows[0];

    // Generate PDF and store URL (stored inline for now; can be uploaded to S3)
    const clientName = (
      await pool.query(
        `SELECT name FROM clients WHERE id = $1 AND tenant_id = $2`,
        [proposal.client_id, tenantId],
      )
    ).rows[0]?.name ?? 'Cliente';
    const pdfBuffer = await generateProposalPdf({
      title: proposal.title,
      clientName,
      items: Array.isArray(proposal.items) ? proposal.items : JSON.parse(proposal.items),
      subtotal: parseFloat(proposal.subtotal_brl),
      discount: parseFloat(proposal.discount_brl),
      total: parseFloat(proposal.total_brl),
      validityDays: proposal.validity_days,
      notes: proposal.notes,
    });

    // Return token + base64 PDF
    return reply.send({
      proposal,
      accept_url: `${process.env.CLIENT_PORTAL_URL ?? ''}/proposta/${token}`,
      pdf_base64: pdfBuffer.toString('base64'),
    });
  });

  // Public view endpoint (no auth required — token acts as auth)
  app.get('/financial/proposals/view/:token', async (request: any, reply) => {
    const { token } = request.params as any;
    const res = await pool.query(
      `SELECT p.id, p.title, p.items, p.subtotal_brl, p.discount_brl, p.total_brl,
              p.validity_days, p.notes, p.status, p.sent_at, c.name as client_name
       FROM proposals p
       LEFT JOIN clients c ON c.id = p.client_id
       WHERE p.accept_token = $1`,
      [token],
    );
    if (!res.rows.length) return reply.status(404).send({ error: 'Proposta não encontrada' });
    return reply.send({ proposal: res.rows[0] });
  });

  // Public accept endpoint (no auth required — token acts as auth)
  app.post('/financial/proposals/accept/:token', async (request: any, reply) => {
    const { token } = request.params as any;
    const res = await pool.query(
      `UPDATE proposals SET status = 'accepted', accepted_at = NOW()
       WHERE accept_token = $1 AND status = 'sent' RETURNING *`,
      [token],
    );
    if (!res.rows.length) return reply.status(404).send({ error: 'Proposal not found or already processed' });
    return reply.send({ success: true, proposal: res.rows[0] });
  });

  app.get('/financial/proposals/:id/pdf', { preHandler: [requirePerm('clients:read')] }, async (request: any, reply) => {
    const { id } = request.params as any;
    const { tenantId } = request;
    const pRes = await pool.query(
      `SELECT p.*, c.name as client_name FROM proposals p
       LEFT JOIN clients c ON c.id = p.client_id
       WHERE p.id = $1 AND p.tenant_id = $2`,
      [id, tenantId],
    );
    if (!pRes.rows.length) return reply.status(404).send({ error: 'Not found' });
    const p = pRes.rows[0];
    const pdfBuffer = await generateProposalPdf({
      title: p.title,
      clientName: p.client_name ?? 'Cliente',
      items: Array.isArray(p.items) ? p.items : JSON.parse(p.items ?? '[]'),
      subtotal: parseFloat(p.subtotal_brl),
      discount: parseFloat(p.discount_brl),
      total:    parseFloat(p.total_brl),
      validityDays: p.validity_days,
      notes: p.notes,
    });
    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="proposta-${p.title.replace(/\s/g, '_')}.pdf"`);
    return reply.send(pdfBuffer);
  });

  // ── Invoices ────────────────────────────────────────────────────────────

  const invoiceSchema = z.object({
    client_id:    z.string(),
    contract_id:  z.string().uuid().optional().nullable(),
    period_month: z.string().optional().nullable(),
    description:  z.string().min(1),
    amount_brl:   z.number().positive(),
    due_date:     z.string().optional().nullable(),
    notes:        z.string().optional().nullable(),
  });

  app.get('/financial/invoices', { preHandler: [requirePerm('clients:read')] }, async (request: any, reply) => {
    const { tenantId } = request;
    const { month, status, client_id } = request.query as any;
    let q = `SELECT i.*, c.name as client_name FROM invoices i
             JOIN clients c ON c.id = i.client_id
             WHERE i.tenant_id = $1`;
    const vals: any[] = [tenantId];
    let idx = 2;
    if (month)     { q += ` AND i.period_month = $${idx++}`;  vals.push(month); }
    if (status)    { q += ` AND i.status = $${idx++}`;         vals.push(status); }
    if (client_id) { q += ` AND i.client_id = $${idx++}`;      vals.push(client_id); }
    q += ' ORDER BY i.created_at DESC';
    const res = await pool.query(q, vals);
    return reply.send({ invoices: res.rows });
  });

  app.post('/financial/invoices', { preHandler: [requirePerm('clients:write')] }, async (request: any, reply) => {
    const { tenantId } = request;
    const body = invoiceSchema.parse(request.body);
    const res = await pool.query(
      `INSERT INTO invoices (tenant_id, client_id, contract_id, period_month, description, amount_brl, due_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [tenantId, body.client_id, body.contract_id ?? null, body.period_month ?? null,
       body.description, body.amount_brl, body.due_date ?? null, body.notes ?? null],
    );
    return reply.status(201).send(res.rows[0]);
  });

  app.patch('/financial/invoices/:id', { preHandler: [requirePerm('clients:write')] }, async (request: any, reply) => {
    const { id } = request.params as any;
    const tenantId = (request as any).user?.tenant_id;
    const body = invoiceSchema.partial().parse(request.body);
    const sets: string[] = [];
    const vals: any[] = [];
    let i = 1;
    const map: Record<string, any> = body as any;
    for (const [k, v] of Object.entries(map)) {
      if (v !== undefined) { sets.push(`${k} = $${i++}`); vals.push(v); }
    }
    if (!sets.length) return reply.status(400).send({ error: 'Nothing to update' });
    vals.push(id);
    vals.push(tenantId);
    const res = await pool.query(
      `UPDATE invoices SET ${sets.join(', ')} WHERE id = $${i} AND tenant_id = $${i + 1} RETURNING *`, vals,
    );
    if (!res.rows.length) return reply.status(404).send({ error: 'Not found' });
    return reply.send(res.rows[0]);
  });

  // Send to Omie — create OS
  app.post('/financial/invoices/:id/send-omie', { preHandler: [requirePerm('clients:write')] }, async (request: any, reply) => {
    const { id } = request.params as any;
    const { tenantId } = request;
    const inv = await pool.query(
      `SELECT i.*, sc.omie_client_id FROM invoices i
       LEFT JOIN service_contracts sc ON sc.id = i.contract_id
       WHERE i.id = $1 AND i.tenant_id = $2`,
      [id, tenantId],
    );
    if (!inv.rows.length) return reply.status(404).send({ error: 'Not found' });
    const invoice = inv.rows[0];

    if (!omieClient.ok()) return reply.status(503).send({ error: 'Omie not configured' });
    if (!invoice.omie_client_id) return reply.status(400).send({ error: 'Contract has no Omie client ID. Sync client first.' });

    const dueDate = invoice.due_date
      ? new Date(invoice.due_date).toLocaleDateString('pt-BR')
      : new Date(Date.now() + 30 * 86400000).toLocaleDateString('pt-BR');

    const osRes = await omieClient.incluirOS({
      cabecalho: {
        cCodIntOS:   id,
        cCodParc:    '001',
        dDtPrevisao: dueDate,
        nCodCli:     invoice.omie_client_id,
        cEtapa:      '10',
      },
      servicos: [{
        cCodServico: process.env.OMIE_DEFAULT_SERVICE_CODE ?? '01',
        cDescricao:  invoice.description,
        nQtde:       1,
        nValUnit:    parseFloat(invoice.amount_brl),
      }],
      infAdic: { cObs: invoice.notes ?? undefined },
    });

    await pool.query(`UPDATE invoices SET omie_os_id = $1, status = 'sent' WHERE id = $2 AND tenant_id = $3`, [osRes.nCodOS, id, invoice.tenant_id]);
    return reply.send({ omie_os_id: osRes.nCodOS });
  });

  // Emit NFS-e
  app.post('/financial/invoices/:id/emit-nfe', { preHandler: [requirePerm('clients:write')] }, async (request: any, reply) => {
    const { id } = request.params as any;
    const { tenantId } = request;
    const inv = await pool.query(`SELECT omie_os_id, tenant_id FROM invoices WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
    if (!inv.rows.length) return reply.status(404).send({ error: 'Not found' });
    const { omie_os_id } = inv.rows[0];
    if (!omie_os_id) return reply.status(400).send({ error: 'OS not created in Omie yet. Run send-omie first.' });

    if (!omieClient.ok()) return reply.status(503).send({ error: 'Omie not configured' });

    const nfeRes = await omieClient.emitirNFSe(omie_os_id);
    await pool.query(
      `UPDATE invoices SET omie_nfe_id = $1, omie_nfe_numero = $2 WHERE id = $3 AND tenant_id = $4`,
      [nfeRes.nCodNFe, String(nfeRes.nNumNFe), id, inv.rows[0].tenant_id],
    );
    return reply.send({ omie_nfe_id: nfeRes.nCodNFe, nfe_numero: nfeRes.nNumNFe, status: nfeRes.cSitNFe });
  });

  // Mark paid
  app.post('/financial/invoices/:id/mark-paid', { preHandler: [requirePerm('clients:write')] }, async (request: any, reply) => {
    const { id } = request.params as any;
    const tenantId = (request as any).user?.tenant_id;
    const { paid_at } = z.object({ paid_at: z.string().optional() }).parse(request.body ?? {});
    const res = await pool.query(
      `UPDATE invoices SET status = 'paid', paid_at = $1 WHERE id = $2 AND tenant_id = $3 RETURNING *`,
      [paid_at ? new Date(paid_at) : new Date(), id, tenantId],
    );
    if (!res.rows.length) return reply.status(404).send({ error: 'Not found' });
    return reply.send(res.rows[0]);
  });

  // ── Media Budgets ───────────────────────────────────────────────────────

  const budgetSchema = z.object({
    client_id:    z.string(),
    period_month: z.string().regex(/^\d{4}-\d{2}$/),
    platform:     z.enum(['meta_ads', 'google_ads', 'linkedin', 'tiktok', 'other']),
    planned_brl:  z.number().nonnegative(),
    realized_brl: z.number().nonnegative().default(0),
    markup_pct:   z.number().nonnegative().default(15),
    notes:        z.string().optional().nullable(),
  });

  app.get('/financial/media-budgets', { preHandler: [requirePerm('clients:read')] }, async (request: any, reply) => {
    const { tenantId } = request;
    const { client_id, month } = request.query as any;
    let q = `SELECT mb.*, c.name as client_name FROM media_budgets mb
             JOIN clients c ON c.id = mb.client_id WHERE mb.tenant_id = $1`;
    const vals: any[] = [tenantId];
    let i = 2;
    if (client_id) { q += ` AND mb.client_id = $${i++}`; vals.push(client_id); }
    if (month)     { q += ` AND mb.period_month = $${i++}`; vals.push(month); }
    q += ' ORDER BY mb.period_month DESC, c.name';
    const res = await pool.query(q, vals);
    return reply.send({ budgets: res.rows });
  });

  app.post('/financial/media-budgets', { preHandler: [requirePerm('clients:write')] }, async (request: any, reply) => {
    const { tenantId } = request;
    const body = budgetSchema.parse(request.body);
    const res = await pool.query(
      `INSERT INTO media_budgets (tenant_id, client_id, period_month, platform, planned_brl, realized_brl, markup_pct, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (tenant_id, client_id, period_month, platform)
       DO UPDATE SET planned_brl = EXCLUDED.planned_brl,
                     realized_brl = EXCLUDED.realized_brl,
                     markup_pct = EXCLUDED.markup_pct,
                     notes = EXCLUDED.notes
       RETURNING *`,
      [tenantId, body.client_id, body.period_month, body.platform,
       body.planned_brl, body.realized_brl, body.markup_pct, body.notes ?? null],
    );
    return reply.status(201).send(res.rows[0]);
  });

  // Alert: clients with > 85% budget consumed
  app.get('/financial/media-budgets/alerts', { preHandler: [requirePerm('clients:read')] }, async (request: any, reply) => {
    const { tenantId } = request;
    const month = (request.query as any).month ?? new Date().toISOString().slice(0, 7);
    const res = await pool.query(
      `SELECT mb.*, c.name as client_name,
              ROUND((mb.realized_brl / NULLIF(mb.planned_brl, 0)) * 100, 1) as pct_consumed
       FROM media_budgets mb
       JOIN clients c ON c.id = mb.client_id
       WHERE mb.tenant_id = $1 AND mb.period_month = $2
         AND mb.planned_brl > 0
         AND (mb.realized_brl / mb.planned_brl) >= 0.85
       ORDER BY (mb.realized_brl / mb.planned_brl) DESC`,
      [tenantId, month],
    );
    return reply.send({ alerts: res.rows });
  });

  // ── P&L ─────────────────────────────────────────────────────────────────

  app.get('/financial/pl', { preHandler: [requirePerm('clients:read')] }, async (request: any, reply) => {
    const { tenantId } = request;
    const month = (request.query as any).month ?? new Date().toISOString().slice(0, 7);

    const res = await pool.query(
      `SELECT
         c.id, c.name,
         COALESCE(inv.receita, 0)        AS receita_brl,
         COALESCE(te_cost.custo, 0)      AS custo_producao_brl,
         COALESCE(mb_cost.midia, 0)      AS custo_midia_brl,
         COALESCE(inv.receita, 0)
           - COALESCE(te_cost.custo, 0)
           - COALESCE(mb_cost.midia, 0)  AS margem_brl,
         CASE WHEN COALESCE(inv.receita, 0) > 0
              THEN ROUND(
                (COALESCE(inv.receita, 0) - COALESCE(te_cost.custo, 0) - COALESCE(mb_cost.midia, 0))
                / inv.receita * 100, 1)
              ELSE NULL END              AS margem_pct
       FROM clients c
       LEFT JOIN (
         SELECT client_id, SUM(amount_brl) AS receita
         FROM invoices
         WHERE tenant_id = $1 AND to_char(created_at, 'YYYY-MM') = $2 AND status != 'cancelled'
         GROUP BY client_id
       ) inv ON inv.client_id = c.id
       LEFT JOIN (
         SELECT b.main_client_id AS client_id,
                SUM(te.minutes / 60.0 * fp.hourly_rate_brl) AS custo
         FROM time_entries te
         JOIN freelancer_profiles fp ON fp.id = te.freelancer_id
         JOIN edro_briefings b ON b.id = te.briefing_id
         WHERE to_char(te.started_at, 'YYYY-MM') = $2
         GROUP BY b.main_client_id
       ) te_cost ON te_cost.client_id = c.id
       LEFT JOIN (
         SELECT client_id, SUM(realized_brl) AS midia
         FROM media_budgets
         WHERE tenant_id = $1 AND period_month = $2
         GROUP BY client_id
       ) mb_cost ON mb_cost.client_id = c.id
       WHERE c.tenant_id = $1
         AND (inv.receita IS NOT NULL OR te_cost.custo IS NOT NULL OR mb_cost.midia IS NOT NULL)
       ORDER BY margem_brl DESC NULLS LAST`,
      [tenantId, month],
    );
    return reply.send({ month, pl: res.rows });
  });

  // Financial summary for a specific client
  app.get('/clients/:id/financial-summary', { preHandler: [authGuard, tenantGuard(), requirePerm('clients:read'), requireClientPerm('read')] }, async (request: any, reply) => {
    const { id } = request.params as any;
    const tenantId = request.user?.tenant_id as string;

    const [contracts, invoices, budgets] = await Promise.all([
      pool.query(`SELECT * FROM service_contracts WHERE client_id = $1 AND tenant_id = $2 AND status = 'active' ORDER BY created_at DESC`, [id, tenantId]),
      pool.query(`SELECT * FROM invoices WHERE client_id = $1 AND tenant_id = $2 ORDER BY created_at DESC LIMIT 12`, [id, tenantId]),
      pool.query(`SELECT * FROM media_budgets WHERE client_id = $1 AND tenant_id = $2 ORDER BY period_month DESC LIMIT 12`, [id, tenantId]),
    ]);

    const totalReceita  = invoices.rows.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + parseFloat(i.amount_brl), 0);
    const totalPendente = invoices.rows.filter((i: any) => ['draft', 'sent'].includes(i.status)).reduce((s: number, i: any) => s + parseFloat(i.amount_brl), 0);

    return reply.send({
      active_contract: contracts.rows[0] ?? null,
      invoices:        invoices.rows,
      media_budgets:   budgets.rows,
      summary: {
        total_receita_brl:  totalReceita,
        total_pendente_brl: totalPendente,
      },
    });
  });

  // ── Scope Estimation ─────────────────────────────────────────────────────

  app.post('/financial/estimate', { preHandler: [requirePerm('clients:read')] }, async (request: any, reply) => {
    const { tenantId } = request;
    const body = z.object({
      briefing_id: z.string().uuid().optional(),
      title:       z.string(),
      labels:      z.array(z.string()).default([]),
      platform:    z.string().optional(),
      format:      z.string().optional(),
      client_id:   z.string().optional(),
    }).parse(request.body);

    const { estimateScope } = await import('../services/ai/scopeEstimator');
    const estimate = await estimateScope({
      tenantId,
      title: body.title,
      labels: body.labels,
      platform: body.platform,
      format: body.format,
      clientId: body.client_id,
      briefingId: body.briefing_id,
    });

    // Persist to job_estimations if briefing_id provided
    if (body.briefing_id) {
      await pool.query(
        `INSERT INTO job_estimations
           (tenant_id, briefing_id, estimated_hours, estimated_cost_brl, complexity,
            confidence, factors, similar_jobs_count, rationale)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (briefing_id) DO UPDATE SET
           estimated_hours = EXCLUDED.estimated_hours,
           estimated_cost_brl = EXCLUDED.estimated_cost_brl,
           complexity = EXCLUDED.complexity,
           confidence = EXCLUDED.confidence,
           factors = EXCLUDED.factors,
           similar_jobs_count = EXCLUDED.similar_jobs_count,
           rationale = EXCLUDED.rationale`,
        [tenantId, body.briefing_id, estimate.estimated_hours,
         estimate.estimated_cost_brl, estimate.complexity, estimate.confidence,
         JSON.stringify(estimate.factors ?? {}), estimate.similar_jobs_count, estimate.rationale],
      ).catch(() => {}); // non-blocking, ignore conflict schema issues
    }

    return reply.send(estimate);
  });

  // ── Productivity analytics ─────────────────────────────────────────────────
  // GET /financial/productivity?month=YYYY-MM
  // Returns: by_freelancer[] and by_client[] aggregated from time_entries
  app.get('/financial/productivity', { preHandler: [requirePerm('clients:read')] }, async (request: any, reply) => {
    const { tenantId } = request;
    const { month } = request.query as { month?: string };
    const m = month ?? new Date().toISOString().slice(0, 7);

    const [byFl, byClient] = await Promise.all([
      pool.query(
        `SELECT fp.id as freelancer_id, fp.display_name, fp.hourly_rate_brl,
                SUM(te.minutes) as total_minutes,
                ROUND(SUM(te.minutes)::numeric / 60 * COALESCE(fp.hourly_rate_brl::numeric, 0), 2) as total_cost
         FROM time_entries te
         JOIN freelancer_profiles fp ON fp.id = te.freelancer_id
         WHERE fp.user_id IN (
           SELECT user_id FROM edro_users WHERE tenant_id = $1
         )
         AND to_char(te.started_at, 'YYYY-MM') = $2
         GROUP BY fp.id, fp.display_name, fp.hourly_rate_brl
         ORDER BY total_minutes DESC`,
        [tenantId, m],
      ),
      pool.query(
        `SELECT c.name as client_name, c.id as client_id,
                SUM(te.minutes) as total_minutes,
                ROUND(SUM(te.minutes)::numeric / 60 * COALESCE(fp.hourly_rate_brl::numeric, 0), 2) as total_cost
         FROM time_entries te
         JOIN freelancer_profiles fp ON fp.id = te.freelancer_id
         LEFT JOIN edro_briefings b ON b.id = te.briefing_id
         LEFT JOIN clients c ON c.id = b.main_client_id
         WHERE fp.user_id IN (
           SELECT user_id FROM edro_users WHERE tenant_id = $1
         )
         AND to_char(te.started_at, 'YYYY-MM') = $2
         GROUP BY c.id, c.name
         ORDER BY total_minutes DESC`,
        [tenantId, m],
      ),
    ]);

    return reply.send({
      month: m,
      by_freelancer: byFl.rows,
      by_client: byClient.rows,
    });
  });

}
