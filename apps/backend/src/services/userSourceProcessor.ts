import fs from 'fs';
import { load } from 'cheerio';
import pdfParse from 'pdf-parse';
import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract';
import {
  TranscribeClient,
  StartTranscriptionJobCommand,
  GetTranscriptionJobCommand,
} from '@aws-sdk/client-transcribe';
import { YoutubeTranscript } from 'youtube-transcript';
import { fetchHtml } from '../adapters/harvest/fetchHtml';
import { UserStorageService } from './userStorageService';
import {
  UserSourcesService,
  UserSource,
  UserSourceStatus,
} from './userSourcesService';

const toPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const TEXT_LIMIT = toPositiveInt(process.env.USER_SOURCE_TEXT_LIMIT, 8000);

const AWS_REGION =
  process.env.S3_REGION ||
  process.env.AWS_REGION ||
  process.env.AWS_DEFAULT_REGION ||
  'us-east-1';
const AWS_ACCESS_KEY =
  process.env.S3_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID || '';
const AWS_SECRET_KEY =
  process.env.S3_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY || '';
const awsCredentials =
  AWS_ACCESS_KEY && AWS_SECRET_KEY
    ? { accessKeyId: AWS_ACCESS_KEY, secretAccessKey: AWS_SECRET_KEY }
    : undefined;

const textractClient =
  AWS_REGION && awsCredentials
    ? new TextractClient({ region: AWS_REGION, credentials: awsCredentials })
    : null;

const transcribeClient =
  AWS_REGION && awsCredentials
    ? new TranscribeClient({ region: AWS_REGION, credentials: awsCredentials })
    : null;

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function limitText(value: string, limit: number) {
  if (value.length <= limit) return value;
  return value.slice(0, limit).trim();
}

function extractTextFromHtml(html: string, baseUrl: string) {
  const $ = load(html);
  $('script,style,noscript,svg,canvas').remove();
  const title = normalizeWhitespace($('title').first().text() || '');
  const rawImage =
    $('meta[property="og:image"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content') ||
    $('link[rel="image_src"]').attr('href') ||
    null;
  let imageUrl: string | null = null;
  if (rawImage) {
    try {
      imageUrl = new URL(rawImage, baseUrl).toString();
    } catch {
      imageUrl = null;
    }
  }
  const bodyText = normalizeWhitespace($('body').text() || '');
  return {
    title: title || 'Fonte',
    text: bodyText,
    imageUrl,
  };
}

async function loadSourceBuffer(source: UserSource): Promise<Buffer> {
  if (source.s3_key) {
    return await UserStorageService.getObjectBuffer({ key: source.s3_key });
  }
  if (source.file_name) {
    const localPath = await UserStorageService.getLocalFilePath(source.file_name);
    if (!localPath) {
      throw new Error('local_file_missing');
    }
    const buffer = await fs.promises.readFile(localPath);
    return buffer;
  }
  throw new Error('source_buffer_missing');
}

function resolveFileType(source: UserSource) {
  const contentType = String(source.content_type || '').toLowerCase();
  if (contentType.includes('pdf')) return 'pdf';
  if (contentType.startsWith('image/')) return 'image';
  if (contentType.startsWith('audio/')) return 'audio';
  if (contentType.startsWith('video/')) return 'video';
  const fileName = String(source.file_name || '').toLowerCase();
  if (fileName.endsWith('.pdf')) return 'pdf';
  if (fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) return 'image';
  if (fileName.endsWith('.mp3') || fileName.endsWith('.wav')) return 'audio';
  if (fileName.endsWith('.mp4') || fileName.endsWith('.mov') || fileName.endsWith('.m4a')) return 'video';
  return 'unknown';
}

function resolveTranscribeFormat(source: UserSource): string {
  const fileName = String(source.file_name || '').toLowerCase();
  if (fileName.endsWith('.mp3')) return 'mp3';
  if (fileName.endsWith('.mp4')) return 'mp4';
  if (fileName.endsWith('.wav')) return 'wav';
  if (fileName.endsWith('.m4a')) return 'm4a';
  const contentType = String(source.content_type || '').toLowerCase();
  if (contentType.includes('mp3')) return 'mp3';
  if (contentType.includes('mp4')) return 'mp4';
  if (contentType.includes('wav')) return 'wav';
  if (contentType.includes('m4a')) return 'm4a';
  return 'mp3';
}

