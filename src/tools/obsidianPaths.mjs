function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\.md$/i, '')
    .trim()
    .toLocaleLowerCase('es-CL');
}

export function findBestNoteMatch(entries, query) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return null;

  const markdownEntries = entries.filter(({ name }) => /\.md$/i.test(name));
  return markdownEntries.find(({ name }) => normalize(name) === normalizedQuery)
    ?? markdownEntries.find(({ relativePath }) => normalize(relativePath).includes(normalizedQuery))
    ?? null;
}

export function formatVaultIndex(entries) {
  return entries
    .filter(({ name }) => /\.md$/i.test(name))
    .map(({ relativePath }) => relativePath)
    .sort((left, right) => left.localeCompare(right, 'es-CL'))
    .join('\n');
}
