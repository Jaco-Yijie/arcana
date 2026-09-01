import sharp from 'sharp'
const src = 'qa/product-polish/mobile/17-1-flip-m390.png'
const m = await sharp(src).metadata()
console.log('src', m.width + 'x' + m.height)
// 现状牌位（deviceScaleFactor=2，坐标按 2x）
await sharp(src)
  .extract({ left: 306, top: 690, width: 172, height: 268 })
  .resize({ width: 720 })
  .png()
  .toFile('qa/product-polish/reading/card-label-overlap-zoom.png')
console.log('ok')
