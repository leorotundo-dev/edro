import { extractBlueprintStructure } from './openaiService';

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<(br|p|div|li|h[1-6]|tr|td|th|ul|ol)[^>]*>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr|td|th|ul|ol)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extração de blueprint a partir de HTML de edital.
 * Converte o HTML para texto simples e usa a IA para gerar a estrutura.
 */
export async function extractBlueprint(rawHtml: string) {
  const editalText = htmlToText(rawHtml);

  const aiResult = await extractBlueprintStructure({
    editalText,
    concurso: 'Concurso',
  });

  const disciplinas = (aiResult.disciplinas || []).map((d, idx) => ({
    name: d.nome,
    topics: (d.topicos || []).map((t, tIdx) => ({
      code: `TOP-${idx + 1}-${tIdx + 1}`,
      name: t.nome,
      subtopics: t.subtopicos || [],
    })),
  }));

  return {
    banca: (aiResult as any).banca || 'Desconhecida',
    cargo: (aiResult as any).cargo || null,
    disciplinas,
    topics: disciplinas.flatMap(d => d.topics),
    priorities: null,
  };
}
