/**
 * 结构化 JSON 的定向修复。
 *
 * 【为什么需要它】
 * DeepSeek 只支持 `response_format: {type:'json_object'}`，不支持 JSON Schema，
 * 所以「是不是合法 JSON」这件事最终还是要我们自己兜。
 * V2.4 的 10 次 Deep 真实采样里，唯一一次 JSON 失败是这样的：
 *
 *     "answerToQuestion": "……现在更需要的是：一次基于真实的对话。"
 *       "reflectionQuestions": [
 *
 * —— 尾部 `}` 完好，全文 4942 字符，只是**漏了一个逗号**。
 * 为这种错误丢掉一整份 4000 字的解读、让用户重新等 90 秒，是不划算的。
 *
 * 【为什么不用宽松解析器 / 不用正则】
 * 解读正文里大量出现 `"`、`{`、`,`、`：`，还有中文引号。
 * 正则分不清「结构里的逗号」和「正文里的逗号」，一旦改错就是**篡改用户看到的内容** ——
 * 那比解析失败严重得多。所以这里写的是一个知道自己在不在字符串里的状态机：
 * 它只在**结构位置**动手，正文一个字符都不碰。
 *
 * 【修复范围（只有三条，故意窄）】
 * 1. 漏逗号：一个值结束后直接跟下一个值/键
 * 2. 多逗号：`,` 后面直接是 `}` 或 `]`
 * 3. 截断：文本在中途断掉 → 回退到**最后一个完整值**的位置，补齐闭合括号
 *
 * 不做的事：不补缺失的键、不猜字段、不改任何字符串的内容。
 * 修好之后仍然要过 validateReading —— 牌面一致性依旧是不可修复的红线。
 */

export interface RepairResult {
  /** 修复后的 JSON 文本；未修改时与输入相同 */
  text: string
  /** 是否真的动过 */
  changed: boolean
  /** 动了什么，进 QA 日志用 */
  fixes: string[]
}

type FrameType = 'obj' | 'arr'
/**
 * obj: key → colon → value → after → (逗号) → key …
 * arr: value → after → (逗号) → value …
 */
type FrameState = 'key' | 'colon' | 'value' | 'after'

interface Frame {
  type: FrameType
  state: FrameState
}

const WS = new Set([' ', '\t', '\n', '\r'])

function isValueStart(ch: string): boolean {
  return (
    ch === '"' ||
    ch === '{' ||
    ch === '[' ||
    ch === '-' ||
    (ch >= '0' && ch <= '9') ||
    ch === 't' ||
    ch === 'f' ||
    ch === 'n'
  )
}

/**
 * 从 i 处读一个字符串字面量（i 指向开引号）。
 * @returns 结束位置（闭引号的下一位），未闭合则返回 -1
 */
function scanString(src: string, i: number): number {
  let j = i + 1
  while (j < src.length) {
    const ch = src[j]
    if (ch === '\\') {
      j += 2
      continue
    }
    if (ch === '"') return j + 1
    j += 1
  }
  return -1
}

/** 从 i 处读一个数字/true/false/null，返回结束位置 */
function scanLiteral(src: string, i: number): number {
  let j = i
  while (j < src.length) {
    const ch = src[j]
    if (WS.has(ch) || ch === ',' || ch === '}' || ch === ']') break
    j += 1
  }
  return j
}

