import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildGeminiGenerateContentRequest,
  buildGeminiGenerateContentUrl,
  parseGeminiGenerateContentResponse,
} from './geminiRest.mjs';

test('buildGeminiGenerateContentRequest sends the prompt as user content', () => {
  // Given / When
  const request = buildGeminiGenerateContentRequest([{role: 'user', parts: [{text: 'hola'}]}]);

  // Then
  assert.equal(request.contents[0].role, 'user');
  assert.equal(request.contents[0].parts[0].text, 'hola');
});

test('buildGeminiGenerateContentRequest preserves Gemini thought signatures on function calls', () => {
  // Given
  const thoughtSignature = 'opaque-signature-from-gemini';
  const history = [
    {
      role: 'model',
      parts: [
        {
          functionCall: { name: 'execute_ssh', args: { command: 'hostname' }, id: 'call_123' },
          thoughtSignature,
        },
      ],
    },
  ];

  // When
  const request = buildGeminiGenerateContentRequest(history);

  // Then
  assert.equal(request.contents[0].parts[0].thoughtSignature, thoughtSignature);
});

test('buildGeminiGenerateContentUrl targets the Gemini generateContent REST endpoint', () => {
  // Given / When
  const url = buildGeminiGenerateContentUrl('secret key', 'gemini-flash-latest');

  // Then
  assert.match(url, /^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-flash-latest:generateContent\?/);
  assert.match(url, /key=secret%20key$/);
});

test('parseGeminiGenerateContentResponse returns concatenated text parts', () => {
  // Given
  const payload = {
    candidates: [
      { content: { parts: [{ text: 'Hola ' }, { text: 'mi niño.' }] } },
    ],
  };

  // When / Then
  assert.deepEqual(parseGeminiGenerateContentResponse(payload), [{ text: 'Hola ' }, { text: 'mi niño.' }]);
});

test('parseGeminiGenerateContentResponse fails loudly when Gemini returns no text', () => {
  // Given
  const payload = { candidates: [{ finishReason: 'SAFETY', content: { parts: [] } }] };

  // When / Then
  assert.throws(() => parseGeminiGenerateContentResponse(payload), /finishReason=SAFETY/);
});
