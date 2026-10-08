import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createSshProfile,
  formatSshResult,
  migrateSshProfileHost,
  validatePrivateKey,
} from './sshProfile.mjs';

const knownHost = '192.168.100.142 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBn2jcYlYTeaLtAYVs+/Zx6kE2T4/5KEypYsTtj35SPI';

test('validatePrivateKey accepts an OpenSSH private key and rejects public keys', () => {
  // Given
  const privateKey = '-----BEGIN OPENSSH PRIVATE KEY-----\nabc\n-----END OPENSSH PRIVATE KEY-----';

  // When / Then
  assert.equal(validatePrivateKey(privateKey), privateKey);
  assert.throws(
    () => validatePrivateKey('ssh-ed25519 AAAAC3 public'),
    /llave privada SSH válida/i,
  );
});

test('createSshProfile requires a pinned host key for the configured host', () => {
  // Given / When / Then
  assert.throws(
    () => createSshProfile({
      host: '192.168.100.142',
      port: 22,
      user: 'aspen',
      knownHosts: 'other-host ssh-ed25519 AAAA',
    }),
    /clave pública fijada/i,
  );
});

test('formatSshResult preserves stdout, stderr and exit status', () => {
  // Given / When
  const formatted = formatSshResult({ stdout: 'ok\n', stderr: 'warning\n', exitCode: 3 });

  // Then
  assert.equal(formatted, 'Código de salida: 3\n\nSTDOUT:\nok\n\nSTDERR:\nwarning');
});

test('createSshProfile accepts the verified LAN profile', () => {
  // Given / When
  const profile = createSshProfile({
    host: '192.168.100.142',
    port: 22,
    user: 'aspen',
    knownHosts: knownHost,
  });

  // Then
  assert.deepEqual(profile, {
    host: '192.168.100.142',
    port: 22,
    user: 'aspen',
    knownHosts: knownHost,
  });
});

test('migrateSshProfileHost replaces the legacy LAN host with the pinned Tailscale profile', () => {
  // Given
  const legacyProfile = {
    host: '192.168.100.142',
    port: 22,
    user: 'aspen',
    knownHosts: knownHost,
  };
  const tailscaleKnownHost = '100.94.212.31 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBn2jcYlYTeaLtAYVs+/Zx6kE2T4/5KEypYsTtj35SPI';
  const preferredProfile = {
    host: '100.94.212.31',
    port: 22,
    user: 'aspen',
    knownHosts: tailscaleKnownHost,
  };

  // When
  const migrated = migrateSshProfileHost(legacyProfile, '192.168.100.142', preferredProfile);

  // Then
  assert.deepEqual(migrated, preferredProfile);
});
