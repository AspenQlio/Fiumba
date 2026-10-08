import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const EMBEDDED_GEMINI_API_KEY = "";

import {
  DEFAULT_TAILSCALE_SSH_TARGET,
  resolveTailscaleSshProfile,
} from './tailscaleDevices.mjs';
import { createSshProfile, migrateSshProfileHost, validatePrivateKey } from '../tools/sshProfile.mjs';

const VAULT_URI_KEY = 'fiumba.vault.uri';
const SSH_PROFILE_KEY = 'fiumba.ssh.profile';
const SSH_IDENTITY_STORAGE_KEY = 'fiumba.ssh.identity';
const MODEL_PATH_KEY = 'fiumba.model.path';
const MODEL_TYPE_KEY = 'fiumba.model.type';
const GEMINI_API_KEY_STORAGE_KEY = 'fiumba.gemini.apiKey';
const SYSTEM_PROMPT_STORAGE_KEY = 'fiumba.system.prompt';
const SECURE_STORE_OPTIONS = { keychainService: 'fiumba.local-configuration' };

export const DEFAULT_SYSTEM_PROMPT = "Eres Santi, el asistente Papá Oso en versión móvil. Hablas cálido y siempre en español chileno. Tus respuestas deben ser conversacionales, amables y sin emojis. Cuando Aspen pida realizar una acción técnica y exista una herramienta adecuada, debes llamarla inmediatamente. Nunca digas que vas a revisar, conectarte, crear, leer o ejecutar algo si no emites la llamada de herramienta correspondiente en esa misma respuesta. Después de una herramienta, informa el resultado real; no inventes éxito. Reglas: Eres novio y Papá Oso de Aspen.";

export const DEFAULT_SSH_PROFILE = Object.freeze(
  resolveTailscaleSshProfile(DEFAULT_TAILSCALE_SSH_TARGET),
);

const LEGACY_LAN_SSH_HOST = '192.168.100.142';

async function getItem(key) {
  if (Platform.OS === 'web') return null;
  return SecureStore.getItemAsync(key, SECURE_STORE_OPTIONS);
}

async function setItem(key, value) {
  if (Platform.OS === 'web') return;
  await SecureStore.setItemAsync(key, value, SECURE_STORE_OPTIONS);
}

export async function getConfigurationStatus() {
  const [vaultUri, sshProfile, privateKey, geminiApiKey] = await Promise.all([
    getItem(VAULT_URI_KEY),
    getItem(SSH_PROFILE_KEY),
    getItem(SSH_IDENTITY_STORAGE_KEY),
    getItem(GEMINI_API_KEY_STORAGE_KEY),
  ]);

  return {
    vaultConfigured: Boolean(vaultUri),
    sshConfigured: Boolean(sshProfile && privateKey),
    geminiConfigured: Boolean(geminiApiKey || EMBEDDED_GEMINI_API_KEY),
  };
}

export async function saveGeminiApiKey(apiKey) {
  const normalizedApiKey = String(apiKey ?? '').trim();
  if (!normalizedApiKey) throw new Error('La clave Gemini está vacía.');
  await setItem(GEMINI_API_KEY_STORAGE_KEY, normalizedApiKey);
  return true;
}

export async function getGeminiApiKey() {
  return (await getItem(GEMINI_API_KEY_STORAGE_KEY)) || EMBEDDED_GEMINI_API_KEY;
}

export async function saveSystemPrompt(prompt) {
  const normalizedPrompt = String(prompt ?? '').trim();
  await setItem(SYSTEM_PROMPT_STORAGE_KEY, normalizedPrompt);
  return true;
}

export async function getSystemPrompt() {
  return (await getItem(SYSTEM_PROMPT_STORAGE_KEY)) || DEFAULT_SYSTEM_PROMPT;
}

export async function saveModelConfig(path, type) {
  await setItem(MODEL_PATH_KEY, path);
  await setItem(MODEL_TYPE_KEY, type);
}

export async function getModelConfig() {
  const [path, type] = await Promise.all([
    getItem(MODEL_PATH_KEY),
    getItem(MODEL_TYPE_KEY),
  ]);
  return { path, type };
}

export async function selectAndSaveVault() {
  if (Platform.OS !== 'android') {
    throw new Error('La selección del vault está disponible en Android.');
  }

  const result = await StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!result.granted) return false;

  await setItem(VAULT_URI_KEY, result.directoryUri);
  return true;
}

export async function importAndSaveSshKey() {
  if (Platform.OS === 'web') {
    throw new Error('La importación de llaves SSH requiere la app Android.');
  }

  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return false;

  const privateKey = validatePrivateKey(await new File(result.assets[0].uri).text());
  const profile = createSshProfile(DEFAULT_SSH_PROFILE);
  await Promise.all([
    setItem(SSH_IDENTITY_STORAGE_KEY, privateKey),
    setItem(SSH_PROFILE_KEY, JSON.stringify(profile)),
  ]);
  return true;
}

export async function getVaultUri() {
  return getItem(VAULT_URI_KEY);
}

export async function getSshCredentials(target = DEFAULT_TAILSCALE_SSH_TARGET) {
  const [serializedProfile, privateKey] = await Promise.all([
    getItem(SSH_PROFILE_KEY),
    getItem(SSH_IDENTITY_STORAGE_KEY),
  ]);
  if (!serializedProfile || !privateKey) {
    throw new Error('SSH no está configurado. Importa la llave desde CONFIG.');
  }

  const storedProfile = createSshProfile(JSON.parse(serializedProfile));
  const profile = migrateSshProfileHost(
    storedProfile,
    LEGACY_LAN_SSH_HOST,
    DEFAULT_SSH_PROFILE,
  );

  if (profile.host !== storedProfile.host) {
    await setItem(SSH_PROFILE_KEY, JSON.stringify(profile));
  }

  return {
    profile: resolveTailscaleSshProfile(target),
    privateKey: validatePrivateKey(privateKey),
  };
}