export function repairJson(input: string): RepairResult {
  const src = input
  const fixes: string[] = []
  let out = ''
  const stack: Frame[] = []

  /**
   * 最近一次「一个值刚刚完整结束」的位置 —— 截断时回退到这里。
   * 用对象包一层：它在闭包里赋值，直接用 let 的话类型收窄会误判成 never。
   */
  const checkpoint: { at: { outLen: number; stack: Frame[] } | null } = { at: null }

  const top = (): Frame | undefined => stack[stack.length - 1]

  /** 一个值读完后的公共收尾 */
  const valueDone = () => {
    const f = top()
    if (f) {
      f.state = 'after'
      checkpoint.at = { outLen: out.length, stack: stack.map((s) => ({ ...s })) }
    }
  }

  let i = 0
  let truncated = false

  while (i < src.length) {
    const ch = src[i]

    if (WS.has(ch)) {
      out += ch
      i += 1
      continue
    }

    const frame = top()

    /* ── 顶层：还没进入任何容器 ─────────────────────────── */
    if (!frame) {
      if (ch === '{' || ch === '[') {
        stack.push({ type: ch === '{' ? 'obj' : 'arr', state: ch === '{' ? 'key' : 'value' })
        out += ch
        i += 1
        continue
      }
      // 顶层的噪声（模型偶尔写一句「好的，结果如下」）直接丢
      out += ''
      i += 1
      continue
    }

    /* ── 期待 key ───────────────────────────────────────── */
    if (frame.type === 'obj' && frame.state === 'key') {
      if (ch === '}') {
        // 上一轮的逗号是多余的：把它从 out 里摘掉
        const trimmed = out.replace(/,(\s*)$/, '$1')
        if (trimmed !== out) fixes.push('删除了对象里多余的逗号')
        out = trimmed + ch
        stack.pop()
        valueDone()
        i += 1
        continue
      }
      if (ch === '"') {
        const end = scanString(src, i)
        if (end === -1) {
          truncated = true
          break
        }
        out += src.slice(i, end)
        frame.state = 'colon'
        i = end
        continue
      }
      // 不认识的东西，跳过，别让它污染结构
      i += 1
      continue
    }

    /* ── 期待冒号 ───────────────────────────────────────── */
    if (frame.state === 'colon') {
      if (ch === ':') {
        out += ch
        frame.state = 'value'
        i += 1
        continue
      }
      // 冒号缺失也补上 —— 但只在这个明确的位置
      out += ':'
      fixes.push('补上了缺失的冒号')
      frame.state = 'value'
      continue
    }

    /* ── 期待值 ─────────────────────────────────────────── */
    if (frame.state === 'value') {
      if (ch === ']' && frame.type === 'arr') {
        const trimmed = out.replace(/,(\s*)$/, '$1')
        if (trimmed !== out) fixes.push('删除了数组里多余的逗号')
        out = trimmed + ch
        stack.pop()
        valueDone()
        i += 1
        continue
      }
      if (ch === '"') {
        const end = scanString(src, i)
        if (end === -1) {
          truncated = true
          break
        }
        out += src.slice(i, end)
        valueDone()
        i = end
        continue
      }
      if (ch === '{' || ch === '[') {
        stack.push({ type: ch === '{' ? 'obj' : 'arr', state: ch === '{' ? 'key' : 'value' })
        out += ch
        i += 1
        continue
      }
      if (isValueStart(ch)) {
        const end = scanLiteral(src, i)
        out += src.slice(i, end)
        valueDone()
        i = end
        continue
      }
      i += 1
      continue
    }

    /* ── 值结束后：期待 `,` 或闭合 ───────────────────────── */
    if (frame.state === 'after') {
      if (ch === ',') {
        out += ch
        frame.state = frame.type === 'obj' ? 'key' : 'value'
        i += 1
        continue
      }
      if ((ch === '}' && frame.type === 'obj') || (ch === ']' && frame.type === 'arr')) {
        out += ch
        stack.pop()
        valueDone()
        i += 1
        continue
      }
      /* ★ 这就是 07 号样本踩到的坑：值结束后直接跟下一个键 ★ */
      if (isValueStart(ch)) {
        out += ','
        fixes.push('补上了漏掉的逗号')
        frame.state = frame.type === 'obj' ? 'key' : 'value'
        continue
      }
      i += 1
      continue
    }

    i += 1
  }

  /* ── 截断处理：回退到最后一个完整值，再补闭合 ──────────── */
  if (truncated || stack.length > 0) {
    if (truncated && checkpoint.at) {
      out = out.slice(0, checkpoint.at.outLen)
      stack.length = 0
      stack.push(...checkpoint.at.stack)
      fixes.push('输出被截断，回退到最后一条完整内容')
    } else if (stack.length > 0) {
      fixes.push('补齐了未闭合的括号')
    }
    while (stack.length > 0) {
      const f = stack.pop()!
      // 回退点保证了这里一定处于「值刚结束」的干净状态
      out += f.type === 'obj' ? '}' : ']'
    }
  }

  const text = out.trim()
  return { text, changed: text !== src.trim(), fixes }
}

/**
 * 先原样解析，失败再修。
 * @returns 解析结果 + 是否动过手；仍然失败则返回 null
 */
export function parseWithRepair(
  raw: string,
): { value: unknown; repaired: boolean; fixes: string[] } | null {
  try {
    return { value: JSON.parse(raw), repaired: false, fixes: [] }
  } catch {
    /* 落到修复路径 */
  }

  const { text, fixes } = repairJson(raw)
  if (text.length === 0) return null
  try {
    return { value: JSON.parse(text), repaired: true, fixes }
  } catch {
    return null
  }
}
