import type { WorkflowStage } from '@edro/shared/workflow';
import { getStageUI } from '@edro/shared/workflow';

type StageChangeEmailParams = {
  briefingTitle: string;
  clientName?: string | null;
  fromStage: WorkflowStage;
  toStage: WorkflowStage;
  updatedBy?: string | null;
  briefingId: string;
  baseUrl?: string;
};

const STAGE_EMOJI: Record<string, string> = {
  briefing: '📋',
  iclips_in: '📥',
  alinhamento: '🤝',
  copy_ia: '🤖',
  aprovacao: '✅',
  producao: '🎨',
  revisao: '🔍',
  entrega: '📦',
  iclips_out: '📤',
};

function stageLabel(stage: WorkflowStage): string {
  return getStageUI(stage)?.label ?? stage;
}

export function buildStageChangeEmail(params: StageChangeEmailParams) {
  const fromLabel = stageLabel(params.fromStage);
  const toLabel = stageLabel(params.toStage);
  const emoji = STAGE_EMOJI[params.toStage] || '🔔';
  const briefingUrl = params.baseUrl
    ? `${params.baseUrl}/edro/${params.briefingId}`
    : null;

  const subject = `[Edro] ${emoji} "${params.briefingTitle}" avançou para ${toLabel}`;

  const textLines = [
    `Briefing: ${params.briefingTitle}`,
    params.clientName ? `Cliente: ${params.clientName}` : null,
    `Transição: ${fromLabel} → ${toLabel}`,
    params.updatedBy ? `Atualizado por: ${params.updatedBy}` : null,
    briefingUrl ? `\nAcessar briefing: ${briefingUrl}` : null,
  ].filter(Boolean);

  const text = textLines.join('\n');

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
  <div style="border-bottom: 3px solid #6366f1; padding-bottom: 16px; margin-bottom: 24px;">
    <h2 style="margin: 0; font-size: 18px; color: #6366f1;">Edro — Atualização de Briefing</h2>
  </div>

  <p style="font-size: 15px; line-height: 1.5; margin-bottom: 8px;">
    O briefing <strong>"${escapeHtml(params.briefingTitle)}"</strong> avançou de etapa:
  </p>

  <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <table style="width: 100%; border-collapse: collapse;">
      ${params.clientName ? `<tr><td style="padding: 4px 0; color: #666; width: 120px;">Cliente</td><td style="padding: 4px 0; font-weight: 600;">${escapeHtml(params.clientName)}</td></tr>` : ''}
      <tr>
        <td style="padding: 4px 0; color: #666; width: 120px;">De</td>
        <td style="padding: 4px 0;"><span style="background: #e5e7eb; border-radius: 4px; padding: 2px 8px; font-size: 13px;">${escapeHtml(fromLabel)}</span></td>
      </tr>
      <tr>
        <td style="padding: 4px 0; color: #666; width: 120px;">Para</td>
        <td style="padding: 4px 0;"><span style="background: #c7d2fe; border-radius: 4px; padding: 2px 8px; font-size: 13px; font-weight: 600;">${emoji} ${escapeHtml(toLabel)}</span></td>
      </tr>
      ${params.updatedBy ? `<tr><td style="padding: 4px 0; color: #666; width: 120px;">Atualizado por</td><td style="padding: 4px 0;">${escapeHtml(params.updatedBy)}</td></tr>` : ''}
    </table>
  </div>

  ${briefingUrl ? `<a href="${briefingUrl}" style="display: inline-block; background: #6366f1; color: #fff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 8px;">Abrir Briefing</a>` : ''}

  <p style="font-size: 12px; color: #999; margin-top: 32px; border-top: 1px solid #eee; padding-top: 12px;">
    Notificação automática do Edro — Edro.Digital
  </p>
</body>
</html>`.trim();

  return { subject, text, html };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
