import { Platform } from 'react-native';

import { getVaultUri } from '../config/localConfiguration';
import { findBestNoteMatch, formatVaultIndex } from './obsidianPaths.mjs';

let ObsidianAccess = null;
if (Platform.OS !== 'web') {
  // Only require the native module if we are not on web to avoid crashes
  ObsidianAccess = require('../../modules/obsidian-access/index');
}

const MAX_VAULT_ENTRIES = 1000;

async function walkVault(rootUri) {
  const pending = [{ uri: rootUri, relativePath: '' }];
  const entries = [];

  while (pending.length > 0 && entries.length < MAX_VAULT_ENTRIES) {
    const directory = pending.shift();
    const children = await ObsidianAccess.listFiles(directory.uri);

    for (const child of children) {
      if (!child.name || child.name === '.obsidian') continue;
      const relativePath = directory.relativePath
        ? `${directory.relativePath}/${child.name}`
        : child.name;
      const entry = { ...child, relativePath };
      entries.push(entry);
      if (child.isDirectory) {
        pending.push({ uri: child.uri, relativePath });
      }
      if (entries.length >= MAX_VAULT_ENTRIES) break;
    }
  }

  return entries;
}

export const read_note_declaration = {
  name: "read_note",
  description: "Find and read a markdown note from the configured Obsidian vault by its name or path.",
  returnResultDirectly: true,
  parameters: {
    type: "OBJECT",
    properties: {
      query: {
        type: "STRING",
        description: "The note name or a distinctive part of its path"
      }
    },
    required: ["query"]
  }
};

export async function execute_read_note(args) {
  if (Platform.OS === 'web') {
    return `# Mock Note\n\nRequested note: ${args.query}`;
  }

  if (!args.query) throw new Error("Falta el nombre de la nota.");
  const vaultUri = await getVaultUri();
  if (!vaultUri) throw new Error("Obsidian no está configurado. Selecciona el vault desde CONFIG.");

  const entries = await walkVault(vaultUri);
  const match = findBestNoteMatch(entries, args.query);
  if (!match) throw new Error(`No encontré una nota que coincida con “${args.query}”.`);

  const content = await ObsidianAccess.readFile(match.uri);
  return `Nota: ${match.relativePath}\n\n${content}`;
}

export const list_vault_declaration = {
  name: "list_vault",
  description: "List all markdown notes in the configured Obsidian vault.",
  returnResultDirectly: true,
  parameters: {
    type: "OBJECT",
    properties: {}
  }
};

export async function execute_list_vault(args) {
  if (Platform.OS === 'web') {
    return 'Diario.md\nIdeas/Proyecto.md';
  }

  const vaultUri = await getVaultUri();
  if (!vaultUri) throw new Error("Obsidian no está configurado. Selecciona el vault desde CONFIG.");

  const index = formatVaultIndex(await walkVault(vaultUri));
  return index || 'El vault no contiene notas Markdown.';
}
