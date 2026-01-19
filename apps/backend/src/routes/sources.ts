import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createReadStream } from 'fs';
import { CreditsService } from '../services/creditsService';
import { UserSourcesService, UserSourceType } from '../services/userSourcesService';
import { UserStorageService } from '../services/userStorageService';
import { JobService } from '../services/jobService';

const MB = 1024 * 1024;

function resolveUserId(request: FastifyRequest) {
  const anyReq: any = request;
  return anyReq.user?.id || anyReq.user?.sub || null;
}

function detectUploadType(params: {
  explicit?: string | null;
  contentType?: string | null;
  fileName?: string | null;
}): UserSourceType {
  const explicit = String(params.explicit || '').trim().toLowerCase();
  if (explicit === 'pdf' || explicit === 'image' || explicit === 'audio' || explicit === 'video') {
    return explicit as UserSourceType;
  }
  const contentType = String(params.contentType || '').toLowerCase();
  if (contentType.includes('pdf')) return 'pdf';
  if (contentType.startsWith('image/')) return 'image';
  if (contentType.startsWith('audio/')) return 'audio';
  if (contentType.startsWith('video/')) return 'video';
  const fileName = String(params.fileName || '').toLowerCase();
  if (fileName.endsWith('.pdf')) return 'pdf';
  if (fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) return 'image';
  if (fileName.endsWith('.mp3') || fileName.endsWith('.wav') || fileName.endsWith('.m4a')) return 'audio';
  if (fileName.endsWith('.mp4') || fileName.endsWith('.mov')) return 'video';
  return 'upload';
}

