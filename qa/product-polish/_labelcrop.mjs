import sharp from 'sharp'
/* 从 d2 的 reveal-d1440 before/after 里裁同一位置的一张牌，做标题层对比 */
for (const phase of ['before', 'after']) {
  const src = `qa/product-polish/d2/reveal-d1440-${phase}.png`
  const m = await sharp(src).metadata()
  // 中央底部「现状」那张牌附近（2x 截图）
  const left = Math.round(m.width * 0.40)
  const top = Math.round(m.height * 0.60)
  const w = Math.round(m.width * 0.135)
  const h = Math.round(m.height * 0.33)
  await sharp(src)
    .extract({ left, top, width: w, height: h })
    .resize({ width: 560 })
    .png()
    .toFile(`qa/product-polish/d2/card-label-${phase}.png`)
  console.log(`${phase}: ${m.width}x${m.height} → crop ${w}x${h}`)
}
