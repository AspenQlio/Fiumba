const TURN_TOKENS_PATTERN = /<\/?(?:start|end)_of_turn>|<start_of_turn>(?:user|model)?/gi;

const TOOL_INTENT_PATTERNS = {
  get_device_time: /\b(hora|fecha|día de hoy|dia de hoy|date|time)\b/i,
  read_note: /(?:\b(lee|leer|léeme|leeme|abre|abrir|busca|buscar)\b.*\b(nota|obsidian)\b)|(?:\b(nota|obsidian)\b.*\b(lee|leer|abre|abrir|busca|buscar)\b)/i,
  list_vault: /(?:\b(lista|listar|muestra|mostrar|enumera|enumerar)\b.*\b(vault|bóveda|boveda|obsidian|notas|archivos)\b)|(?:\b(qué|que)\s+(notas|archivos)\b)/i,
  execute_ssh: /(?:\b(ssh|servidor|remoto)\b.*\b(ejecuta|ejecutar|corre|correr|comando|terminal|shell)\b)|(?:\b(ejecuta|ejecutar|corre|correr)\b.*\b(ssh|servidor|remoto)\b)/i,
};

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

export function selectToolsForMessage(userText, tools) {
  return tools.filter((tool) => TOOL_INTENT_PATTERNS[tool.name]?.test(userText) === true);
}

function extractQuotedValue(userText) {
  return String(userText ?? '').match(/`([^`]+)`|“([^”]+)”|"([^"]+)"/)?.slice(1).find(Boolean)?.trim() ?? null;
}

function extractDirectArguments(toolName, userText) {
  const quotedValue = extractQuotedValue(userText);

  if (toolName === 'read_note') {
    const query = quotedValue
      ?? String(userText ?? '').match(/\bnota\s+(.+?)(?:\s+(?:de|en)\s+obsidian\b|$)/i)?.[1]?.trim();
    return query ? { query } : null;
  }

  if (toolName === 'execute_ssh') {
    const command = quotedValue
      ?? String(userText ?? '').match(/\bcomando\s+(.+?)(?:\s+en\s+(?:el\s+)?servidor\b|$)/i)?.[1]?.trim();
    return command ? { command } : null;
  }

  return null;
}

export function createDirectToolCall(tools, userText = '') {
  if (tools.length !== 1) return null;

  const [tool] = tools;
  const requiredParameters = tool.parameters?.required ?? [];
  if (requiredParameters.length > 0) {
    const args = extractDirectArguments(tool.name, userText);
    return args ? { functionCall: { name: tool.name, args } } : null;
  }

  return { functionCall: { name: tool.name, args: {} } };
}

export function compactDirectToolHistory(history) {
  return [
    ...history.slice(0, -1),
    {
      role: 'model',
      parts: [{ text: 'Acción local completada; el resultado ya fue mostrado.' }],
    },
  ];
}

export function compactToolExchangeHistory(history) {
  return history.filter((message) => !(message.parts ?? []).some(
    (part) => part.functionCall || part.functionResponse,
  ));
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
