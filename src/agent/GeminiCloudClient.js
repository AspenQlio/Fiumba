import {
  buildGeminiGenerateContentRequest,
  buildGeminiGenerateContentUrl,
  GEMINI_CLOUD_MODEL,
  parseGeminiGenerateContentResponse,
} from './geminiRest.mjs';

export class GeminiCloudClient {
  constructor(
    apiKey,
    model = GEMINI_CLOUD_MODEL,
    { fetchImpl = globalThis.fetch, timeoutMs = 30_000 } = {},
  ) {
    this.apiKey = String(apiKey ?? '').trim();
    this.model = model;
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
    this.isLoaded = Boolean(this.apiKey);
  }

  async initModel() {
    this.isLoaded = Boolean(this.apiKey);
  }

  async generateResponse(history, tools = [], systemInstruction = null) {
    if (!this.apiKey) throw new Error('Gemini API no está configurada. Guarda la clave en CONFIG.');

    const requestBody = buildGeminiGenerateContentRequest(history, systemInstruction, tools);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    let response;
    try {
      response = await this.fetchImpl(buildGeminiGenerateContentUrl(this.apiKey, this.model), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error('Gemini tardó demasiado en responder. Inténtalo nuevamente.');
      }
      throw new Error(`No se pudo conectar con Gemini: ${error?.message ?? 'error de red'}`);
    } finally {
      clearTimeout(timeout);
    }

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = payload?.error?.message ?? `HTTP ${response.status}`;
      throw new Error(`Gemini falló: ${message}`);
    }

    return parseGeminiGenerateContentResponse(payload);
  }
}