export default async function sourcesRoutes(app: FastifyInstance) {
  app.post(
    '/sources/presign',
    async (
      request: FastifyRequest<{
        Body: {
          file_name?: string;
          content_type?: string;
          size_bytes?: number;
          title?: string;
          edital_id?: string;
          type?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const userId = resolveUserId(request);
      if (!userId) {
        return reply.status(401).send({ success: false, error: 'Usuario nao autenticado' });
      }

      const sizeBytes = Number(request.body?.size_bytes || 0);
      if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
        return reply.status(400).send({ success: false, error: 'Tamanho invalido' });
      }

      const actionResult = await CreditsService.consumeAction({
        userId,
        count: 1,
        reason: 'source_upload',
        metadata: { size_bytes: sizeBytes },
      });
      if (!actionResult.allowed) {
        return reply.status(402).send({ success: false, error: 'Limite mensal atingido' });
      }

      const usage = await CreditsService.getUserUsageSummary(userId);
      const storageUsed = await UserSourcesService.getUserStorageUsageBytes(userId);
      const storageLimit = usage.plan.storage_limit_mb;
      const uploadLimit = usage.plan.upload_limit_mb;

      if (uploadLimit && sizeBytes > uploadLimit * MB) {
        return reply.status(413).send({
          success: false,
          error: 'Upload excede limite do plano',
        });
      }

      if (storageLimit && storageUsed + sizeBytes > storageLimit * MB) {
        return reply.status(413).send({
          success: false,
          error: 'Armazenamento excede limite do plano',
        });
      }

      const sourceType = detectUploadType({
        explicit: request.body?.type,
        contentType: request.body?.content_type,
        fileName: request.body?.file_name,
      });

      const source = await UserSourcesService.createUserSource({
        userId,
        editalId: request.body?.edital_id ?? null,
        type: sourceType,
        status: 'pending',
        title: request.body?.title ?? null,
        fileName: request.body?.file_name ?? null,
        contentType: request.body?.content_type ?? null,
        sizeBytes,
      });

      if (!UserStorageService.s3Enabled) {
        return reply.status(500).send({
          success: false,
          error: 'S3 nao configurado',
        });
      }

      const key = UserStorageService.buildUserSourceKey({
        userId,
        sourceId: source.id,
        fileName: request.body?.file_name,
      });

      const upload = await UserStorageService.createUploadUrl({
        key,
        contentType: request.body?.content_type ?? null,
      });

      await UserSourcesService.updateUserSource({
        id: source.id,
        userId,
        patch: {
          s3Key: key,
          status: 'pending',
        },
      });

      return reply.send({
        success: true,
        data: {
          source_id: source.id,
          upload_url: upload.uploadUrl,
          headers: upload.headers,
        },
      });
    }
  );

  app.post(
    '/sources/complete',
    async (
      request: FastifyRequest<{ Body: { source_id?: string } }>,
      reply: FastifyReply
    ) => {
      const userId = resolveUserId(request);
      if (!userId) {
        return reply.status(401).send({ success: false, error: 'Usuario nao autenticado' });
      }
      const sourceId = String(request.body?.source_id || '').trim();
      if (!sourceId) {
        return reply.status(400).send({ success: false, error: 'source_id obrigatorio' });
      }
      const source = await UserSourcesService.getUserSourceById(sourceId, userId);
      if (!source) {
        return reply.status(404).send({ success: false, error: 'Fonte nao encontrada' });
      }

      const jobId = await JobService.createJob({
        name: `Process source ${sourceId}`,
        type: 'process_user_source',
        data: {
          sourceId,
        },
        priority: 7,
        maxAttempts: 2,
      });

      await UserSourcesService.updateUserSource({
        id: sourceId,
        userId,
        patch: {
          status: 'uploaded',
          jobId,
        },
      });

      return reply.send({
        success: true,
        data: { source_id: sourceId, job_id: jobId },
      });
    }
  );

  app.post(
    '/sources',
    async (
      request: FastifyRequest<{
        Body: {
          type?: string;
          title?: string;
          url?: string;
          text?: string;
          edital_id?: string;
          metadata?: Record<string, any>;
        };
      }>,
      reply: FastifyReply
    ) => {
      const userId = resolveUserId(request);
      if (!userId) {
        return reply.status(401).send({ success: false, error: 'Usuario nao autenticado' });
      }

      const typeRaw = String(request.body?.type || '').trim().toLowerCase();
      const type: UserSourceType =
        typeRaw === 'text' || typeRaw === 'link' || typeRaw === 'youtube'
          ? (typeRaw as UserSourceType)
          : 'text';

      const actionResult = await CreditsService.consumeAction({
        userId,
        count: 1,
        reason: 'source_create',
        metadata: { type },
      });
      if (!actionResult.allowed) {
        return reply.status(402).send({ success: false, error: 'Limite mensal atingido' });
      }

      if (type === 'text') {
        const text = String(request.body?.text || '').trim();
        if (text.length < 10) {
          return reply.status(400).send({ success: false, error: 'Texto muito curto' });
        }
        const source = await UserSourcesService.createUserSource({
          userId,
          editalId: request.body?.edital_id ?? null,
          type,
          status: 'ready',
          title: request.body?.title ?? 'Texto enviado',
          textContent: text,
          metadata: request.body?.metadata ?? {},
        });
        return reply.send({ success: true, data: source });
      }

      const url = String(request.body?.url || '').trim();
      if (!url) {
        return reply.status(400).send({ success: false, error: 'URL obrigatoria' });
      }

      const source = await UserSourcesService.createUserSource({
        userId,
        editalId: request.body?.edital_id ?? null,
        type,
        status: 'pending',
        title: request.body?.title ?? null,
        url,
        metadata: request.body?.metadata ?? {},
      });

      const jobId = await JobService.createJob({
        name: `Process source ${source.id}`,
        type: 'process_user_source',
        data: { sourceId: source.id },
        priority: 6,
        maxAttempts: 2,
      });

      await UserSourcesService.updateUserSource({
        id: source.id,
        userId,
        patch: {
          jobId,
        },
      });

      return reply.send({ success: true, data: { ...source, job_id: jobId } });
    }
  );

  app.get('/sources', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = resolveUserId(request);
    if (!userId) {
      return reply.status(401).send({ success: false, error: 'Usuario nao autenticado' });
    }
    const queryParams = request.query as any;
    const sources = await UserSourcesService.listUserSources({
      userId,
      editalId: queryParams?.edital_id ?? undefined,
      status: queryParams?.status ?? undefined,
      type: queryParams?.type ?? undefined,
      limit: queryParams?.limit ? Number(queryParams.limit) : undefined,
      offset: queryParams?.offset ? Number(queryParams.offset) : undefined,
    });
    return reply.send({ success: true, data: sources });
  });

  app.get(
    '/sources/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const userId = resolveUserId(request);
      if (!userId) {
        return reply.status(401).send({ success: false, error: 'Usuario nao autenticado' });
      }
      const source = await UserSourcesService.getUserSourceById(request.params.id, userId);
      if (!source) {
        return reply.status(404).send({ success: false, error: 'Fonte nao encontrada' });
      }
      return reply.send({ success: true, data: source });
    }
  );

  app.get(
    '/sources/:id/download',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const userId = resolveUserId(request);
      if (!userId) {
        return reply.status(401).send({ success: false, error: 'Usuario nao autenticado' });
      }
      const source = await UserSourcesService.getUserSourceById(request.params.id, userId);
      if (!source) {
        return reply.status(404).send({ success: false, error: 'Fonte nao encontrada' });
      }

      if (source.s3_key && UserStorageService.s3Enabled) {
        const signedUrl = await UserStorageService.getDownloadUrl({ key: source.s3_key });
        return reply.redirect(signedUrl);
      }

      if (source.file_name) {
        const localPath = await UserStorageService.getLocalFilePath(source.file_name);
        if (!localPath) {
          return reply.status(404).send({ success: false, error: 'Arquivo nao encontrado' });
        }
        reply.header('Content-Type', source.content_type || 'application/octet-stream');
        return reply.send(createReadStream(localPath));
      }

      return reply.status(404).send({ success: false, error: 'Arquivo nao encontrado' });
    }
  );
}
