import { createSshProfile } from '../tools/sshProfile.mjs';

export const DEFAULT_TAILSCALE_SSH_TARGET = 'media_laptop';

export const TAILSCALE_SSH_TARGETS = Object.freeze({
  media_laptop: Object.freeze({
    label: 'laptop media',
    host: '100.94.212.31',
    port: 22,
    user: 'aspen',
    knownHosts: '100.94.212.31 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBn2jcYlYTeaLtAYVs+/Zx6kE2T4/5KEypYsTtj35SPI\n',
  }),
  ryoku: Object.freeze({
    label: 'laptop Ryoku',
    host: '100.88.216.122',
    port: 22,
    user: 'aspen',
    knownHosts: '100.88.216.122 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMT60jz7HKmqYzQjK+BT/YzxqmdSPrUuf6AVwJm1iLhV\n',
  }),
  raspberry_pi_1: Object.freeze({
    label: 'Raspberry Pi 1',
    host: '100.84.189.38',
    port: 22,
    user: 'aspen',
    knownHosts: '100.84.189.38 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIB4nA2IkWUd0gy0gqlCLbXCfz2QqD57GYT7t3H2soz8L\n',
  }),
  raspberry_pi_2: Object.freeze({
    label: 'Raspberry Pi 2',
    host: '100.66.109.86',
    port: 22,
    user: 'aspencito',
    knownHosts: '100.66.109.86 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGc2Y8Y3prSTfV+t5GlEiH34dIetybPaL9AuTeU8ylVJ\n',
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
