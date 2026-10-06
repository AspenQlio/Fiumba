import { requireNativeModule } from 'expo-modules-core';
let PocketSsh = null;
try {
  PocketSsh = requireNativeModule('PocketSsh');
} catch (e) {
  console.warn("PocketSsh native module not found");
}

export async function executeCommand(host, port, user, privateKey, knownHosts, command) {
  if (!PocketSsh) throw new Error("Native module not linked");
  return await PocketSsh.executeCommand(host, port, user, privateKey, knownHosts, command);
}
