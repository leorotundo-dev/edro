"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractExamStructureFromHtml = extractExamStructureFromHtml;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const client_1 = require("../openai/client");
const promptPath = path_1.default.join(__dirname, '..', '..', 'prompts', 'extractExamStructure.prompt.txt');
const systemPrompt = fs_1.default.readFileSync(promptPath, 'utf-8');
async function extractExamStructureFromHtml(html) {
    const userContent = [
        'Texto do edital (HTML ou texto plano):',
        '```html',
        html.slice(0, 15000),
        '```'
    ].join('\n');
    const response = await client_1.openai.chat.completions.create({
        model: client_1.MODEL,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent }
        ],
        temperature: 0.1
    });
    const raw = response.choices[0]?.message?.content ?? '{}';
    try {
        const json = JSON.parse(raw);
        return json;
    }
    catch (err) {
        console.error('Failed to parse ExamBlueprint JSON:', err);
        console.error('Raw response:', raw);
        throw err;
    }
}
