const WIKILINK_PATTERN = /!?\[\[([^\]]+)\]\]/g;

function normalizeNoteId(path) {
  return String(path ?? '')
    .replace(/\\/g, '/')
    .replace(/\.md$/i, '')
    .replace(/^\/+|\/+$/g, '');
}

function normalizeLinkTarget(rawTarget) {
  return normalizeNoteId(
    String(rawTarget ?? '')
      .split('|', 1)[0]
      .split('#', 1)[0]
      .trim(),
  );
}

function noteLabel(id) {
  return id.split('/').at(-1) || id;
}

export function buildObsidianGraph(notes, { maxNodes = 40, maxEdges = 80 } = {}) {
  const normalizedNotes = notes
    .map(note => ({ id: normalizeNoteId(note.path), content: String(note.content ?? '') }))
    .filter(note => note.id)
    .slice(0, maxNodes);
  const knownIds = new Map(normalizedNotes.map(note => [note.id.toLocaleLowerCase(), note.id]));
  const basenameIds = new Map();

  for (const note of normalizedNotes) {
    const basename = noteLabel(note.id).toLocaleLowerCase();
    if (!basenameIds.has(basename)) basenameIds.set(basename, note.id);
  }

  const nodes = normalizedNotes.map(note => ({
    id: note.id,
    label: noteLabel(note.id),
    unresolved: false,
  }));
  const unresolvedIds = new Set();
  const edges = [];

  for (const note of normalizedNotes) {
    for (const match of note.content.matchAll(WIKILINK_PATTERN)) {
      const rawTarget = normalizeLinkTarget(match[1]);
      if (!rawTarget) continue;

      const target = knownIds.get(rawTarget.toLocaleLowerCase())
        ?? basenameIds.get(noteLabel(rawTarget).toLocaleLowerCase());
      const targetId = target ?? `unresolved:${rawTarget}`;

      if (!target && !unresolvedIds.has(targetId) && nodes.length < maxNodes) {
        unresolvedIds.add(targetId);
        nodes.push({ id: targetId, label: noteLabel(rawTarget), unresolved: true });
      }
      if ((target || unresolvedIds.has(targetId)) && edges.length < maxEdges) {
        edges.push({ source: note.id, target: targetId });
      }
    }
  }

  return { nodes, edges };
}
