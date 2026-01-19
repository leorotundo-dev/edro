import fs from 'fs';
import path from 'path';
import { openai, MODEL } from '../openai/client';

const promptPath = path.join(__dirname, '..', '..', 'prompts', 'extractExamStructure.prompt.txt');
const systemPrompt = fs.readFileSync(promptPath, 'utf-8');

export interface ExamBlueprintTopic {
  code: string;
  name: string;
  priority: number;
}

export interface ExamBlueprintDiscipline {
  name: string;
  code: string;
  topics: ExamBlueprintTopic[];
}

export interface ExamBlueprint {
  banca: string;
  orgao?: string;
  cargo?: string;
  disciplinas: ExamBlueprintDiscipline[];
}

export async function extractExamStructureFromHtml(html: string): Promise<ExamBlueprint> {
  const userContent = [
    'Texto do edital (HTML ou texto plano):',
    '```html',
    html.slice(0, 15000),
    '```'
  ].join('\n');

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ],
    temperature: 0.1
  });

  const raw = response.choices[0]?.message?.content ?? '{}';

  try {
    const json = JSON.parse(raw);
    return json as ExamBlueprint;
  } catch (err) {
    console.error('Failed to parse ExamBlueprint JSON:', err);
    console.error('Raw response:', raw);
    throw err;
  }
}
