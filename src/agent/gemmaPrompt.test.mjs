import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildGemmaPrompt,
  compactToolExchangeHistory,
  parseGemmaResponse,
  prepareLocalGenerationHistory,
} from './gemmaPrompt.mjs';

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

test('prepareLocalGenerationHistory keeps the latest user turn and removes server/tool pollution', () => {
  // Given
  const history = [
    { role: 'user', parts: [{ text: 'explicame en detalle que es un kernel' }] },
    { role: 'model', parts: [{ text: 'Respuesta larga del servidor.\n\n(Respuesta del modelo grande en 91.2s)' }] },
    { role: 'user', parts: [{ text: 'revisa descargas' }] },
    { role: 'model', parts: [{ text: 'Código de salida: 127\n\nSTDERR:\ncommand not found' }] },
    { role: 'error', parts: [{ text: '[Error]: algo raro' }] },
    { role: 'user', parts: [{ text: 'hola' }] },
  ];

  // When
  const prepared = prepareLocalGenerationHistory(history);

  // Then
  assert.deepEqual(prepared, [
    { role: 'user', parts: [{ text: 'hola' }] },
  ]);
});
