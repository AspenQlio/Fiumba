export const GEMINI_CLOUD_MODEL = 'gemini-3.5-flash-lite';

export function buildGeminiGenerateContentRequest(history, systemInstruction, tools) {
  const contents = history.map(msg => ({
    role: msg.role === 'model' ? 'model' : 'user',
    parts: msg.parts.map(part => ({ ...part }))
  }));

  const request = {
    contents,
    generationConfig: {
      temperature: 0.7,
    },
  };

  if (systemInstruction) {
    request.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  if (tools && tools.length > 0) {
    request.tools = [{
      functionDeclarations: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters ?? { type: 'OBJECT', properties: {} }
      }))
    }];
  }

  return request;
}

export function parseGeminiGenerateContentResponse(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts ?? [];
  if (parts.length === 0) {
    const reason = payload?.candidates?.[0]?.finishReason;
    throw new Error(`Gemini no devolvió contenido${reason ? ` (finishReason=${reason})` : ''}.`);
  }
  return parts;
}

export function buildGeminiGenerateContentUrl(apiKey, model = GEMINI_CLOUD_MODEL) {
  const encodedModel = encodeURIComponent(model);
  const encodedKey = encodeURIComponent(apiKey);
  return `https://generativelanguage.googleapis.com/v1beta/models/${encodedModel}:generateContent?key=${encodedKey}`;
}
