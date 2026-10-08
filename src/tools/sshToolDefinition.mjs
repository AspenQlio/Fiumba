import { TAILSCALE_SSH_TARGETS } from '../config/tailscaleDevices.mjs';

export const executeSshDeclaration = Object.freeze({
  name: 'execute_ssh',
  description: "Execute a bash command on one allowlisted Tailscale device through pinned-key SSH. Choose media_laptop for Transmission, Ollama or media services; ryoku for Aspen's current laptop; raspberry_pi_1 for Home Assistant or Pi-hole; raspberry_pi_2 for the media SSD, Filebrowser or Scrutiny.",
  parameters: {
    type: 'OBJECT',
    properties: {
      command: {
        type: 'STRING',
        description: 'The bash command to execute remotely',
      },
      target: {
        type: 'STRING',
        enum: Object.keys(TAILSCALE_SSH_TARGETS),
        description: 'Tailscale device: media_laptop, ryoku, raspberry_pi_1 or raspberry_pi_2',
      },
    },
    required: ['target', 'command'],
  },
});
