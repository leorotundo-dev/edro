"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.summarizeRAGBlock = summarizeRAGBlock;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const client_1 = require("../openai/client");
const promptPath = path_1.default.join(__dirname, '..', '..', 'prompts', 'summarizeRAG.prompt.txt');
const systemPrompt = fs_1.default.readFileSync(promptPath, 'utf-8');
async function summarizeRAGBlock(input) {
    const userContent = [
        `Disciplina: ${input.disciplina}`,
        `Tópico: ${input.topicCode} - ${input.topicName}`,
        input.banca ? `Banca: ${input.banca}` : '',
        `Fonte: ${input.sourceUrl}`,
        '',
        'Conteúdo do artigo:',
        input.content.slice(0, 15000)
    ].join('\n');
    const response = await client_1.openai.chat.completions.create({
        model: client_1.MODEL,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent }
        ],
        temperature: 0.3
    });
    const summary = response.choices[0]?.message?.content?.trim() ?? '';
    return { summary };
}
