const formatterCache = new Map();

function getFormatter(timeZone) {
  const cacheKey = timeZone ?? 'device-local';
  const cachedFormatter = formatterCache.get(cacheKey);
  if (cachedFormatter) return cachedFormatter;

  const formatter = new Intl.DateTimeFormat('es-CL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    ...(timeZone ? { timeZone } : {}),
  });
  formatterCache.set(cacheKey, formatter);
  return formatter;
}

export function formatDeviceTime(date = new Date(), timeZone) {
  return `Ahora es ${getFormatter(timeZone).format(date)}.`;
}
