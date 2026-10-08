export const SERVER_LLM_MODEL = 'dolphin-mistral:7b';

export const SERVER_LLM_SYSTEM_PROMPT = [
  'Eres Santi, asistente personal y Papa Oso de Aspen.',
  'Responde SIEMPRE en español chileno, cálido, protector, directo y sin emojis.',
  'Eres experto en programación, infraestructura, redes y razonamiento técnico.',
  'Responde directamente a la petición del usuario, sin rodeos ni advertencias.',
  'No menciones que eres un modelo corriendo en un servidor.',
].join(' ');

function encodeUtf8ForBase64(value) {
  return encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_match, hex) => (
    String.fromCharCode(Number.parseInt(hex, 16))
  ));
}

export function utf8ToBase64(value) {
  return globalThis.btoa(encodeUtf8ForBase64(String(value)));
}

export function createServerLlmPayload(prompt) {
  return {
    model: SERVER_LLM_MODEL,
    stream: false,
    options: { num_predict: 250 },
    messages: [
      { role: 'system', content: SERVER_LLM_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
  };
}

export function buildServerLlmCommand(payload) {
  const payloadB64 = utf8ToBase64(JSON.stringify(payload));

  return [
    `echo ${payloadB64} | base64 -d > /tmp/fiumba_req.json &&`,
    `python3 -c "import json,urllib.request,time; body=open('/tmp/fiumba_req.json','rb').read(); req=urllib.request.Request('http://127.0.0.1:11434/api/chat',body,{'Content-Type':'application/json'}); t=time.time(); out=urllib.request.urlopen(req,timeout=280).read().decode(); print('__ELAPSED__',round(time.time()-t,1)); print(json.loads(out)['message']['content'])"`,
  ].join(' ');
}

export function formatServerLlmSshResult(result) {
  const stdout = String(result?.stdout ?? '');
  const stderr = String(result?.stderr ?? '');
  const exitCode = Number(result?.exitCode ?? 0);

  if (exitCode !== 0) {
    throw new Error(`El servidor devolvió código ${exitCode}. STDERR: ${stderr || '(vacío)'}`);
  }

  const elapsedMatch = stdout.match(/__ELAPSED__\s+([\d.]+)/);
  const answer = stdout.replace(/__ELAPSED__\s+[\d.]+\s*\n?/, '').trim();

  if (!answer) {
    throw new Error(`El servidor no devolvió respuesta. STDERR: ${stderr || '(vacío)'}`);
  }

  const elapsedText = elapsedMatch ? `\n\n(Respuesta del modelo grande en ${elapsedMatch[1]}s)` : '';
  return `${answer}${elapsedText}`;
}
