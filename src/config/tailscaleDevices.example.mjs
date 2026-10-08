import { createSshProfile } from '../tools/sshProfile.mjs';

export const DEFAULT_TAILSCALE_SSH_TARGET = 'my_server';

export const TAILSCALE_SSH_TARGETS = Object.freeze({
  my_server: Object.freeze({
    label: 'Servidor Principal',
    host: '100.x.y.z',
    port: 22,
    user: 'mi_usuario',
    knownHosts: '100.x.y.z ssh-ed25519 AAAAC3..._tu_huella_publica_aqui_',
  }),
});

export function resolveTailscaleSshProfile(target = DEFAULT_TAILSCALE_SSH_TARGET) {
  const normalizedTarget = String(target ?? '').trim() || DEFAULT_TAILSCALE_SSH_TARGET;
  const device = TAILSCALE_SSH_TARGETS[normalizedTarget];
  if (!device) {
    throw new Error(`Destino SSH no permitido: ${normalizedTarget}.`);
  }
  return createSshProfile(device);
}
