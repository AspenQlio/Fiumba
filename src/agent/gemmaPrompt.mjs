const TURN_TOKENS_PATTERN = /<\/?(?:start|end)_of_turn>|<start_of_turn>(?:user|model)?/gi;
const SERVER_LLM_RESULT_PATTERN = /\(Respuesta del modelo grande en [\d.]+s\)/i;
const TOOL_RESULT_PATTERN = /^(?:Código de salida:|\[Error\]:)/i;
const MAX_LOCAL_HISTORY_MESSAGES = 6;
const MAX_LOCAL_HISTORY_TEXT_CHARS = 1200;

function sanitizePromptText(value) {
  return String(value ?? '').replace(TURN_TOKENS_PATTERN, '').trim();
}

function serializeToolInstructions(tools) {
  if (tools.length === 0) return '';

  const declarations = tools
    .map((tool) => `- ${tool.name}: ${tool.description}\n  Parámetros: ${JSON.stringify(tool.parameters ?? {})}`)
    .join('\n');

  return [
    'El usuario pidió una acción que puede requerir una herramienta.',
    'Debes ejecutar una de las herramientas autorizadas.',
    'Responde solamente con <TOOL>nombre|json</TOOL>.',
    'Herramientas autorizadas para este turno:',
    declarations,
  ].join('\n');
}

function serializeParts(parts) {
  const text = parts
    .filter((part) => typeof part.text === 'string')
    .map((part) => part.text)
    .join('\n');

  if (text) return sanitizePromptText(text);

  const functionCall = parts.find((part) => part.functionCall)?.functionCall;
  if (functionCall) {
    return `<TOOL>${functionCall.name}|${JSON.stringify(functionCall.args ?? {})}</TOOL>`;
  }

  const functionResponse = parts.find((part) => part.functionResponse)?.functionResponse;
  if (functionResponse) {
    return `Resultado de ${functionResponse.name}: ${JSON.stringify(functionResponse.response?.result ?? null)}`;
  }

  return '';
}

export function compactToolExchangeHistory(history) {
  return history.filter((message) => !(message.parts ?? []).some(
    (part) => part.functionCall || part.functionResponse,
  ));
}

function isSafeLocalTextMessage(message, index, historyLength) {
  if (message?.role !== 'user' && message?.role !== 'model') return false;

  const text = sanitizePromptText((message.parts ?? [])
    .filter((part) => typeof part.text === 'string')
    .map((part) => part.text)
    .join('\n'));

  if (!text) return false;
  if (message.role === 'user' && index === historyLength - 1) return true;
  if (text.length > MAX_LOCAL_HISTORY_TEXT_CHARS) return false;
  if (SERVER_LLM_RESULT_PATTERN.test(text)) return false;
  if (TOOL_RESULT_PATTERN.test(text)) return false;

  return true;
}

function isUnsafeLocalBoundary(message) {
  const text = sanitizePromptText((message?.parts ?? [])
    .filter((part) => typeof part.text === 'string')
    .map((part) => part.text)
    .join('\n'));

  return SERVER_LLM_RESULT_PATTERN.test(text) || TOOL_RESULT_PATTERN.test(text);
}

export function prepareLocalGenerationHistory(history) {
  const lastUnsafeIndex = history.findLastIndex(isUnsafeLocalBoundary);
  const generationWindow = lastUnsafeIndex >= 0 ? history.slice(lastUnsafeIndex + 1) : history;

  const safeMessages = history
    .slice(history.length - generationWindow.length)
    .map((message, index) => ({ message, index }))
    .filter(({ message, index }) => isSafeLocalTextMessage(message, index, generationWindow.length))
    .map(({ message }) => ({
      role: message.role,
      parts: [{ text: sanitizePromptText((message.parts ?? []).map((part) => part.text ?? '').join('\n')) }],
    }));

  return safeMessages.slice(-MAX_LOCAL_HISTORY_MESSAGES);
}

export function buildGemmaPrompt(history, systemInstruction = '', tools = []) {
  const promptParts = [];
  const toolInstructions = serializeToolInstructions(tools);
  let hasInjectedInstructions = false;

  for (const message of history) {
    const content = serializeParts(message.parts ?? []);
    if (!content) continue;

    if (message.role === 'model') {
      promptParts.push(`<start_of_turn>model\n${content}<end_of_turn>\n`);
      continue;
    }

    const instructions = hasInjectedInstructions
      ? ''
      : [sanitizePromptText(systemInstruction), toolInstructions].filter(Boolean).join('\n\n');
    const userContent = [instructions, content].filter(Boolean).join('\n\n');
    promptParts.push(`<start_of_turn>user\n${userContent}<end_of_turn>\n`);
    hasInjectedInstructions = true;
  }

  promptParts.push('<start_of_turn>model\n');
  return promptParts.join('');
}

export function parseGemmaResponse(rawResponse, allowedToolNames) {
  const response = String(rawResponse ?? '').trim();
  const toolMatch = response.match(/<TOOL>\s*([^|<]+?)\s*\|\s*({[\s\S]*?})\s*<\/TOOL>/i);

  if (toolMatch) {
    const name = toolMatch[1].trim();
    if (!allowedToolNames.includes(name)) {
      return [{ text: 'No entendí bien la solicitud. Inténtalo de nuevo.' }];
    }

    try {
      return [{ functionCall: { name, args: JSON.parse(toolMatch[2]) } }];
    } catch {
      return [{ text: 'No pude preparar esa acción. Inténtalo de nuevo.' }];
    }
  }

  const text = response
    .replace(/<end_of_turn>[\s\S]*$/i, '')
    .replace(/^<start_of_turn>model\s*/i, '')
    .trim();

  return [{ text }];
}
