/**
 * 继续问这次牌阵 —— Reading 的延伸，不是聊天页
 *
 * ══════════════════════════════════════════════════════════════
 * 【它为什么长这样】
 * D1 把追问判为 REDESIGN，理由是它读起来像「页面底部突然出现的普通聊天输入框」。
 * 底部固定输入条这个形态本身就在暗示「这是一个对话」，
 * 而追问在产品上是**同一次解读的延伸**：牌没变，问题没变，只是又想了一层。
 *
 * 所以这里：
 *   1. 有小节标题（「继续问这次牌阵」），与上面的解读小节同级 ——
 *      它是文档的一部分，不是浮在文档之上的控件
 *   2. 输入框在**文末**随内容滚动，不再 sticky 压住正文（D1 §13 的 P2）
 *   3. 回答标成「牌阵延伸」，视觉上与主体解读区分，但同属一份文档
 *
 * 【为什么不放推荐问题按钮】
 * D1 没有要求，而一排「你可以问……」会把追问推回「功能」而不是「想法」。
 * placeholder 里给一个例子就够了。
 *
 * 【单轮，不是多轮】
 * 每一次追问都独立发送，载荷里没有历史。界面上按时间顺序累积显示，
 * 但那只是**阅读顺序**，不是模型上下文 —— 第二次追问与第一次看到的完全相同（G-13）。
 * ══════════════════════════════════════════════════════════════
 */

import { useRef, useState } from 'react'
import { Button } from '@/components/atoms/Button'
import type { FollowUpMessage } from '@/types/session'

interface Props {
  messages: readonly FollowUpMessage[]
  busy: boolean
  error: string | null
  onSend: (text: string) => void
}

export function FollowUpSection({ messages, busy, error, onSend }: Props) {
  const [pending, setPending] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const submit = () => {
    const text = pending.trim()
    if (!text || busy) return
    onSend(text)
    setPending('')
  }

  return (
    <section className="mt-10 border-t border-line-hairline pt-6">
      <h3 className="font-serif text-[19px] leading-tight text-text-hi">继续问这次牌阵</h3>
      <p className="mt-1.5 text-caption leading-relaxed text-text-faint">
        如果还有没想明白的地方，可以沿着这组牌继续问。牌不会变，也不会重抽。
      </p>

      {messages.length > 0 && (
        <div className="mt-6 flex flex-col gap-5">
          {messages.map((m) =>
            m.role === 'user' ? (
              <div key={m.id} className="flex flex-col gap-1">
                <span className="text-caption tracking-wide-caps text-text-faint">你问</span>
                <p className="text-read text-text-hi">{m.content}</p>
              </div>
            ) : (
              <div key={m.id} className="flex flex-col gap-1.5">
                <span className="text-caption tracking-wide-caps text-silver-dim">牌阵延伸</span>
                {m.content.split(/\n{2,}/).map((p, i) => (
                  <p key={i} className="text-read text-text-mid">
                    {p}
                  </p>
                ))}
              </div>
            ),
          )}
        </div>
      )}

      {/* 加载态：不伪造进度百分比，也不假装是模型思维链（GV2-11） */}
      {busy && (
        <p className="mt-5 text-note text-text-faint" aria-live="polite">
          正在顺着这组牌想一想……
        </p>
      )}

      {/* 真实模型这一次没成功时，如实说 —— 下面仍然会给出本地回答，不留空 */}
      {error && (
        <p className="mt-4 text-caption text-text-faint" role="status">
          {error}
        </p>
      )}

      <div className="mt-6 flex items-end gap-2">
        <input
          ref={inputRef}
          value={pending}
          onChange={(e) => setPending(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submit()
            }
          }}
          disabled={busy}
          aria-label="继续问这次牌阵"
          placeholder={
            messages.length === 0 ? '例如：那我最需要注意的是什么？' : '再问一个问题…'
          }
          className="h-12 min-w-0 flex-1 rounded-sm border border-line-hairline bg-bg-void/50 px-3.5 text-read text-text-hi outline-none transition-colors duration-[var(--duration-quick)] placeholder:text-text-faint focus:border-silver/40 disabled:opacity-50"
        />
        <Button size="md" variant="quiet" onClick={submit} disabled={!pending.trim() || busy}>
          发送
        </Button>
      </div>
    </section>
  )
}
