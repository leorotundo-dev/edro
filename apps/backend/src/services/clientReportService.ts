/**
 * Client Monthly Report PDF Generator
 *
 * Generates a PDF monthly report for a client containing:
 * - Summary: jobs completed, approval rate, budget consumed
 * - Job list with status and delivery date
 * - Financial summary: invoices for the month
 * - Media budget: planned vs realized per platform
 */

import PDFDocument from 'pdfkit';
import { pool } from '../db';

const BRAND_COLOR  = '#E85219';  // Edro orange
const DARK         = '#1e293b';
const MUTED        = '#64748b';
const LIGHT_BG     = '#f8fafc';
const SUCCESS      = '#16a34a';
const WARNING      = '#d97706';

function formatBrl(val: number) {
  return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(str: string | null) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('pt-BR');
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    done: 'Concluído', in_progress: 'Em andamento', review: 'Em revisão',
    todo: 'A fazer', cancelled: 'Cancelado', archived: 'Arquivado',
  };
  return map[status] ?? status;
}

export async function generateClientReportPdf(clientId: string, month: string): Promise<Buffer> {
  const [year, mon] = month.split('-').map(Number);
  const startDate = new Date(year, mon - 1, 1);
  const endDate   = new Date(year, mon, 0, 23, 59, 59);
  const monthLabel = startDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const monthUpper = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  // ── Fetch data ──────────────────────────────────────────────────────────────

  const clientRes = await pool.query(
    `SELECT name, segment_primary, city, uf FROM clients WHERE id = $1`,
    [clientId],
  );
  const client = clientRes.rows[0] ?? { name: 'Cliente', segment_primary: '', city: '', uf: '' };

  const jobsRes = await pool.query(
    `SELECT b.title, b.status, b.due_at, b.copy_approved_at, b.updated_at,
            ARRAY(SELECT cat.author_type FROM copy_approval_thread cat WHERE cat.briefing_id = b.id) AS thread_types
     FROM edro_briefings b
     WHERE b.main_client_id = $1
       AND b.created_at BETWEEN $2 AND $3
     ORDER BY b.updated_at DESC
     LIMIT 50`,
    [clientId, startDate, endDate],
  );
  const jobs = jobsRes.rows;

  const invoicesRes = await pool.query(
    `SELECT description, amount_brl, status, due_date, paid_at
     FROM invoices
     WHERE client_id = $1 AND period_month = $2 AND status != 'cancelled'`,
    [clientId, month],
  );
  const invoices = invoicesRes.rows;

  const budgetRes = await pool.query(
    `SELECT platform, planned_brl, realized_brl
     FROM media_budgets
     WHERE client_id = $1 AND period_month = $2
     ORDER BY planned_brl DESC`,
    [clientId, month],
  );
  const budgets = budgetRes.rows;

  // Compute stats
  const totalJobs     = jobs.length;
  const doneJobs      = jobs.filter((j) => j.status === 'done').length;
  const approvedJobs  = jobs.filter((j) => j.copy_approved_at).length;
  const approvalRate  = totalJobs > 0 ? Math.round((approvedJobs / totalJobs) * 100) : 0;
  const totalInvoiced = invoices.reduce((s, i) => s + parseFloat(i.amount_brl), 0);
  const totalBudget   = budgets.reduce((s, b) => s + parseFloat(b.planned_brl), 0);
  const totalRealized = budgets.reduce((s, b) => s + parseFloat(b.realized_brl), 0);

  // ── Build PDF ───────────────────────────────────────────────────────────────

  const doc = new PDFDocument({ margin: 48, size: 'A4', info: {
    Title: `Relatório ${monthUpper} — ${client.name}`,
    Author: 'Edro Digital',
  }});

  const chunks: Buffer[] = [];
  doc.on('data', (c) => chunks.push(c));

  await new Promise<void>((resolve) => {
    doc.on('end', resolve);

    // ── Header ────────────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 72).fill(BRAND_COLOR);
    doc.fillColor('white').fontSize(22).font('Helvetica-Bold')
       .text('Edro Digital', 48, 20);
    doc.fontSize(11).font('Helvetica')
       .text(`Relatório Mensal — ${monthUpper}`, 48, 46);

    doc.moveDown(3);

    // ── Client info ───────────────────────────────────────────────────────────
    doc.fillColor(DARK).fontSize(18).font('Helvetica-Bold')
       .text(client.name, { continued: false });
    if (client.segment_primary) {
      doc.fillColor(MUTED).fontSize(11).font('Helvetica')
         .text(`${client.segment_primary}${client.city ? ` • ${client.city}/${client.uf}` : ''}`);
    }
    doc.moveDown(0.5);

    doc.moveTo(48, doc.y).lineTo(doc.page.width - 48, doc.y)
       .strokeColor('#e2e8f0').lineWidth(1).stroke();
    doc.moveDown(0.5);

    // ── Summary cards ─────────────────────────────────────────────────────────
    const cardY = doc.y;
    const cardW = (doc.page.width - 96 - 16 * 3) / 4;

    const cards = [
      { label: 'Jobs no mês', value: String(totalJobs), color: DARK },
      { label: 'Concluídos', value: String(doneJobs), color: SUCCESS },
      { label: 'Taxa aprovação', value: `${approvalRate}%`, color: approvalRate >= 70 ? SUCCESS : WARNING },
      { label: 'Faturado', value: formatBrl(totalInvoiced), color: DARK },
    ];

    cards.forEach((card, i) => {
      const x = 48 + i * (cardW + 16);
      doc.rect(x, cardY, cardW, 56).fill(LIGHT_BG).stroke('#e2e8f0');
      doc.fillColor(MUTED).fontSize(8).font('Helvetica')
         .text(card.label.toUpperCase(), x + 10, cardY + 10, { width: cardW - 20 });
      doc.fillColor(card.color).fontSize(16).font('Helvetica-Bold')
         .text(card.value, x + 10, cardY + 26, { width: cardW - 20 });
    });

    doc.y = cardY + 72;

    // ── Jobs ──────────────────────────────────────────────────────────────────
    if (jobs.length > 0) {
      doc.fillColor(DARK).fontSize(13).font('Helvetica-Bold').text('Jobs do Mês');
      doc.moveDown(0.3);

      const colW = [240, 90, 90, 80];
      const rowH = 20;
      const tableX = 48;
      let ty = doc.y;

      // Header row
      doc.rect(tableX, ty, doc.page.width - 96, rowH).fill('#f1f5f9');
      doc.fillColor(MUTED).fontSize(8).font('Helvetica-Bold');
      ['Título', 'Status', 'Entrega', 'Aprovação'].forEach((h, i) => {
        const x = tableX + colW.slice(0, i).reduce((a, b) => a + b, 0);
        doc.text(h, x + 6, ty + 6, { width: colW[i] - 8 });
      });
      ty += rowH;

      jobs.slice(0, 20).forEach((job, idx) => {
        if (ty > doc.page.height - 80) { doc.addPage(); ty = 48; }
        if (idx % 2 === 0) doc.rect(tableX, ty, doc.page.width - 96, rowH).fill('white');

        doc.fillColor(DARK).fontSize(8).font('Helvetica')
           .text(job.title ?? '—', tableX + 6, ty + 6, { width: colW[0] - 8, ellipsis: true });
        doc.text(statusLabel(job.status), tableX + colW[0] + 6, ty + 6, { width: colW[1] - 8 });
        doc.text(formatDate(job.due_at), tableX + colW[0] + colW[1] + 6, ty + 6, { width: colW[2] - 8 });
        const approved = job.copy_approved_at ? '✓' : '—';
        doc.fillColor(job.copy_approved_at ? SUCCESS : MUTED)
           .text(approved, tableX + colW[0] + colW[1] + colW[2] + 6, ty + 6, { width: colW[3] - 8 });
        ty += rowH;
      });

      doc.y = ty + 12;
    }

    // ── Invoices ──────────────────────────────────────────────────────────────
    if (invoices.length > 0) {
      if (doc.y > doc.page.height - 120) doc.addPage();
      doc.fillColor(DARK).fontSize(13).font('Helvetica-Bold').text('Financeiro');
      doc.moveDown(0.3);

      invoices.forEach((inv) => {
        const isPaid = inv.status === 'paid';
        doc.fillColor(MUTED).fontSize(9).font('Helvetica')
           .text(`${inv.description}  `, { continued: true });
        doc.fillColor(isPaid ? SUCCESS : WARNING).font('Helvetica-Bold')
           .text(`${formatBrl(parseFloat(inv.amount_brl))}  `, { continued: true });
        doc.fillColor(isPaid ? SUCCESS : WARNING).font('Helvetica')
           .text(isPaid ? `Pago em ${formatDate(inv.paid_at)}` : `Vence ${formatDate(inv.due_date)}`);
      });

      doc.moveDown(0.5);
    }

    // ── Media Budgets ─────────────────────────────────────────────────────────
    if (budgets.length > 0) {
      if (doc.y > doc.page.height - 120) doc.addPage();
      doc.fillColor(DARK).fontSize(13).font('Helvetica-Bold').text('Budget de Mídia');
      doc.moveDown(0.3);

      budgets.forEach((b) => {
        const planned  = parseFloat(b.planned_brl);
        const realized = parseFloat(b.realized_brl);
        const pct      = planned > 0 ? Math.round((realized / planned) * 100) : 0;
        const barW     = 200;
        const fillW    = Math.min(barW, Math.round((pct / 100) * barW));
        const barColor = pct > 90 ? '#dc2626' : pct > 70 ? WARNING : SUCCESS;

        doc.fillColor(DARK).fontSize(9).font('Helvetica-Bold')
           .text(b.platform.replace('_', ' ').toUpperCase(), { continued: true });
        doc.fillColor(MUTED).font('Helvetica')
           .text(`  ${formatBrl(realized)} / ${formatBrl(planned)}  (${pct}%)`, { continued: false });

        const bx = 48, by = doc.y;
        doc.rect(bx, by, barW, 6).fill('#e2e8f0');
        if (fillW > 0) doc.rect(bx, by, fillW, 6).fill(barColor);
        doc.y = by + 12;
      });

      doc.fillColor(MUTED).fontSize(9).font('Helvetica-Bold')
         .text(`Total: ${formatBrl(totalRealized)} / ${formatBrl(totalBudget)}`);
      doc.moveDown(0.5);
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 36;
    doc.moveTo(48, footerY - 8).lineTo(doc.page.width - 48, footerY - 8)
       .strokeColor('#e2e8f0').lineWidth(1).stroke();
    doc.fillColor(MUTED).fontSize(8).font('Helvetica')
       .text(`Gerado por Edro Digital em ${new Date().toLocaleDateString('pt-BR')}`, 48, footerY, {
         width: doc.page.width - 96, align: 'center',
       });

    doc.end();
  });

  return Buffer.concat(chunks);
}
