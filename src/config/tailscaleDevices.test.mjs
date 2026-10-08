import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TAILSCALE_SSH_TARGETS,
  resolveTailscaleSshProfile,
} from './tailscaleDevices.mjs';

test('resolveTailscaleSshProfile returns pinned profiles for every supported device', () => {
  // Given / When
  const profiles = Object.keys(TAILSCALE_SSH_TARGETS).map(resolveTailscaleSshProfile);

  // Then
  assert.equal(profiles.length, 4);
  for (const profile of profiles) {
    assert.match(profile.host, /^100\./);
    assert.equal(profile.port, 22);
    assert.match(profile.knownHosts, new RegExp(`^${profile.host} ssh-ed25519 `));
  }
});

test('resolveTailscaleSshProfile defaults to the media laptop and rejects unknown targets', () => {
  // Given / When / Then
  assert.equal(resolveTailscaleSshProfile().host, '100.94.212.31');
  assert.throws(() => resolveTailscaleSshProfile('internet'), /destino SSH no permitido/i);
});
