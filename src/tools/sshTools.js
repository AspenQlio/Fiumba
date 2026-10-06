import { Platform } from 'react-native';

import { getSshCredentials } from '../config/localConfiguration';
import { formatSshResult } from './sshProfile.mjs';

let PocketSsh = null;
if (Platform.OS !== 'web') {
  PocketSsh = require('../../modules/pocket-ssh/index');
}

export const execute_ssh_declaration = {
  name: "execute_ssh",
  description: "Execute a bash command on Aspen's pre-configured LAN server through pinned-key SSH.",
  returnResultDirectly: true,
  parameters: {
    type: "OBJECT",
    properties: {
      command: {
        type: "STRING",
        description: "The bash command to execute remotely"
      }
    },
    required: ["command"]
  }
};

export async function execute_ssh_tool(args) {
  const { command } = args;
  if (!command?.trim()) throw new Error("Falta el comando SSH.");

  if (Platform.OS === 'web') {
    return formatSshResult({
      stdout: `[Web Mock] Executed '${command}' successfully.`,
      stderr: "",
      exitCode: 0
    });
  }

  const { profile, privateKey } = await getSshCredentials();
  const result = await PocketSsh.executeCommand(
    profile.host,
    profile.port,
    profile.user,
    privateKey,
    profile.knownHosts,
    command,
  );
  return formatSshResult(result);
}
