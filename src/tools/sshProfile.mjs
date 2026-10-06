const PRIVATE_KEY_PATTERN = /^-----BEGIN (?:OPENSSH |RSA |EC |DSA )?PRIVATE KEY-----[\s\S]+-----END (?:OPENSSH |RSA |EC |DSA )?PRIVATE KEY-----$/;

export function validatePrivateKey(value) {
  const privateKey = String(value ?? '').trim();
  if (!PRIVATE_KEY_PATTERN.test(privateKey)) {
    throw new Error('Selecciona una llave privada SSH válida, no una llave pública.');
  }
  return privateKey;
}

export function createSshProfile({ host, port, user, knownHosts }) {
  const normalizedHost = String(host ?? '').trim();
  const normalizedUser = String(user ?? '').trim();
  const normalizedKnownHosts = String(knownHosts ?? '').trim();
  const normalizedPort = Number(port);

  if (!normalizedHost || !normalizedUser) {
    throw new Error('El host y el usuario SSH son obligatorios.');
  }
  if (!Number.isInteger(normalizedPort) || normalizedPort < 1 || normalizedPort > 65535) {
    throw new Error('El puerto SSH debe estar entre 1 y 65535.');
  }

  const expectedHostToken = normalizedPort === 22
    ? normalizedHost
    : `[${normalizedHost}]:${normalizedPort}`;
  const hasPinnedHost = normalizedKnownHosts
    .split(/\r?\n/)
    .some((line) => line.trim().split(/\s+/)[0]?.split(',').includes(expectedHostToken));
  if (!hasPinnedHost) {
    throw new Error('Falta la clave pública fijada para el host SSH configurado.');
  }

  return {
    host: normalizedHost,
    port: normalizedPort,
    user: normalizedUser,
    knownHosts: normalizedKnownHosts,
  };
}

export function formatSshResult({ stdout, stderr, exitCode }) {
  return [
    `Código de salida: ${Number(exitCode)}`,
    `STDOUT:\n${String(stdout ?? '').trim()}`,
    `STDERR:\n${String(stderr ?? '').trim()}`,
  ].join('\n\n');
}
