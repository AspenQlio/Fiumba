import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildGemmaPrompt,
  createDirectToolCall,
  compactDirectToolHistory,
  compactToolExchangeHistory,
  parseGemmaResponse,
  selectToolsForMessage,
} from './gemmaPrompt.mjs';

const tools = [
  { name: 'get_device_time', description: 'Get the current time.' },
  {
    name: 'read_note',
    description: 'Read an Obsidian note.',
    parameters: { required: ['query'] },
  },
  { name: 'list_vault', description: 'List Obsidian files.' },
  {
    name: 'execute_ssh',
    description: 'Run a remote SSH command.',
    parameters: { required: ['command'] },
  },
];

test('buildGemmaPrompt uses Gemma turn tokens without transcript labels', () => {
  // Given
  const history = [{ role: 'user', parts: [{ text: 'Hola como estas?' }] }];

  // When
  const prompt = buildGemmaPrompt(history, 'Responde en español.', []);

  // Then
  assert.match(prompt, /^<start_of_turn>user\n/);
  assert.match(prompt, /Hola como estas\?<end_of_turn>\n<start_of_turn>model\n$/);
  assert.doesNotMatch(prompt, /ASPEN:|SANTI:|<TOOL>/);
});

test('buildGemmaPrompt preserves multi-turn history with explicit boundaries', () => {
  // Given
  const history = [
    { role: 'user', parts: [{ text: 'Hola' }] },
    { role: 'model', parts: [{ text: 'Hola, ¿cómo estás?' }] },
    { role: 'user', parts: [{ text: 'Bien' }] },
  ];

  // When
  const prompt = buildGemmaPrompt(history, 'Sé breve.', []);

  // Then
  assert.equal((prompt.match(/<start_of_turn>user/g) ?? []).length, 2);
  assert.equal((prompt.match(/<start_of_turn>model/g) ?? []).length, 2);
  assert.match(prompt, /Hola, ¿cómo estás\?<end_of_turn>/);
});

test('selectToolsForMessage exposes no tools for a greeting', () => {
  // Given / When
  const selected = selectToolsForMessage('Hola, ¿cómo estás?', tools);

  // Then
  assert.deepEqual(selected, []);
});

test('selectToolsForMessage exposes only the time tool for an explicit time request', () => {
  // Given / When
  const selected = selectToolsForMessage('¿Qué hora es ahora?', tools);

  // Then
  assert.deepEqual(selected.map(({ name }) => name), ['get_device_time']);
});

test('selectToolsForMessage exposes only read_note when a note is requested by name', () => {
  // Given / When
  const selected = selectToolsForMessage('Lee mi nota Proyecto Fiumba en Obsidian', tools);

  // Then
  assert.deepEqual(selected.map(({ name }) => name), ['read_note']);
});

test('selectToolsForMessage exposes only execute_ssh for a server command', () => {
  // Given / When
  const selected = selectToolsForMessage('Corre el comando uptime en el servidor', tools);

  // Then
  assert.deepEqual(selected.map(({ name }) => name), ['execute_ssh']);
});

test('createDirectToolCall routes a parameterless selected tool without model guessing', () => {
  // Given
  const selected = selectToolsForMessage('¿Qué hora es ahora?', tools);

  // When
  const call = createDirectToolCall(selected);

  // Then
  assert.deepEqual(call, { functionCall: { name: 'get_device_time', args: {} } });
});

test('createDirectToolCall extracts an Obsidian note name without model-generated JSON', () => {
  // Given
  const selected = selectToolsForMessage('Lee la nota Commands de Obsidian', tools);

  // When
  const call = createDirectToolCall(selected, 'Lee la nota Commands de Obsidian');

  // Then
  assert.deepEqual(call, { functionCall: { name: 'read_note', args: { query: 'Commands' } } });
});

test('createDirectToolCall extracts a quoted SSH command without exposing host parameters', () => {
  // Given
  const selected = selectToolsForMessage('Corre el comando `uptime` en el servidor', tools);

  // When
  const call = createDirectToolCall(selected, 'Corre el comando `uptime` en el servidor');

  // Then
  assert.deepEqual(call, { functionCall: { name: 'execute_ssh', args: { command: 'uptime' } } });
});

test('parseGemmaResponse rejects an unrequested tool call', () => {
  // Given / When
  const parts = parseGemmaResponse('<TOOL>get_device_time|{}</TOOL>', []);

  // Then
  assert.deepEqual(parts, [{ text: 'No entendí bien la solicitud. Inténtalo de nuevo.' }]);
});

test('parseGemmaResponse accepts an explicitly allowed tool call', () => {
  // Given / When
  const parts = parseGemmaResponse(
    '<TOOL>get_device_time|{}</TOOL><end_of_turn>',
    ['get_device_time'],
  );

  // Then
  assert.deepEqual(parts, [{ functionCall: { name: 'get_device_time', args: {} } }]);
});

test('compactDirectToolHistory removes direct tool payloads from future model context', () => {
  // Given
  const history = [
    { role: 'user', parts: [{ text: '¿Qué notas tengo?' }] },
    { role: 'model', parts: [{ functionCall: { name: 'list_vault', args: {} } }] },
  ];

  // When
  const compacted = compactDirectToolHistory(history);

  // Then
  assert.deepEqual(compacted, [
    { role: 'user', parts: [{ text: '¿Qué notas tengo?' }] },
    { role: 'model', parts: [{ text: 'Acción local completada; el resultado ya fue mostrado.' }] },
  ]);
  assert.doesNotMatch(JSON.stringify(compacted), /list_vault|\.md/);
});

test('compactToolExchangeHistory keeps the user request and final answer only', () => {
  // Given
  const history = [
    { role: 'user', parts: [{ text: 'Lee la nota Commands' }] },
    { role: 'model', parts: [{ functionCall: { name: 'read_note', args: { query: 'Commands' } } }] },
    { role: 'user', parts: [{ functionResponse: { name: 'read_note', response: { result: '# large note' } } }] },
    { role: 'model', parts: [{ text: 'La nota contiene comandos útiles.' }] },
  ];

  // When
  const compacted = compactToolExchangeHistory(history);

  // Then
  assert.deepEqual(compacted, [history[0], history[3]]);
  assert.doesNotMatch(JSON.stringify(compacted), /large note|functionCall|functionResponse/);
});
