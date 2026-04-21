/**
 * LLMConfig.example.js — Example config for in-game LLM auto-play.
 * Copy this file to LLMConfig.js and fill in your API key.
 *
 * Providers:
 *   "anthropic" — Claude (api.anthropic.com)
 *   "openai"    — GPT-4o etc. (api.openai.com)
 *   "deepseek"  — DeepSeek (api.deepseek.com)
 */
var LLMConfig = {
    provider:    "deepseek",          // "anthropic" | "openai" | "deepseek"
    apiKey:      "sk-...",            // ← fill in your API key
    model:       "deepseek-chat",     // "claude-haiku-4-5-20251001" | "gpt-4o" | "deepseek-chat"
    topK:        20,                  // max candidates sent to LLM (0 = unlimited)
    moveDelayMs: 500,                 // ms pause before executing move (visual feedback)
};
