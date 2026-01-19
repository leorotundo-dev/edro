import fs from 'fs';
import path from 'path';
import { openai, MODEL } from '../openai/client';

const promptPath = path.join(
  __dirname,
  '..',
  '..',
  'prompts',
  'summarizeRAG.prompt.txt'
);
const systemPrompt = fs.readFileSync(promptPath, 'utf-8');

export interface SummarizeRAGInput {
  disciplina: string;
  topicCode: string;
  topicName: string;
  banca?: string;
  sourceUrl: string;
  content: string;
}

export interface SummarizeRAGResult {
  summary: string;
}

export async function summarizeRAGBlock(
  input: SummarizeRAGInput
): Promise<SummarizeRAGResult> {
  const userContent = [
    `Disciplina: ${input.disciplina}`,
    `Tópico: ${input.topicCode} - ${input.topicName}`,
    input.banca ? `Banca: ${input.banca}` : '',
    `Fonte: ${input.sourceUrl}`,
    '',
    'Conteúdo do artigo:',
    input.content.slice(0, 15000)
  ].join('\n');

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ],
    temperature: 0.3
  });

  const summary = response.choices[0]?.message?.content?.trim() ?? '';

  return { summary };
}
