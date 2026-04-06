/**
 * Jarvis Skills Service — Skill Graph Traversal
 *
 * Carrega os skill files relevantes para uma task específica baseado em:
 *   - plataforma, formato, gatilho, setor do cliente, tipo de data, objetivo
 *
 * Fluxo:
 *   1. Lê os YAML frontmatters de todos os skill files (rápido, sem ler conteúdo)
 *   2. Pontua relevância de cada arquivo para o contexto da task
 *   3. Carrega os N arquivos mais relevantes (por padrão: top 6)
 *   4. Retorna bloco formatado para injeção no P2 Strategist / P2 Prompt Brain
 *
 * O skill graph vive em: docs/jarvis-skills/
 */

import * as fs from 'fs';
import * as path from 'path';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SkillContext {
  platform?: string;
  format?: string;
  trigger?: string;
  clientSegment?: string;
  calendarEventType?: string;    // 'mothers_day' | 'christmas' | 'fathers_day' | 'valentines' | etc.
  sectorKeywords?: string[];     // ex: ['banco', 'fintech', 'financeiro', 'investimento']
  amd?: string;                  // ação de microdesempenho desejada
  objective?: string;            // objetivo da campanha em linguagem livre
  agentType: 'copy' | 'art';
}

export interface LoadedSkill {
  file: string;
  description: string;
  content: string;
  relevanceScore: number;
}

interface SkillFrontmatter {
  description: string;
  tags: string[];
  applies_to: string[];
  priority?: string;
  related?: string[];
}

// ── Config ────────────────────────────────────────────────────────────────────

const SKILLS_DIR = path.resolve(__dirname, '../../../../docs/jarvis-skills');
const MAX_SKILLS_TO_LOAD = 7;         // máximo de skill files por chamada
const MAX_CHARS_PER_SKILL = 4000;     // trunca arquivo muito longo para preservar tokens

// ── YAML frontmatter parser (leve, sem dependência externa) ──────────────────

