import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildServerLlmCommand,
  createServerLlmPayload,
  formatServerLlmSshResult,
  SERVER_LLM_MODEL,
} from './serverLlmCore.mjs';

test('createServerLlmPayload targets the local Ollama model with the user prompt', () => {
  // Given / When
  const payload = createServerLlmPayload('explica un kernel');

  // Then
  assert.equal(payload.model, SERVER_LLM_MODEL);
  assert.equal(payload.stream, false);
  assert.deepEqual(payload.options, { num_predict: 250 });
  assert.equal(payload.messages.at(-1).content, 'explica un kernel');
});

test('buildServerLlmCommand writes a request file and calls Ollama localhost API', () => {
  // Given / When
  const command = buildServerLlmCommand(createServerLlmPayload('hola'));

  // Then
  assert.match(command, /\/tmp\/fiumba_req\.json/);
  assert.match(command, /127\.0\.0\.1:11434\/api\/chat/);
  assert.match(command, /__ELAPSED__/);
});

test('formatServerLlmSshResult returns answer plus elapsed marker', () => {
  // Given
  const result = {
    stdout: '__ELAPSED__ 64.7\nUn kernel administra procesos y memoria.\n',
    stderr: '',
    exitCode: 0,
  };

  // When / Then
  assert.equal(
    formatServerLlmSshResult(result),
    'Un kernel administra procesos y memoria.\n\n(Respuesta del modelo grande en 64.7s)',
  );
});

test('formatServerLlmSshResult fails loudly on remote command errors', () => {
  // Given
  const result = { stdout: '', stderr: 'command not found', exitCode: 127 };

  // When / Then
  assert.throws(
    () => formatServerLlmSshResult(result),
    /código 127.*command not found/,
  );
});
