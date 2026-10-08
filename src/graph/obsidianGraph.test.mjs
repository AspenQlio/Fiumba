import assert from 'node:assert/strict';
import test from 'node:test';

import { buildObsidianGraph } from './obsidianGraph.mjs';

test('buildObsidianGraph resolves paths, aliases, headings and unresolved wikilinks', () => {
  // Given
  const notes = [
    { path: 'Inicio.md', content: 'Ve a [[Proyectos/Fiumba|Fiumba]] y [[Pendiente#Idea]].' },
    { path: 'Proyectos/Fiumba.md', content: 'Regresa a [[Inicio]].' },
  ];

  // When
  const graph = buildObsidianGraph(notes);

  // Then
  assert.deepEqual(graph.nodes.map(node => node.id), [
    'Inicio',
    'Proyectos/Fiumba',
    'unresolved:Pendiente',
  ]);
  assert.deepEqual(graph.edges, [
    { source: 'Inicio', target: 'Proyectos/Fiumba' },
    { source: 'Inicio', target: 'unresolved:Pendiente' },
    { source: 'Proyectos/Fiumba', target: 'Inicio' },
  ]);
  assert.equal(graph.nodes.at(-1).unresolved, true);
});
