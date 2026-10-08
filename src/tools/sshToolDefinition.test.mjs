import assert from 'node:assert/strict';
import test from 'node:test';

import { executeSshDeclaration } from './sshToolDefinition.mjs';

test('execute_ssh requires an allowlisted Tailscale target', () => {
  // Given / When
  const targetSchema = executeSshDeclaration.parameters.properties.target;

  // Then
  assert.deepEqual(executeSshDeclaration.parameters.required, ['target', 'command']);
  assert.deepEqual(targetSchema.enum, [
    'media_laptop',
    'ryoku',
    'raspberry_pi_1',
    'raspberry_pi_2',
  ]);
});
