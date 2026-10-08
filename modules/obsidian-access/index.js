import { requireNativeModule } from 'expo-modules-core';
let ObsidianAccess = null;
try {
  ObsidianAccess = requireNativeModule('ObsidianAccess');
} catch (e) {
  console.warn("ObsidianAccess native module not found");
}

export async function readFile(uriString) {
  if (!ObsidianAccess) throw new Error("Native module not linked");
  return await ObsidianAccess.readFile(uriString);
}

export async function writeFile(dirUriString, fileName, content) {
  if (!ObsidianAccess) throw new Error("Native module not linked");
  return await ObsidianAccess.writeFile(dirUriString, fileName, content);
}

export async function listFiles(uriString) {
  if (!ObsidianAccess) throw new Error("Native module not linked");
  return await ObsidianAccess.listFiles(uriString);
}
