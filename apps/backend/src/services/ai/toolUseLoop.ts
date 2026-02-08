/**
 * Agentic tool-use loop for the Jarvis AI Agent.
 * Sends messages + tools to AI, executes tool calls, repeats until text response.
 * Supports Claude, OpenAI, and Gemini providers.
 */

import { generateWithTools as claudeWithTools } from './claudeService';
import { generateWithTools as openaiWithTools } from './openaiService';
import { generateWithTools as geminiWithTools } from './geminiService';
import { executeTool, type ToolContext } from './toolExecutor';
import { toClaudeTools, toOpenAITools, toGeminiTools, ToolDefinition } from './toolDefinitions';
import { fireAndForgetLog } from './copyOrchestrator';
import type { CopyProvider, UsageContext } from './copyOrchestrator';

// ── Types ──────────────────────────────────────────────────────

export type LoopMessage = {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: Array<{ id: string; name: string; args: any }>;
  toolCallId?: string;
  toolName?: string;
};

export type ToolUseLoopParams = {
  messages: LoopMessage[];
  systemPrompt: string;
  tools: ToolDefinition[];
  provider: CopyProvider;
  toolContext: ToolContext;
  maxIterations?: number;
  temperature?: number;
  maxTokens?: number;
  usageContext?: UsageContext;
};

export type ToolUseLoopResult = {
  finalText: string;
  toolCallsExecuted: number;
  iterations: number;
  totalDurationMs: number;
  provider: string;
  model: string;
};

// ── Main Loop ──────────────────────────────────────────────────

