import { parse } from 'csv-parse/sync';
import {
  createBriefing,
  getOrCreateClientByName,
  ensureBriefingStages,
} from '../repositories/edroBriefingRepository';
import { WORKFLOW_STAGES } from '../utils/workflow';

export type CSVRow = {
  client_name: string;
  title: string;
  due_date?: string;
  traffic_owner?: string;
  meeting_url?: string;
  briefing_text?: string;
  deliverables?: string;
  channels?: string;
  references?: string;
  notes?: string;
  [key: string]: any;
};

export type ImportResult = {
  success: boolean;
  briefingId?: string;
  error?: string;
  row: number;
};

/**
 * Parse CSV content and return array of rows
 */
export function parseCSV(content: string): CSVRow[] {
  try {
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });
    return records;
  } catch (error) {
    throw new Error(`Erro ao fazer parse do CSV: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

/**
 * Validate CSV row
 */
export function validateRow(row: CSVRow, rowNumber: number): { valid: boolean; error?: string } {
  if (!row.client_name || row.client_name.trim() === '') {
    return { valid: false, error: `Linha ${rowNumber}: campo 'client_name' é obrigatório` };
  }
  if (!row.title || row.title.trim() === '') {
    return { valid: false, error: `Linha ${rowNumber}: campo 'title' é obrigatório` };
  }
  return { valid: true };
}

/**
 * Parse date from CSV (supports multiple formats)
 */
export function parseCSVDate(dateStr?: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;

  // Try ISO format first
  let date = new Date(dateStr);
  if (!Number.isNaN(date.getTime())) return date;

  // Try Brazilian format: DD/MM/YYYY
  const brMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    date = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day));
    if (!Number.isNaN(date.getTime())) return date;
  }

  // Try US format: MM/DD/YYYY
  const usMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    date = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day));
    if (!Number.isNaN(date.getTime())) return date;
  }

  return null;
}

/**
 * Build briefing payload from CSV row
 */
export function buildBriefingPayload(row: CSVRow): Record<string, any> {
  const payload: Record<string, any> = {};

  if (row.briefing_text) payload.briefingText = row.briefing_text;
  if (row.deliverables) payload.deliverables = row.deliverables;
  if (row.channels) payload.channels = row.channels;
  if (row.references) payload.references = row.references;
  if (row.notes) payload.notes = row.notes;

  // Include any additional custom fields
  for (const [key, value] of Object.entries(row)) {
    if (
      !['client_name', 'title', 'due_date', 'traffic_owner', 'meeting_url', 'briefing_text', 'deliverables', 'channels', 'references', 'notes'].includes(
        key
      )
    ) {
      payload[key] = value;
    }
  }

  return payload;
}

/**
 * Import a single CSV row as a briefing
 */
export async function importRow(
  row: CSVRow,
  rowNumber: number,
  createdBy?: string
): Promise<ImportResult> {
  try {
    // Validate row
    const validation = validateRow(row, rowNumber);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        row: rowNumber,
      };
    }

    // Get or create client
    const client = await getOrCreateClientByName(row.client_name.trim());

    // Parse due date
    const dueAt = parseCSVDate(row.due_date);

    // Build payload
    const payload = buildBriefingPayload(row);

    // Create briefing
    const briefing = await createBriefing({
      clientId: client.id,
      title: row.title.trim(),
      payload,
      createdBy: createdBy || null,
      trafficOwner: row.traffic_owner?.trim() || null,
      meetingUrl: row.meeting_url?.trim() || null,
      dueAt,
      source: 'csv_import',
    });

    // Create workflow stages
    await ensureBriefingStages(briefing.id);

    return {
      success: true,
      briefingId: briefing.id,
      row: rowNumber,
    };
  } catch (error) {
    return {
      success: false,
      error: `Linha ${rowNumber}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      row: rowNumber,
    };
  }
}

/**
 * Import multiple rows from CSV
 */
export async function importCSV(
  content: string,
  createdBy?: string
): Promise<{
  total: number;
  successful: number;
  failed: number;
  results: ImportResult[];
}> {
  const rows = parseCSV(content);
  const results: ImportResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const result = await importRow(rows[i], i + 2, createdBy); // +2 because row 1 is header
    results.push(result);
  }

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return {
    total: rows.length,
    successful,
    failed,
    results,
  };
}
