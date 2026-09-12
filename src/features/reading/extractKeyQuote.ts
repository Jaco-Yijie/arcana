/** 只摘录完整原句；不改写、不截断、不把生成中的半句话提升为结论。 */
export function extractKeyQuote(text: string): string | null {
  const sentences = text.match(/[^。！？.!?\n]+[。！？.!?]+/g) ?? []
  return sentences.map((s) => s.trim()).find((s) => s.length >= 12 && s.length <= 110) ?? null
}
