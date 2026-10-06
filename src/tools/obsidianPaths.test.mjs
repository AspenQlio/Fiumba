import assert from 'node:assert/strict';
import test from 'node:test';

import { findBestNoteMatch, formatVaultIndex } from './obsidianPaths.mjs';

const notes = [
  { name: 'Proyecto Fiumba.md', relativePath: '100 Notes/Proyecto Fiumba.md' },
  { name: 'Fiumba ideas.md', relativePath: '100 Notes/Fiumba ideas.md' },
  { name: 'Diario.md', relativePath: '400 Dates/Diario.md' },
];

test('findBestNoteMatch prefers an exact note name without requiring .md', () => {
  // Given / When
  const match = findBestNoteMatch(notes, 'proyecto fiumba');

  // Then
  assert.equal(match?.relativePath, '100 Notes/Proyecto Fiumba.md');
});

test('findBestNoteMatch falls back to a partial path match', () => {
  // Given / When
  const match = findBestNoteMatch(notes, 'ideas');

  // Then
  assert.equal(match?.relativePath, '100 Notes/Fiumba ideas.md');
});

test('formatVaultIndex returns stable relative paths and excludes non-markdown files', () => {
  // Given
  const entries = [...notes, { name: 'imagen.png', relativePath: 'assets/imagen.png' }];

  // When
  const index = formatVaultIndex(entries);

  // Then
  assert.equal(index, [
    '100 Notes/Fiumba ideas.md',
    '100 Notes/Proyecto Fiumba.md',
    '400 Dates/Diario.md',
  ].join('\n'));
});
