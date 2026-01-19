"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AI_ENV = exports.env = void 0;
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
exports.env = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4o-mini"
};
exports.AI_ENV = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4o-mini"
};
if (!exports.AI_ENV.OPENAI_API_KEY) {
    console.warn("[AI][WARN] OPENAI_API_KEY não definido.");
}
