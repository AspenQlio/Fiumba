export const LEGACY_OFFLINE_SYSTEM_MESSAGE = 'Cerebro local cargado. Fiumba está operando 100% offline.';
export const CLOUD_SYSTEM_MESSAGE = 'Gemini Cloud conectado. Las herramientas locales están listas. Se requiere internet para conversar.';
export const LOCAL_SYSTEM_MESSAGE = 'Gemma local cargado. Fiumba puede conversar sin internet.';

export function getEngineSystemMessage(engineMode) {
  return engineMode === 'cloud' ? CLOUD_SYSTEM_MESSAGE : LOCAL_SYSTEM_MESSAGE;
}

export function getEngineCapabilityLabel(engineMode) {
  return engineMode === 'cloud' ? 'Requiere internet' : 'IA local';
}

export function normalizeEngineSystemMessages(messages, engineMode) {
  return messages.map(message => (
    message.role === 'system' && message.text === LEGACY_OFFLINE_SYSTEM_MESSAGE
      ? { ...message, text: getEngineSystemMessage(engineMode) }
      : message
  ));
}
