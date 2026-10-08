import { Platform } from 'react-native';

import { getSshCredentials } from '../config/localConfiguration';
import { buildServerLlmCommand, createServerLlmPayload, formatServerLlmSshResult } from './serverLlmCore.mjs';

let PocketSsh = null;
if (Platform.OS !== 'web') {
  PocketSsh = require('../../modules/pocket-ssh/index');
}

export const ask_server_llm_declaration = {
  name: 'ask_server_llm',
  description:
    "Delega la pregunta del usuario al modelo grande que corre en la laptop local (Ollama via SSH). " +
    "Úsalo cuando el usuario pida razonamiento profundo, análisis, explicaciones extensas, o pida explícitamente " +
    "el 'modelo grande', 'cerebro grande' o 'preguntarle al servidor'. Devuelve la respuesta del servidor tal cual.",
  returnResultDirectly: true,
  parameters: {
    type: 'OBJECT',
    properties: {
      prompt: {
        type: 'STRING',
        description: 'La pregunta o petición exacta del usuario para el modelo grande.',
      },
    },
    required: ['prompt'],
  },
};

export async function ask_server_llm_tool(args) {
  const prompt = args?.prompt;
  if (!prompt?.trim()) throw new Error('Falta la pregunta para el modelo del servidor.');

  if (Platform.OS === 'web') {
    return `[Web Mock] Server LLM answered: ${prompt}`;
  }

  const command = buildServerLlmCommand(createServerLlmPayload(prompt));

  const { profile, privateKey } = await getSshCredentials();
  const result = await PocketSsh.executeCommand(
    profile.host,
    profile.port,
    profile.user,
    privateKey,
    profile.knownHosts,
    command,
  );

  return formatServerLlmSshResult(result);
}
