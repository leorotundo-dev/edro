import { config } from 'dotenv';
config();

export const env = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4o-mini"
};

export const AI_ENV = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4o-mini"
};

if (!AI_ENV.OPENAI_API_KEY) {
  console.warn("[AI][WARN] OPENAI_API_KEY não definido.");
}
