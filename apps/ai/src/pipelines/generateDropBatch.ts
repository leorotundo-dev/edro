import fs from 'fs';
import path from 'path';
import { openai, MODEL } from '../openai/client';

const promptPath = path.join(__dirname, '..', '..', 'prompts', 'drop_batch.prompt.txt');
const systemPrompt = fs.readFileSync(promptPath, 'utf-8');

export interface DropInputContext {
  disciplina: string;
  topicCode: string;
  topicName: string;
  banca?: string;
  nivel?: string;
  ragContext?: string; // texto consolidado vindo de rag_blocks, se houver
}

export interface Drop {
  tipo: string;
  dificuldade: number;
  conteudo: any;
}

export interface DropBatchResult {
  drops: Drop[];
}

export async function generateDropBatch(input: DropInputContext): Promise<DropBatchResult> {
  const userContent = JSON.stringify(input, null, 2);

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ],
    temperature: 0.4
  });

  const raw = response.choices[0]?.message?.content ?? '{}';

  try {
    const json = JSON.parse(raw);
    return json as DropBatchResult;
  } catch (err) {
    console.error('Failed to parse DropBatchResult JSON:', err);
    console.error('Raw response:', raw);
    throw err;
  }
}
