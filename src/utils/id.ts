/** 生成本地唯一 id。仅用于 Session / 消息标识，与抽牌随机无关。 */
export function createId(prefix = 'id'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14)
  return `${prefix}_${Date.now().toString(36)}_${rand}`
}
