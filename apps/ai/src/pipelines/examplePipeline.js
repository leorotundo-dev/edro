"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runExamplePipeline = runExamplePipeline;
const env_1 = require("../env");
const openai_1 = __importDefault(require("openai"));
const client = new openai_1.default({
    apiKey: env_1.AI_ENV.OPENAI_API_KEY,
    baseURL: env_1.AI_ENV.OPENAI_BASE_URL
});
async function runExamplePipeline(input) {
    const systemPrompt = `
Você é um especialista em concursos públicos.
Resuma o texto a seguir em no máximo 3 frases, linguagem simples.
  `.trim();
    const userPrompt = input.text.slice(0, 8000);
    const completion = await client.chat.completions.create({
        model: env_1.AI_ENV.OPENAI_MODEL,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        temperature: 0.4
    });
    const summary = completion.choices[0]?.message?.content?.trim() || '';
    return { summary };
}