async function runTextract(buffer: Buffer): Promise<string | null> {
  if (!textractClient) {
    throw new Error('textract_not_configured');
  }
  const response = await textractClient.send(
    new DetectDocumentTextCommand({
      Document: { Bytes: buffer },
    })
  );
  const lines = (response.Blocks || [])
    .filter((block) => block.BlockType === 'LINE' && block.Text)
    .map((block) => block.Text?.trim())
    .filter(Boolean);
  if (!lines.length) return null;
  return lines.join('\n');
}

async function fetchTranscriptFile(uri: string): Promise<string | null> {
  const res = await fetch(uri);
  if (!res.ok) {
    throw new Error(`transcript_fetch_failed_${res.status}`);
  }
  const payload = await res.json();
  const transcript = payload?.results?.transcripts?.[0]?.transcript || '';
  return transcript ? String(transcript) : null;
}

async function ensureTranscriptionJob(params: {
  jobName: string;
  mediaUri: string;
  format: string;
  languageCode?: string;
}) {
  if (!transcribeClient) {
    throw new Error('transcribe_not_configured');
  }

  try {
    const existing = await transcribeClient.send(
      new GetTranscriptionJobCommand({ TranscriptionJobName: params.jobName })
    );
    return existing.TranscriptionJob ?? null;
  } catch {
    // continue to start job
  }

  const startCommand = new StartTranscriptionJobCommand({
    TranscriptionJobName: params.jobName,
    Media: { MediaFileUri: params.mediaUri },
    MediaFormat: params.format,
    LanguageCode: params.languageCode || 'pt-BR',
  });
  await transcribeClient.send(startCommand);
  return null;
}

async function extractYoutubeTranscript(url: string): Promise<string | null> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(url, { lang: 'pt' });
    const text = transcript.map((entry) => entry.text).join(' ');
    return text ? text.trim() : null;
  } catch {
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(url);
      const text = transcript.map((entry) => entry.text).join(' ');
      return text ? text.trim() : null;
    } catch {
      return null;
    }
  }
}
async function markSourceStatus(
  source: UserSource,
  status: UserSourceStatus,
  patch?: Partial<{
    textContent?: string | null;
    title?: string | null;
    metadata?: Record<string, any> | null;
    errorMessage?: string | null;
  }>
) {
  await UserSourcesService.updateUserSource({
    id: source.id,
    userId: source.user_id,
    patch: {
      status,
      textContent: patch?.textContent ?? undefined,
      title: patch?.title ?? undefined,
      metadata: patch?.metadata ?? undefined,
      processedAt: status === 'ready' ? new Date() : undefined,
      errorMessage: patch?.errorMessage ?? (status === 'failed' ? 'processing_failed' : undefined),
    },
  });
}

