/**
 * Question Generator Service
 * 
 * Serviço para geração e análise de questões usando IA
 */

import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { MonitoringService } from '../../middleware/monitoring';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================
// TIPOS
// ============================================

export interface QuestionGenerationParams {
  topic: string;
  discipline: string;
  examBoard: 'CESPE' | 'FCC' | 'FGV' | 'VUNESP' | 'outro';
  difficulty: 1 | 2 | 3 | 4 | 5;
  context?: string;
}

export interface GeneratedQuestion {
  question_text: string;
  question_type: 'multiple_choice' | 'true_false';
  alternatives: Array<{
    letter: string;
    text: string;
    is_correct: boolean;
  }>;
  correct_answer: string;
  explanation: string;
  concepts: string[];
  cognitive_level: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
  tags: string[];
  estimated_time_seconds: number;
  difficulty_score: number;
  references: string[];
}

export interface QuestionAnalysis {
  quality_score: number;
  difficulty_level: number;
  difficulty_justification: string;
  cognitive_level: string;
  cognitive_justification: string;
  concepts: Array<{
    name: string;
    importance: 'high' | 'medium' | 'low';
  }>;
  tags: {
    topic: string;
    subtopics: string[];
    question_type: string;
    characteristics: string[];
  };
  distractor_analysis: {
    quality: 'good' | 'average' | 'poor';
    most_tempting: string;
    common_errors_tested: string[];
  };
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  exam_board_style: {
    detected: string;
    adequacy: 'high' | 'medium' | 'low';
    recommendations: string;
  };
  estimated_time_seconds: number;
  error_probability: number;
  semantic_similarity_topics: string[];
}

// ============================================
// GERAÇÃO DE QUESTÕES
// ============================================

/**
 * Gera uma questão usando IA
 */
