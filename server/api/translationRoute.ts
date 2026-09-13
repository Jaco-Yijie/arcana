import type { IncomingMessage, ServerResponse } from 'node:http'
import { readJsonBody, sendJson, tooManyRequests } from '../http.ts'
import { callDeepSeek } from '../providers/deepseek.ts'
import { parseTranslation, translationMessages, validateTranslationInput } from '../../src/i18n/translation.ts'

export async function handleTranslation(req: IncomingMessage, res: ServerResponse) {
  if (tooManyRequests(req)) { sendJson(res, 429, { ok: false }); return }
  let input
  try { input = validateTranslationInput(await readJsonBody(req)) }
  catch { sendJson(res, 400, { ok: false }); return }
  try {
    const raw = await callDeepSeek(translationMessages(input), { thinking: { type: 'disabled' } })
    sendJson(res, 200, { ok: true, texts: parseTranslation(raw, input.texts.length) })
  } catch { sendJson(res, 503, { ok: false }) }
}
