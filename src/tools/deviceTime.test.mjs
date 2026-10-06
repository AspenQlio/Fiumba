import assert from 'node:assert/strict';
import test from 'node:test';

import { formatDeviceTime } from './deviceTime.mjs';

test('formatDeviceTime renders the exact local date and time', () => {
  // Given
  const instant = new Date('2026-10-06T01:49:37.000Z');

  // When
  const result = formatDeviceTime(instant, 'America/Santiago');

  // Then
  assert.match(result, /lunes,? 5 de octubre de 2026/i);
  assert.match(result, /22:49:37/);
});
