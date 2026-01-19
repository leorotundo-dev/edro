import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { enforceIaCallLimit } from '../middleware/planLimits';
import { query } from '../db';
import { speechToText, textToSpeech } from '../services/ai/openaiService';

/**
 * Rotas de acessibilidade (TTS/STT e modos de foco)
 * - GET  /accessibility/modes          -> modos disponíveis
 * - POST /accessibility/tts            -> gera áudio (stub base64) a partir de texto
 * - POST /accessibility/stt            -> transcreve áudio (stub)
 */
export default async function accessibilityRoutes(app: FastifyInstance) {
  // Modos e presets de acessibilidade
  app.get('/accessibility/modes', async (_req, reply) => {
    return reply.send({
      success: true,
      data: {
        tts: true,
        stt: true,
        modos: [
          { id: 'tdah', label: 'Modo TDAH', features: ['contrast-high', 'font-lexend', 'focus-timers'] },
          { id: 'dislexia', label: 'Modo Dislexia', features: ['font-opendyslexic', 'spacing-120', 'tts-default'] },
          { id: 'baixa-visao', label: 'Modo Baixa Visão', features: ['contrast-high', 'font-xl', 'spacing-140'] },
          { id: 'ansiedade', label: 'Modo Ansiedade', features: ['motion-reduced', 'feedback-soft', 'breathing-prompts'] },
        ],
      },
    });
  });

  // Preferências do usuário (get)
  app.get('/accessibility/settings', async (request, reply) => {
    const anyReq: any = request;
    try {
      await anyReq.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Não autorizado.' });
    }
    const userId = (anyReq.user as { sub: string }).sub;

    const { rows } = await query(`
      SELECT * FROM accessibility_settings WHERE user_id = $1
    `, [userId]);

    const settings = rows[0] || {
      user_id: userId,
      mode: 'default',
      tts_voice: null,
      tts_speed: 1,
      stt_language: 'pt-BR',
      font_size: 'md',
      contrast_mode: 'normal',
      motion_reduced: false,
    };

    return reply.send({ success: true, data: settings });
  });

  // Preferências do usuário (upsert)
  app.post('/accessibility/settings', async (request, reply) => {
    const anyReq: any = request;
    try {
      await anyReq.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Não autorizado.' });
    }
    const userId = (anyReq.user as { sub: string }).sub;

    const bodySchema = z.object({
      mode: z.enum(['default', 'tdah', 'dislexia', 'baixa-visao', 'ansiedade']).optional(),
      tts_voice: z.string().optional(),
      tts_speed: z.number().min(0.5).max(2).optional(),
      stt_language: z.string().optional(),
      font_size: z.enum(['sm', 'md', 'lg', 'xl']).optional(),
      contrast_mode: z.enum(['normal', 'high']).optional(),
      motion_reduced: z.boolean().optional(),
    });

    const body = bodySchema.parse(request.body);

    const settings = {
      mode: body.mode ?? 'default',
      tts_voice: body.tts_voice ?? null,
      tts_speed: body.tts_speed ?? 1,
      stt_language: body.stt_language ?? 'pt-BR',
      font_size: body.font_size ?? 'md',
      contrast_mode: body.contrast_mode ?? 'normal',
      motion_reduced: body.motion_reduced ?? false,
    };

    await query(
      `
        INSERT INTO accessibility_settings (
          user_id, mode, tts_voice, tts_speed, stt_language,
          font_size, contrast_mode, motion_reduced, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
          mode = EXCLUDED.mode,
          tts_voice = EXCLUDED.tts_voice,
          tts_speed = EXCLUDED.tts_speed,
          stt_language = EXCLUDED.stt_language,
          font_size = EXCLUDED.font_size,
          contrast_mode = EXCLUDED.contrast_mode,
          motion_reduced = EXCLUDED.motion_reduced,
          updated_at = NOW()
      `,
      [
        userId,
        settings.mode,
        settings.tts_voice,
        settings.tts_speed,
        settings.stt_language,
        settings.font_size,
        settings.contrast_mode,
        settings.motion_reduced,
      ]
    );

    return reply.status(201).send({ success: true, data: settings });
  });

  // TTS (stub simples: devolve base64 do texto)
  app.post('/accessibility/tts', { preHandler: enforceIaCallLimit }, async (req, reply) => {
    const bodySchema = z.object({
      texto: z.string().min(3),
      voz: z.string().optional(),
      velocidade: z.number().min(0.5).max(2).optional(),
      idioma: z.string().optional(),
    });

    const body = bodySchema.parse(req.body);

    const audio = await textToSpeech({
      texto: body.texto,
      voz: body.voz,
      velocidade: body.velocidade,
      formato: 'mp3',
    });

    return reply.send({
      success: true,
      data: {
        mime: audio.mime,
        base64: audio.base64,
        meta: {
          voz: body.voz || 'default',
          velocidade: body.velocidade || 1,
          idioma: body.idioma || 'pt-BR',
        },
      },
    });
  });

  // STT
  app.post('/accessibility/stt', { preHandler: enforceIaCallLimit }, async (req, reply) => {
    const bodySchema = z.object({
      audioBase64: z.string().min(10),
      idioma: z.string().optional(),
    });

    const body = bodySchema.parse(req.body);

    const transcript = await speechToText({
      audioBase64: body.audioBase64,
      idioma: body.idioma,
    });

    return reply.send({
      success: true,
      data: {
        transcript,
        idioma: body.idioma || 'pt-BR',
      },
    });
  });
}
