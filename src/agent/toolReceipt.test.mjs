import assert from 'node:assert/strict';
import test from 'node:test';

import { formatToolReceipt } from './toolReceipt.mjs';

test('formatToolReceipt identifies a verified SSH success with its target and result', () => {
  // Given / When
  const receipt = formatToolReceipt({
    name: 'execute_ssh',
    args: { target: 'ryoku', command: 'printf hola > /home/aspen/prueba.md' },
    ok: true,
    result: 'Código de salida: 0\n\nSTDOUT:\ncreado',
  });

  // Then
  assert.match(receipt, /acción verificada/i);
  assert.match(receipt, /destino: `ryoku`/i);
  assert.match(receipt, /código de salida: 0/i);
});

test('formatToolReceipt makes tool failures explicit', () => {
  // Given / When
  const receipt = formatToolReceipt({
    name: 'execute_ssh',
    args: { target: 'ryoku' },
    ok: false,
    result: 'Auth fail for methods publickey',
  });

  // Then
  assert.match(receipt, /acción fallida/i);
  assert.match(receipt, /auth fail/i);
});
