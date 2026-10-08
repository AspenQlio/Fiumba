import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CLOUD_SYSTEM_MESSAGE,
  getEngineCapabilityLabel,
  normalizeEngineSystemMessages,
} from './engineStatus.mjs';

test('normalizeEngineSystemMessages replaces the obsolete offline claim in cloud sessions', () => {
  // Given
  const messages = [{
    id: '0',
    role: 'system',
    text: 'Cerebro local cargado. Fiumba está operando 100% offline.',
  }];

  // When
  const normalized = normalizeEngineSystemMessages(messages, 'cloud');

  // Then
  assert.equal(normalized[0].text, CLOUD_SYSTEM_MESSAGE);
  assert.equal(getEngineCapabilityLabel('cloud'), 'Requiere internet');
});