function parseFrontmatter(content: string): { meta: Partial<SkillFrontmatter>; body: string } {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };

  const yamlBlock = match[1];
  const body = match[2];

  const meta: Partial<SkillFrontmatter> = {};

  // Parse description
  const descMatch = yamlBlock.match(/^description:\s*"(.+?)"\s*$/m);
  if (descMatch) meta.description = descMatch[1];

  // Parse tags array
  const tagsMatch = yamlBlock.match(/^tags:\s*\[(.+?)\]\s*$/m);
  if (tagsMatch) {
    meta.tags = tagsMatch[1].split(',').map(t => t.trim().replace(/^['"]|['"]$/g, ''));
  }

  // Parse applies_to array
  const appliesToMatch = yamlBlock.match(/^applies_to:\s*\[(.+?)\]\s*$/m);
  if (appliesToMatch) {
    meta.applies_to = appliesToMatch[1].split(',').map(t => t.trim().replace(/^['"]|['"]$/g, ''));
  }

  // Parse priority
  const priorityMatch = yamlBlock.match(/^priority:\s*(\S+)\s*$/m);
  if (priorityMatch) meta.priority = priorityMatch[1];

  return { meta, body };
}

// ── Scan: list all skill files recursively ───────────────────────────────────

function scanSkillFiles(dir: string, agentType: 'copy' | 'art'): string[] {
  const results: string[] = [];

  if (!fs.existsSync(dir)) return results;

  const subDir = agentType === 'copy'
    ? path.join(dir, 'copy')
    : path.join(dir, 'arte');

  // Always include master index
  const masterIndex = path.join(dir, 'index.md');
  if (fs.existsSync(masterIndex)) results.push(masterIndex);

  // Recursively find all .md files in the relevant subtree
  function walk(d: string) {
    if (!fs.existsSync(d)) return;
    for (const entry of fs.readdirSync(d)) {
      const full = path.join(d, entry);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else if (entry.endsWith('.md') && entry !== 'index.md') {
        results.push(full);
      } else if (entry === 'index.md' && full !== masterIndex) {
        results.push(full);
      }
    }
  }

  walk(subDir);
  return results;
}

// ── Score: relevance of a skill file to the task context ─────────────────────

function scoreSkillRelevance(
  meta: Partial<SkillFrontmatter>,
  filePath: string,
  ctx: SkillContext
): number {
  let score = 0;

  // Priority bonus
  if (meta.priority === 'critical') score += 30;
  if (meta.priority === 'high') score += 15;

  const tags = (meta.tags ?? []).map(t => t.toLowerCase());
  const appliesTo = (meta.applies_to ?? []).map(t => t.toLowerCase());
  const filePathLower = filePath.toLowerCase();

  // Platform matching
  if (ctx.platform) {
    const p = ctx.platform.toLowerCase();
    if (appliesTo.some(a => a.includes(p) || p.includes(a))) score += 10;
    if (tags.some(t => t.includes(p) || p.includes(t))) score += 5;
  }

  // Calendar event / seasonal date
  if (ctx.calendarEventType) {
    const ev = ctx.calendarEventType.toLowerCase();
    const evKeywords = ev.split(/[_\s]+/);
    if (evKeywords.some(k => tags.includes(k) || filePathLower.includes(k))) score += 25;
    if (filePathLower.includes('data') || tags.includes('seasonal') || tags.includes('emotional')) score += 15;
    // mothers_day specifically
    if (ev.includes('m') && (tags.includes('mothers-day') || filePathLower.includes('mae') || filePathLower.includes('maes'))) score += 20;
  }

  // Sector keywords
  if (ctx.sectorKeywords?.length) {
    for (const kw of ctx.sectorKeywords) {
      const k = kw.toLowerCase();
      if (tags.some(t => t.includes(k))) score += 12;
      if (filePathLower.includes(k)) score += 10;
    }
  }

  // AMD matching
  if (ctx.amd) {
    const amdMap: Record<string, string[]> = {
      salvar: ['save', 'salvar', 'value', 'educational'],
      clicar: ['click', 'clicar', 'cta', 'conversion'],
      compartilhar: ['share', 'compartilhar', 'viral', 'identity'],
      responder: ['comment', 'responder', 'engagement'],
      pedir_proposta: ['conversion', 'lead', 'proposta'],
    };
    const amdTags = amdMap[ctx.amd] ?? [];
    if (amdTags.some(t => tags.includes(t))) score += 8;
  }

  // Trigger matching
  if (ctx.trigger) {
    const trigMap: Record<string, string[]> = {
      G01: ['scarcity', 'urgency', 'escassez'],
      G02: ['authority', 'autoridade', 'credibility'],
      G03: ['social-proof', 'prova-social', 'testimonial'],
      G04: ['reciprocity', 'reciprocidade'],
      G05: ['curiosity', 'curiosidade', 'incomplete-loop'],
      G06: ['identity', 'identidade', 'belonging'],
      G07: ['pain', 'dor', 'loss-aversion'],
    };
    const trigTags = trigMap[ctx.trigger] ?? [];
    if (trigTags.some(t => tags.includes(t))) score += 8;
  }

  // Agent type alignment — copy files score higher for copy agent, arte for art
  if (ctx.agentType === 'copy' && filePathLower.includes('/copy/')) score += 5;
  if (ctx.agentType === 'art' && filePathLower.includes('/arte/')) score += 5;

  // Fundamental files always get a boost
  if (tags.includes('fundamental')) score += 10;

  return score;
}

// ── Load and format skill files ───────────────────────────────────────────────

async function loadSkillFile(filePath: string): Promise<{ description: string; content: string } | null> {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { meta, body } = parseFrontmatter(raw);

    // Truncate very long files to preserve tokens
    const truncatedBody = body.length > MAX_CHARS_PER_SKILL
      ? body.slice(0, MAX_CHARS_PER_SKILL) + '\n\n[... conteúdo truncado para otimizar contexto ...]'
      : body;

    return {
      description: meta.description ?? path.basename(filePath, '.md'),
      content: truncatedBody,
    };
  } catch {
    return null;
  }
}

// ── Main: getRelevantSkills ───────────────────────────────────────────────────

export async function getRelevantSkills(ctx: SkillContext): Promise<string> {
  const files = scanSkillFiles(SKILLS_DIR, ctx.agentType);
  if (!files.length) return '';

  // Score all files
  const scored: Array<{ file: string; score: number; description: string }> = [];
  for (const filePath of files) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const { meta } = parseFrontmatter(raw);
      const score = scoreSkillRelevance(meta, filePath, ctx);
      scored.push({ file: filePath, score, description: meta.description ?? filePath });
    } catch {
      // skip unreadable files
    }
  }

  // Sort by score, take top N
  scored.sort((a, b) => b.score - a.score);
  const topFiles = scored.slice(0, MAX_SKILLS_TO_LOAD).filter(s => s.score > 0);

  if (!topFiles.length) return '';

  // Load content
  const loaded: LoadedSkill[] = [];
  for (const { file, score, description } of topFiles) {
    const result = await loadSkillFile(file);
    if (result) {
      loaded.push({ file, description, content: result.content, relevanceScore: score });
    }
  }

  if (!loaded.length) return '';

  // Format as prompt block
  const lines: string[] = [
    '=== JARVIS SKILL GRAPH — Conhecimento de Craft ===',
    `(${loaded.length} skills carregados para esta task)\n`,
  ];

  for (const skill of loaded) {
    const relativePath = path.relative(SKILLS_DIR, skill.file);
    lines.push(`## [${relativePath}]`);
    lines.push(skill.content);
    lines.push('');
  }

  lines.push('=== FIM DO SKILL GRAPH ===');

  return lines.join('\n');
}

// ── Detect calendar event from text / date context ───────────────────────────

export function detectCalendarEventType(text: string): string | null {
  const t = text.toLowerCase();

  const patterns: Array<{ keywords: string[]; type: string }> = [
    { keywords: ['dia das mães', 'dia das maes', 'mother', 'mãe', 'mae'], type: 'mothers_day' },
    { keywords: ['natal', 'christmas', 'dezembro', 'fim de ano'], type: 'christmas' },
    { keywords: ['dia dos pais', 'father', 'pai'], type: 'fathers_day' },
    { keywords: ['dia dos namorados', 'valentines', 'namorado', 'amor'], type: 'valentines' },
    { keywords: ['ano novo', 'reveillon', 'janeiro', 'new year'], type: 'new_year' },
    { keywords: ['black friday', 'black'], type: 'black_friday' },
    { keywords: ['páscoa', 'pascoa', 'easter'], type: 'easter' },
    { keywords: ['carnaval', 'carnival'], type: 'carnival' },
    { keywords: ['dia das crianças', 'children'], type: 'childrens_day' },
  ];

  for (const { keywords, type } of patterns) {
    if (keywords.some(kw => t.includes(kw))) return type;
  }

  return null;
}

// ── Detect sector keywords from client profile ────────────────────────────────

export function detectSectorKeywords(profile: any): string[] {
  const keywords: string[] = [];
  const text = JSON.stringify(profile ?? {}).toLowerCase();

  const sectorMap: Array<{ match: string[]; keywords: string[] }> = [
    { match: ['banco', 'bank', 'financeiro', 'fintech', 'investimento', 'crédito', 'credito', 'seguro', 'pagamento'], keywords: ['financeiro', 'banco', 'fintech'] },
    { match: ['saúde', 'saude', 'médico', 'medico', 'clínica', 'clinica', 'hospital', 'farmácia', 'farmacia'], keywords: ['saude'] },
    { match: ['educação', 'educacao', 'escola', 'curso', 'ensino', 'faculdade', 'universidade', 'edtech'], keywords: ['educacao'] },
    { match: ['imóvel', 'imovel', 'imobiliário', 'imobiliario', 'construtora', 'loteamento'], keywords: ['imobiliario'] },
    { match: ['tecnologia', 'software', 'startup', 'saas', 'tech', 'app', 'plataforma'], keywords: ['tecnologia', 'b2b'] },
    { match: ['varejo', 'retail', 'loja', 'e-commerce', 'ecommerce', 'produto'], keywords: ['varejo'] },
    { match: ['alimentação', 'alimentacao', 'restaurante', 'food', 'gastronomia'], keywords: ['alimentacao'] },
  ];

  for (const { match, keywords: kws } of sectorMap) {
    if (match.some(m => text.includes(m))) {
      keywords.push(...kws);
    }
  }

  return [...new Set(keywords)];
}
