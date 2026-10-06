import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { createSshProfile, validatePrivateKey } from '../tools/sshProfile.mjs';

const VAULT_URI_KEY = 'fiumba.vault.uri';
const SSH_PROFILE_KEY = 'fiumba.ssh.profile';
const SSH_IDENTITY_STORAGE_KEY = 'fiumba.ssh.identity';
const SECURE_STORE_OPTIONS = { keychainService: 'fiumba.local-configuration' };

export const DEFAULT_SSH_PROFILE = Object.freeze({
  host: '192.168.100.142',
  port: 22,
  user: 'aspen',
  knownHosts: '192.168.100.142 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBn2jcYlYTeaLtAYVs+/Zx6kE2T4/5KEypYsTtj35SPI\n',
});

async function getItem(key) {
  if (Platform.OS === 'web') return null;
  return SecureStore.getItemAsync(key, SECURE_STORE_OPTIONS);
}

async function setItem(key, value) {
  if (Platform.OS === 'web') return;
  await SecureStore.setItemAsync(key, value, SECURE_STORE_OPTIONS);
}

export async function getConfigurationStatus() {
  const [vaultUri, sshProfile, privateKey] = await Promise.all([
    getItem(VAULT_URI_KEY),
    getItem(SSH_PROFILE_KEY),
    getItem(SSH_IDENTITY_STORAGE_KEY),
  ]);

  return {
    vaultConfigured: Boolean(vaultUri),
    sshConfigured: Boolean(sshProfile && privateKey),
  };
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

export async function getSshCredentials() {
  const [serializedProfile, privateKey] = await Promise.all([
    getItem(SSH_PROFILE_KEY),
    getItem(SSH_IDENTITY_STORAGE_KEY),
  ]);
  if (!serializedProfile || !privateKey) {
    throw new Error('SSH no está configurado. Importa la llave desde CONFIG.');
  }

  return {
    profile: createSshProfile(JSON.parse(serializedProfile)),
    privateKey: validatePrivateKey(privateKey),
  };
}
