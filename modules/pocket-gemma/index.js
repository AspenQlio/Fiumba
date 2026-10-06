import { requireNativeModule } from 'expo-modules-core';
let PocketGemma = null;
try {
  PocketGemma = requireNativeModule('PocketGemma');
} catch (e) {
  console.warn("PocketGemma native module not found");
}

export async function loadModel(path) {
  if (!PocketGemma) throw new Error("Native module not linked");
  return await PocketGemma.loadModel(path);
}

export async function generate(prompt) {
  if (!PocketGemma) throw new Error("Native module not linked");
  return await PocketGemma.generate(prompt);
}
