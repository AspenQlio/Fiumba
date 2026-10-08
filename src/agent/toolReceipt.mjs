const MAX_RESULT_LENGTH = 1_500;

function stringifyResult(result) {
  const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
  const normalized = String(text ?? '').trim() || '(sin salida)';
  return normalized.length > MAX_RESULT_LENGTH
    ? `${normalized.slice(0, MAX_RESULT_LENGTH)}\n…resultado truncado…`
    : normalized;
}

export function formatToolReceipt({ name, args = {}, ok, result }) {
  const title = ok ? 'Acción verificada' : 'Acción fallida';
  const details = [`- Herramienta: \`${name}\``];

  if (args.target) details.push(`- Destino: \`${args.target}\``);
  if (args.command) details.push(`- Comando: \`${args.command}\``);

  return [
    `### ${title}`,
    ...details,
    '',
    '```text',
    stringifyResult(result),
    '```',
  ].join('\n');
}
