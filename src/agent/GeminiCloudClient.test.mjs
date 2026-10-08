import assert from 'node:assert/strict';
import test from 'node:test';

import { GeminiCloudClient } from './GeminiCloudClient.js';

test('GeminiCloudClient returns native Gemini parts with the pinned lightweight model', async () => {
  // Given
  let requestedUrl = '';
  const fetchImpl = async (url) => {
    requestedUrl = url;
    return {
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Hola, mi niño.' }] } }],
      }),
    };
  };
  const client = new GeminiCloudClient('test-key', undefined, { fetchImpl, timeoutMs: 100 });

  // When
  const parts = await client.generateResponse([
    { role: 'user', parts: [{ text: 'Hola' }] },
  ]);

  // Then
  assert.deepEqual(parts, [{ text: 'Hola, mi niño.' }]);
  assert.match(requestedUrl, /models\/gemini-3\.5-flash-lite:generateContent/);
});

test('GeminiCloudClient rejects stalled requests with a clear timeout error', async () => {
  // Given
  const fetchImpl = (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      reject(error);
    }, { once: true });
  });
  const client = new GeminiCloudClient('test-key', undefined, { fetchImpl, timeoutMs: 5 });

  // When / Then
  await assert.rejects(
    client.generateResponse([{ role: 'user', parts: [{ text: 'Hola' }] }]),
    /Gemini tardó demasiado en responder/,
  );
});
