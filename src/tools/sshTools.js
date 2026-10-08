import { Platform } from 'react-native';

import { getSshCredentials } from '../config/localConfiguration';
import { formatSshResult } from './sshProfile.mjs';
import { executeSshDeclaration } from './sshToolDefinition.mjs';

let PocketSsh = null;
if (Platform.OS !== 'web') {
  PocketSsh = require('../../modules/pocket-ssh/index');
}

export const execute_ssh_declaration = executeSshDeclaration;

export async function execute_ssh_tool(args) {
  const { command, target } = args;
  if (!command?.trim()) throw new Error("Falta el comando SSH.");

  if (Platform.OS === 'web') {
    return formatSshResult({
      stdout: `[Web Mock] Executed '${command}' successfully.`,
      stderr: "",
      exitCode: 0
    });
  }

  const { profile, privateKey } = await getSshCredentials(target);
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
