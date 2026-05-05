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
 *   "local"     — Python service (llm_service/service.py) — recommended for mobile
 *                 Start with: python service.py --api-key <key>
 */
var LLMConfig = {
    provider:    "local",             // "anthropic" | "openai" | "deepseek" | "local"
    apiKey:      "",                  // ← only used for non-local providers
    model:       "deepseek-reasoner",     // "claude-haiku-4-5-20251001" | "gpt-4o" | "deepseek-chat"
    serviceUrl:  "http://120.138.72.4:8081", // ← local Python service URL
    topK:        20,                  // max candidates sent to LLM (0 = unlimited)
    moveDelayMs: 500,                 // ms pause before executing move (visual feedback)
};
