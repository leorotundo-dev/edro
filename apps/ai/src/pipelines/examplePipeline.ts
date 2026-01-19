import { AI_ENV } from '../env';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: AI_ENV.OPENAI_API_KEY,
  baseURL: AI_ENV.OPENAI_BASE_URL
});

export interface ExamplePipelineInput {
  text: string;
}

export interface ExamplePipelineOutput {
  summary: string;
}

export async function runExamplePipeline(
  input: ExamplePipelineInput
): Promise<ExamplePipelineOutput> {
  const systemPrompt = `
Você é um especialista em concursos públicos.
Resuma o texto a seguir em no máximo 3 frases, linguagem simples.
  `.trim();

  const userPrompt = input.text.slice(0, 8000);

  const completion = await client.chat.completions.create({
    model: AI_ENV.OPENAI_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.4
  });

  const summary = completion.choices[0]?.message?.content?.trim() || '';

  return { summary };
}