export async function processUserSource(sourceId: string) {
  const source = await UserSourcesService.getUserSourceByIdUnsafe(sourceId);
  if (!source) {
    throw new Error('source_not_found');
  }

  if (source.status === 'ready') {
    return { status: source.status };
  }

  await UserSourcesService.updateUserSource({
    id: source.id,
    userId: source.user_id,
    patch: { status: 'processing', errorMessage: null },
  });

  try {
    if (source.type === 'text') {
      const text = String(source.text_content || '').trim();
      if (!text) {
        throw new Error('text_empty');
      }
      await markSourceStatus(source, 'ready', {
        textContent: limitText(text, TEXT_LIMIT),
        title: source.title || 'Texto enviado',
        metadata: source.metadata || {},
      });
      return { status: 'ready' };
    }

    if (source.type === 'link') {
      const url = String(source.url || '').trim();
      if (!url) {
        throw new Error('url_missing');
      }
      const html = await fetchHtml(url);
      const parsed = extractTextFromHtml(html, url);
      const text = limitText(parsed.text, TEXT_LIMIT);
      if (!text) {
        throw new Error('link_text_empty');
      }
      await markSourceStatus(source, 'ready', {
        textContent: text,
        title: source.title || parsed.title || 'Fonte',
        metadata: {
          ...(source.metadata || {}),
          image_url: parsed.imageUrl || null,
        },
      });
      return { status: 'ready' };
    }

    if (source.type === 'youtube') {
      const url = String(source.url || '').trim();
      if (!url) {
        throw new Error('url_missing');
      }
      const transcript = await extractYoutubeTranscript(url);
      if (transcript) {
        await markSourceStatus(source, 'ready', {
          textContent: limitText(transcript, TEXT_LIMIT),
          title: source.title || 'Video enviado',
          metadata: {
            ...(source.metadata || {}),
            transcript_source: 'youtube',
          },
        });
        return { status: 'ready' };
      }
      const html = await fetchHtml(url);
      const parsed = extractTextFromHtml(html, url);
      const text = limitText(parsed.text, TEXT_LIMIT);
      if (!text) {
        throw new Error('youtube_text_empty');
      }
      await markSourceStatus(source, 'ready', {
        textContent: text,
        title: source.title || parsed.title || 'Video enviado',
        metadata: {
          ...(source.metadata || {}),
          image_url: parsed.imageUrl || null,
          transcript_source: 'fallback_html',
        },
      });
      return { status: 'ready' };
    }

    const fileType = resolveFileType(source);
    if (fileType === 'pdf') {
      const buffer = await loadSourceBuffer(source);
      const parsed = await pdfParse(buffer);
      const text = limitText(parsed.text || '', TEXT_LIMIT);
      if (!text) {
        throw new Error('pdf_text_empty');
      }
      await markSourceStatus(source, 'ready', {
        textContent: text,
        title: source.title || source.file_name || 'Documento enviado',
        metadata: {
          ...(source.metadata || {}),
          extraction_method: 'pdf-parse',
          text_chars: text.length,
        },
      });
      return { status: 'ready' };
    }

    if (fileType === 'image') {
      const buffer = await loadSourceBuffer(source);
      const text = await runTextract(buffer);
      if (!text) {
        throw new Error('image_text_empty');
      }
      await markSourceStatus(source, 'ready', {
        textContent: limitText(text, TEXT_LIMIT),
        title: source.title || source.file_name || 'Imagem enviada',
        metadata: {
          ...(source.metadata || {}),
          extraction_method: 'textract',
        },
      });
      return { status: 'ready' };
    }

    if (fileType === 'audio' || fileType === 'video') {
      if (!transcribeClient) {
        throw new Error('transcribe_not_configured');
      }
      if (!source.s3_key) {
        throw new Error('transcribe_requires_s3');
      }
      const bucket = process.env.S3_BUCKET || '';
      if (!bucket) {
        throw new Error('s3_bucket_missing');
      }
      const mediaUri = `s3://${bucket}/${source.s3_key}`;
      const jobName = `md-source-${source.id}`;
      const format = resolveTranscribeFormat(source);
      const language = source.metadata?.language || 'pt-BR';

      const job = await ensureTranscriptionJob({
        jobName,
        mediaUri,
        format,
        languageCode: typeof language === 'string' ? language : 'pt-BR',
      });

      const currentJob = job
        ? job
        : await transcribeClient.send(
            new GetTranscriptionJobCommand({ TranscriptionJobName: jobName })
          ).then((res) => res.TranscriptionJob);

      const status = currentJob?.TranscriptionJobStatus;
      if (status === 'IN_PROGRESS' || status === 'QUEUED') {
        await markSourceStatus(source, 'processing', {
          metadata: {
            ...(source.metadata || {}),
            transcribe_job: jobName,
            transcribe_status: status,
          },
        });
        throw new Error('transcribe_in_progress');
      }

      if (status === 'COMPLETED') {
        const transcriptUri = currentJob?.Transcript?.TranscriptFileUri;
        if (!transcriptUri) {
          throw new Error('transcribe_no_transcript');
        }
        const transcript = await fetchTranscriptFile(transcriptUri);
        if (!transcript) {
          throw new Error('transcribe_empty');
        }
        await markSourceStatus(source, 'ready', {
          textContent: limitText(transcript, TEXT_LIMIT),
          title: source.title || source.file_name || 'Audio enviado',
          metadata: {
            ...(source.metadata || {}),
            transcribe_job: jobName,
            transcribe_status: status,
            transcript_uri: transcriptUri,
          },
        });
        return { status: 'ready' };
      }

      await markSourceStatus(source, 'failed', {
        errorMessage: `transcribe_${status || 'failed'}`,
        metadata: {
          ...(source.metadata || {}),
          transcribe_job: jobName,
          transcribe_status: status,
        },
      });
      return { status: 'failed', reason: `transcribe_${status || 'failed'}` };
    }

    await UserSourcesService.updateUserSource({
      id: source.id,
      userId: source.user_id,
      patch: {
        status: 'failed',
        errorMessage: `unsupported_source_${fileType}`,
        processedAt: new Date(),
      },
    });
    return { status: 'failed', reason: `unsupported_source_${fileType}` };
  } catch (err) {
    await UserSourcesService.updateUserSource({
      id: source.id,
      userId: source.user_id,
      patch: {
        status: 'failed',
        errorMessage: err instanceof Error ? err.message : 'processing_failed',
        processedAt: new Date(),
      },
    });
    throw err;
  }
}

export const UserSourceProcessor = {
  processUserSource,
};

export default UserSourceProcessor;
