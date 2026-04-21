/**
 * LLMConfig.js — Configuration for in-game LLM auto-play.
 *
 * IMPORTANT: This file is gitignored. Copy from LLMConfig.example.js and fill
 * in your API key before use.
 *
 * Providers:
 *   "anthropic" — Claude (api.anthropic.com)
 *   "openai"    — GPT-4o etc. (api.openai.com)
 *   "deepseek"  — DeepSeek (api.deepseek.com)
 */
var LLMConfig = {
    provider:    "deepseek",          // "anthropic" | "openai" | "deepseek"
    apiKey:      "sk-1a2d64f765034171a426da2c0fb1f88f", // ← fill in your API key
    model:       "deepseek-chat",     // "claude-haiku-4-5-20251001" | "gpt-4o" | "deepseek-chat"
    topK:        20,                  // max candidates sent to LLM (0 = unlimited)
    moveDelayMs: 500,                 // ms pause before executing move (visual feedback)
};