export async function generateQuestion(
  params: QuestionGenerationParams
): Promise<GeneratedQuestion> {
  console.log(`[ai-question] Gerando questão: ${params.topic} (${params.examBoard}, dif: ${params.difficulty})`);

  // Carregar prompt
  const promptPath = path.join(__dirname, '../../../ai/prompts/generate_question.prompt.txt');
  let promptTemplate = fs.readFileSync(promptPath, 'utf-8');

  // Substituir variáveis
  promptTemplate = promptTemplate
    .replace('{topic}', params.topic)
    .replace('{discipline}', params.discipline)
    .replace('{examBoard}', params.examBoard)
    .replace('{difficulty}', params.difficulty.toString())
    .replace('{context}', params.context || 'Nenhum contexto adicional fornecido');

  try {
    // Chamar OpenAI
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em elaboração de questões para concursos públicos brasileiros. Sempre retorne apenas JSON válido, sem texto adicional.',
        },
        {
          role: 'user',
          content: promptTemplate,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    MonitoringService.trackIaUsage({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      type: 'completion',
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('OpenAI retornou resposta vazia');
    }

    // Parse JSON
    const question = JSON.parse(content) as GeneratedQuestion;

    // Validar campos obrigatórios
    if (!question.question_text || !question.alternatives || !question.correct_answer) {
      throw new Error('Questão gerada está incompleta');
    }

    console.log(`[ai-question] ✅ Questão gerada com sucesso`);
    console.log(`[ai-question] Tipo: ${question.question_type}, Alternativas: ${question.alternatives.length}`);

    return question;
  } catch (error: any) {
    console.error('[ai-question] Erro ao gerar questão:', error.message);
    throw new Error(`Erro ao gerar questão: ${error.message}`);
  }
}

/**
 * Gera múltiplas questões em batch
 */
export async function generateQuestionBatch(
  params: QuestionGenerationParams,
  count: number = 5
): Promise<GeneratedQuestion[]> {
  console.log(`[ai-question] Gerando batch de ${count} questões`);

  const questions: GeneratedQuestion[] = [];
  const errors: string[] = [];

  for (let i = 0; i < count; i++) {
    try {
      const question = await generateQuestion(params);
      questions.push(question);
      console.log(`[ai-question] Questão ${i + 1}/${count} gerada`);
    } catch (error: any) {
      console.error(`[ai-question] Erro na questão ${i + 1}:`, error.message);
      errors.push(`Questão ${i + 1}: ${error.message}`);
    }

    // Pequeno delay para evitar rate limit
    if (i < count - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`[ai-question] ✅ Batch concluído: ${questions.length}/${count} questões geradas`);
  if (errors.length > 0) {
    console.warn(`[ai-question] ⚠️  ${errors.length} erros:`, errors);
  }

  return questions;
}

// ============================================
// ANÁLISE DE QUESTÕES
// ============================================

/**
 * Analisa uma questão existente
 */
export async function analyzeQuestion(
  questionText: string,
  alternatives: Array<{ letter: string; text: string; is_correct: boolean }>,
  correctAnswer: string
): Promise<QuestionAnalysis> {
  console.log(`[ai-question] Analisando questão...`);

  // Carregar prompt
  const promptPath = path.join(__dirname, '../../../ai/prompts/analyze_question.prompt.txt');
  let promptTemplate = fs.readFileSync(promptPath, 'utf-8');

  // Formatar alternativas
  const alternativesText = alternatives
    .map(alt => `${alt.letter.toUpperCase()}) ${alt.text} ${alt.is_correct ? '(CORRETA)' : ''}`)
    .join('\n');

  // Substituir variáveis
  promptTemplate = promptTemplate
    .replace('{questionText}', questionText)
    .replace('{alternatives}', alternativesText)
    .replace('{correctAnswer}', correctAnswer);

  try {
    // Chamar OpenAI
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em análise de qualidade de questões. Sempre retorne apenas JSON válido.',
        },
        {
          role: 'user',
          content: promptTemplate,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    MonitoringService.trackIaUsage({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      type: 'completion',
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('OpenAI retornou resposta vazia');
    }

    // Parse JSON
    const analysis = JSON.parse(content) as QuestionAnalysis;

    console.log(`[ai-question] ✅ Análise concluída`);
    console.log(`[ai-question] Qualidade: ${analysis.quality_score}/10, Dificuldade: ${analysis.difficulty_level}/5`);

    return analysis;
  } catch (error: any) {
    console.error('[ai-question] Erro ao analisar questão:', error.message);
    throw new Error(`Erro ao analisar questão: ${error.message}`);
  }
}

// ============================================
// HELPERS
// ============================================

/**
 * Valida se uma questão gerada está completa
 */
export function validateGeneratedQuestion(question: GeneratedQuestion): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!question.question_text || question.question_text.length < 10) {
    errors.push('Enunciado muito curto ou ausente');
  }

  if (!question.alternatives || question.alternatives.length < 2) {
    errors.push('Número insuficiente de alternativas');
  }

  const correctAlternatives = question.alternatives.filter(a => a.is_correct);
  if (correctAlternatives.length !== 1) {
    errors.push(`Deve haver exatamente 1 alternativa correta, encontradas: ${correctAlternatives.length}`);
  }

  if (!question.correct_answer) {
    errors.push('Resposta correta não especificada');
  }

  if (!question.explanation || question.explanation.length < 20) {
    errors.push('Explicação muito curta ou ausente');
  }

  if (!question.concepts || question.concepts.length === 0) {
    errors.push('Nenhum conceito identificado');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Formata questão para exibição
 */
export function formatQuestionForDisplay(question: GeneratedQuestion): string {
  let output = `\n📝 QUESTÃO\n`;
  output += `${'-'.repeat(60)}\n`;
  output += `${question.question_text}\n\n`;

  output += `Alternativas:\n`;
  question.alternatives.forEach(alt => {
    const marker = alt.is_correct ? '✓' : ' ';
    output += `  [${marker}] ${alt.letter.toUpperCase()}) ${alt.text}\n`;
  });

  output += `\nResposta: ${question.correct_answer.toUpperCase()}\n`;
  output += `\n💡 Explicação:\n${question.explanation}\n`;
  output += `\n📚 Conceitos: ${question.concepts.join(', ')}\n`;
  output += `⏱️  Tempo estimado: ${question.estimated_time_seconds}s\n`;
  output += `📊 Dificuldade: ${question.difficulty_score}/5\n`;

  return output;
}
