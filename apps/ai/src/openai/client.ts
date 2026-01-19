import OpenAI from 'openai';
import { env } from '../env';

export const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  baseURL: env.OPENAI_BASE_URL
});

export const MODEL = env.OPENAI_MODEL;
