/**
 * Local Open-Weight LLM Connector (Hardened & Purified)
 * Connects directly to local inference daemons (Ollama: :11434)
 * Supports Google Gemma 2, Meta Llama 3.2, Qwen 2.5, Mistral 7B
 * 
 * Edge Case Protections:
 * - Robust JSON extraction stripping markdown backticks (```json ... ```)
 * - Safe JSON parsing finding outermost { ... }
 * - Timeout and connection failure safety
 * - Zero uncaught exceptions
 */

const http = require('http');

class LocalLLMEngine {
  constructor(options = {}) {
    this.host = options.host || '127.0.0.1';
    this.port = Number(options.port) || 11434;
    this.defaultModel = options.model || 'gemma2:2b';
    this.timeout = Number(options.timeout) || 45000;
  }

  /**
   * Check if local Ollama daemon is reachable and list available open-weight models
   */
  async checkHealth() {
    return new Promise((resolve) => {
      const req = http.request(
        {
          hostname: this.host,
          port: this.port,
          path: '/api/tags',
          method: 'GET',
          timeout: 3000
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              if (res.statusCode === 200) {
                const parsed = JSON.parse(data);
                const models = (parsed.models || []).map((m) => m.name);
                let active =
                  models.find((m) => m.includes('gemma')) ||
                  models.find((m) => m.includes('llama3.2')) ||
                  models[0] ||
                  this.defaultModel;

                resolve({
                  online: true,
                  models: models.length ? models : ['gemma2:2b', 'llama3.2:3b', 'qwen2.5:7b', 'mistral:7b'],
                  activeModel: active,
                  provider: 'Ollama (Local Open-Weight Inference)'
                });
              } else {
                resolve({ online: false, error: `HTTP ${res.statusCode}` });
              }
            } catch (e) {
              resolve({ online: false, error: e.message });
            }
          });
        }
      );

      req.on('error', () => {
        resolve({
          online: false,
          error: 'Local Ollama service not detected on port 11434. Fallback local engine active.'
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ online: false, error: 'Connection timed out' });
      });

      req.end();
    });
  }

  /**
   * Robust JSON extraction from LLM output text
   * Handles markdown code fences, leading/trailing commentary, or raw JSON
   */
  static extractJSONFromText(text) {
    if (!text || typeof text !== 'string') return null;

    const trimmed = text.trim();

    // 1. Direct parse attempt
    try {
      return JSON.parse(trimmed);
    } catch (_) {}

    // 2. Extract from markdown code fences (```json ... ``` or ``` ...)
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch && codeBlockMatch[1]) {
      try {
        return JSON.parse(codeBlockMatch[1].trim());
      } catch (_) {}
    }

    // 3. Find outermost curly braces { ... }
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const candidate = trimmed.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(candidate);
      } catch (_) {}
    }

    return null;
  }

  /**
   * Run structured inference against local open-weight model with JSON mode
   */
  async generateJSON(prompt, systemPrompt, modelName = null, images = []) {
    const targetModel = modelName || this.defaultModel;

    return new Promise((resolve, reject) => {
      const payloadObj = {
        model: targetModel,
        prompt: String(prompt || ''),
        system: systemPrompt || 'You are an expert tax accountant and financial receipt extractor. Return ONLY valid JSON.',
        stream: false,
        format: 'json',
        options: {
          temperature: 0.1,
          top_p: 0.9
        }
      };

      if (Array.isArray(images) && images.length > 0) {
        payloadObj.images = images;
      }

      const payload = JSON.stringify(payloadObj);

      const req = http.request(
        {
          hostname: this.host,
          port: this.port,
          path: '/api/generate',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          },
          timeout: this.timeout
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              if (res.statusCode !== 200) {
                return reject(new Error(`Ollama returned status ${res.statusCode}: ${data}`));
              }

              const responseObj = JSON.parse(data);
              const outputText = responseObj.response;
              const jsonResult = LocalLLMEngine.extractJSONFromText(outputText);

              if (!jsonResult) {
                return reject(new Error(`Could not extract valid JSON from LLM response: ${outputText.slice(0, 100)}`));
              }

              const durationMs = Math.round((responseObj.total_duration || 0) / 1000000);
              const evalCount = responseObj.eval_count || 0;
              const tokPerSec = durationMs > 0 ? +((evalCount / (durationMs / 1000)).toFixed(1)) : 0;

              resolve({
                data: jsonResult,
                model: targetModel,
                totalDurationMs: durationMs,
                evalCount,
                tokensPerSecond: tokPerSec
              });
            } catch (err) {
              reject(new Error(`Failed to parse local LLM JSON output: ${err.message}`));
            }
          });
        }
      );

      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Local inference timed out'));
      });

      req.write(payload);
      req.end();
    });
  }
}

module.exports = LocalLLMEngine;