export async function runToolUseLoop(params: ToolUseLoopParams): Promise<ToolUseLoopResult> {
  const {
    systemPrompt,
    tools,
    provider,
    toolContext,
    maxIterations = 5,
    temperature = 0.7,
    maxTokens = 4096,
    usageContext,
  } = params;

  const startMs = Date.now();
  let iterations = 0;
  let toolCallsExecuted = 0;
  let model = '';

  // Dispatch to provider-specific loop
  if (provider === 'claude') {
    return runClaudeLoop();
  } else if (provider === 'openai') {
    return runOpenAILoop();
  } else if (provider === 'gemini') {
    return runGeminiLoop();
  }
  throw new Error(`Unsupported provider for tool use: ${provider}`);

  // ── Claude Loop ──────────────────────────────────────────────

  async function runClaudeLoop(): Promise<ToolUseLoopResult> {
    const claudeTools = toClaudeTools(tools);
    // Build initial messages in Claude format
    const claudeMessages: Array<{ role: 'user' | 'assistant'; content: any }> = [];
    for (const msg of params.messages) {
      if (msg.role === 'user') {
        claudeMessages.push({ role: 'user', content: msg.content });
      } else if (msg.role === 'assistant') {
        claudeMessages.push({ role: 'assistant', content: msg.content });
      }
    }

    while (iterations < maxIterations) {
      iterations++;
      const result = await claudeWithTools({
        messages: claudeMessages,
        systemPrompt,
        tools: claudeTools,
        temperature,
        maxTokens,
      });

      model = result.model;
      logUsage(result.usage, result.model);

      // Extract text and tool_use blocks
      const textBlocks = result.content.filter((b: any) => b.type === 'text');
      const toolUseBlocks = result.content.filter((b: any) => b.type === 'tool_use');

      if (result.stop_reason !== 'tool_use' || toolUseBlocks.length === 0) {
        // Final text response
        const finalText = textBlocks.map((b: any) => b.text || '').join('\n').trim();
        return buildResult(finalText);
      }

      // Append assistant message with tool_use content
      claudeMessages.push({ role: 'assistant', content: result.content });

      // Execute all tool calls and build tool_result content
      const toolResults: any[] = [];
      for (const block of toolUseBlocks) {
        const toolResult = await executeTool(block.name!, block.input || {}, toolContext);
        toolCallsExecuted++;
        console.log(`[toolUseLoop] Claude tool=${block.name} success=${toolResult.success}`);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(toolResult),
        });
      }

      // Append tool results as user message (Claude format)
      claudeMessages.push({ role: 'user', content: toolResults });
    }

    // Max iterations reached — do one final call without tools
    const finalResult = await claudeWithTools({
      messages: claudeMessages,
      systemPrompt,
      tools: [], // no tools → forces text
      temperature,
      maxTokens,
    });
    model = finalResult.model;
    logUsage(finalResult.usage, finalResult.model);
    const finalText = finalResult.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text || '')
      .join('\n')
      .trim();
    return buildResult(finalText || 'Desculpe, atingi o limite de operacoes. Tente simplificar o pedido.');
  }

  // ── OpenAI Loop ──────────────────────────────────────────────

  async function runOpenAILoop(): Promise<ToolUseLoopResult> {
    const openaiTools = toOpenAITools(tools);
    // Build initial messages in OpenAI format
    const openaiMessages: any[] = [];
    for (const msg of params.messages) {
      if (msg.role === 'user') {
        openaiMessages.push({ role: 'user', content: msg.content });
      } else if (msg.role === 'assistant') {
        openaiMessages.push({ role: 'assistant', content: msg.content });
      }
    }

    while (iterations < maxIterations) {
      iterations++;
      const result = await openaiWithTools({
        messages: openaiMessages,
        systemPrompt,
        tools: openaiTools,
        temperature,
        maxTokens,
      });

      model = result.model;
      logUsage(result.usage, result.model);

      const toolCalls = result.message.tool_calls;
      if (result.finish_reason !== 'tool_calls' || !toolCalls?.length) {
        return buildResult((result.message.content || '').trim());
      }

      // Append assistant message with tool_calls
      openaiMessages.push({
        role: 'assistant',
        content: result.message.content,
        tool_calls: toolCalls,
      });

      // Execute each tool call and append results
      for (const tc of toolCalls) {
        let args: any = {};
        try {
          args = typeof tc.function.arguments === 'string'
            ? JSON.parse(tc.function.arguments)
            : tc.function.arguments || {};
        } catch { /* keep empty args */ }

        const toolResult = await executeTool(tc.function.name, args, toolContext);
        toolCallsExecuted++;
        console.log(`[toolUseLoop] OpenAI tool=${tc.function.name} success=${toolResult.success}`);

        openaiMessages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(toolResult),
        });
      }
    }

    // Max iterations — force text
    const finalResult = await openaiWithTools({
      messages: openaiMessages,
      systemPrompt,
      tools: [],
      temperature,
      maxTokens,
    });
    model = finalResult.model;
    logUsage(finalResult.usage, finalResult.model);
    return buildResult((finalResult.message.content || '').trim() || 'Desculpe, atingi o limite de operacoes.');
  }

  // ── Gemini Loop ──────────────────────────────────────────────

  async function runGeminiLoop(): Promise<ToolUseLoopResult> {
    const geminiTools = toGeminiTools(tools);
    // Build initial messages in Gemini format
    const geminiMessages: Array<{ role: string; parts: any[] }> = [];
    for (const msg of params.messages) {
      if (msg.role === 'user') {
        geminiMessages.push({ role: 'user', parts: [{ text: msg.content }] });
      } else if (msg.role === 'assistant') {
        geminiMessages.push({ role: 'model', parts: [{ text: msg.content }] });
      }
    }

    while (iterations < maxIterations) {
      iterations++;
      const result = await geminiWithTools({
        messages: geminiMessages,
        systemPrompt,
        tools: geminiTools,
        temperature,
        maxTokens,
      });

      model = result.model;
      logUsage(result.usage, result.model);

      const functionCalls = result.parts.filter((p: any) => p.functionCall);
      const textParts = result.parts.filter((p: any) => p.text);

      if (functionCalls.length === 0) {
        const finalText = textParts.map((p: any) => p.text || '').join('\n').trim();
        return buildResult(finalText);
      }

      // Append model response with function calls
      geminiMessages.push({ role: 'model', parts: result.parts });

      // Execute and append function responses
      const responseParts: any[] = [];
      for (const fc of functionCalls) {
        const toolResult = await executeTool(fc.functionCall.name, fc.functionCall.args || {}, toolContext);
        toolCallsExecuted++;
        console.log(`[toolUseLoop] Gemini tool=${fc.functionCall.name} success=${toolResult.success}`);
        responseParts.push({
          functionResponse: {
            name: fc.functionCall.name,
            response: toolResult,
          },
        });
      }
      geminiMessages.push({ role: 'user', parts: responseParts });
    }

    // Max iterations — force text
    const finalResult = await geminiWithTools({
      messages: geminiMessages,
      systemPrompt,
      tools: [],
      temperature,
      maxTokens,
    });
    model = finalResult.model;
    logUsage(finalResult.usage, finalResult.model);
    const finalText = finalResult.parts
      .filter((p: any) => p.text)
      .map((p: any) => p.text || '')
      .join('\n')
      .trim();
    return buildResult(finalText || 'Desculpe, atingi o limite de operacoes.');
  }

  // ── Helpers ──────────────────────────────────────────────────

  function buildResult(finalText: string): ToolUseLoopResult {
    return {
      finalText,
      toolCallsExecuted,
      iterations,
      totalDurationMs: Date.now() - startMs,
      provider,
      model,
    };
  }

  function logUsage(usage: { input_tokens: number; output_tokens: number }, usedModel: string) {
    if (usageContext) {
      fireAndForgetLog(
        { ...usageContext, feature: 'planning_chat_agent' },
        provider,
        { text: '', usage, model: usedModel },
        0,
      );
    }
  }
}
