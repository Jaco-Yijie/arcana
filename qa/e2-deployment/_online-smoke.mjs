/**
 * E2 · 远端 R2 模式下的真实验证（§8 §9 §10）
 * 服务端仍是本地 npm start（托管 dist + /api），但牌面全部走 R2。
 * 验证：资产确实来自 R2、thumb+full 两档都在、D5 预取未被破坏。
 */
import { writeFileSync } from 'node:fs'
const PW = process.env.PW_CORE || '/Users/wangyijie/.npm/_npx/31e32ef8478fbf80/node_modules/playwright-core/index.mjs'
const { chromium } = await import(PW)
const BASE = process.env.APP_URL || 'https://arcana-e190.onrender.com'
const R2 = 'https://pub-17c0bf59be5e46f2a771ac7d2f068072.r2.dev'
const PROFILE = process.argv[2] || 'slow4g'
const NET = { fast4g:{latency:60,downloadThroughput:4e6/8,uploadThroughput:1e6/8},
              slow4g:{latency:150,downloadThroughput:1.5e6/8,uploadThroughput:75e4/8} }[PROFILE]

const b = await chromium.launch({ channel: 'chrome' })
const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:3 })
const page = await ctx.newPage()
const cdp = await ctx.newCDPSession(page)
await cdp.send('Network.enable'); await cdp.send('Network.clearBrowserCache')
await cdp.send('Network.emulateNetworkConditions', { offline:false, ...NET })
const W = (ms) => page.waitForTimeout(ms)

const art = []
page.on('request', (r) => {
  const u = r.url()
  if (/\.webp/.test(u)) art.push({ url:u, from: u.startsWith(R2) ? 'R2' : (u.startsWith(BASE) ? 'LOCAL' : 'OTHER'),
    variant: /\/cards\//.test(u) ? 'full' : /\/thumbs\//.test(u) ? 'thumb' : 'other', at: Date.now() })
})
const bad = []
page.on('response', (r) => { if (r.status() >= 400 && /\.webp|\/api\//.test(r.url())) bad.push(`${r.status()} ${r.url().slice(0,110)}`) })
const errs = []
page.on('console', (m) => { if (m.type()==='error') errs.push(m.text().slice(0,160)) })
page.on('pageerror', (e) => errs.push('pageerror: '+e.message.slice(0,160)))

await page.goto(BASE+'/', { waitUntil:'networkidle', timeout:120000 })
await page.evaluate(() => localStorage.clear())
await page.goto(BASE+'/', { waitUntil:'networkidle' }); await W(1200)
await page.getByText('带着问题来').click()
await page.waitForURL(/\/(decks|question)/, {timeout:20000}); await W(2500)

/* §8 Deck Library 的牌面来源 */
const libArt = art.filter(a=>a.variant!=='other')
console.log(`[Deck Library] 牌面请求 ${libArt.length} 个 · 来自 R2 ${libArt.filter(a=>a.from==='R2').length} · 来自本站 ${libArt.filter(a=>a.from==='LOCAL').length}`)
const libBroken = await page.evaluate(()=>[...document.querySelectorAll('img')].filter(i=>i.complete&&i.naturalWidth===0).length)
console.log(`[Deck Library] 加载失败 ${libBroken} 张`)

await page.getByRole('button',{name:'就用这副'}).click()
await page.waitForURL('**/question**',{timeout:20000}); await W(1200)
const ta = page.locator('textarea').first(); await ta.click()
await ta.fill('我最近在考虑要不要换一份工作，但又怕现在这份的稳定是我唯一的依靠。我该怎么想这件事？')
await page.getByRole('button',{name:'继续'}).click(); await W(2200)
await page.getByRole('button',{name:'用优化后的'}).click(); await W(1800)
await page.getByRole('button',{name:/二选一/}).first().click(); await W(1800)
await page.getByRole('button',{name:'直接开始'}).click()
await page.waitForURL('**/table/shuffle',{timeout:20000}); await W(1500)
for(let i=0;i<30;i++){await page.keyboard.press('Tab');await W(110)
  const l=await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')??''); if(/牌堆/.test(l))break}
for(let i=0;i<8;i++){await page.keyboard.press('Enter');await W(360)}
await W(700); await page.getByRole('button',{name:'洗好了'}).click()
await page.waitForURL('**/table/cut',{timeout:20000}); await W(1300)
for(let i=0;i<30;i++){await page.keyboard.press('Tab');await W(110)
  const l=await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')??''); if(/切牌位置/.test(l))break}
await page.keyboard.press('Enter'); await W(500)
for(let i=0;i<4;i++){await page.keyboard.press('ArrowDown');await W(200)}
await page.getByRole('button',{name:'从这里切开'}).click(); await W(2000)
await page.getByRole('button',{name:'合起来'}).click(); await W(1700)
await page.getByRole('button',{name:'摊开牌'}).click()
await page.waitForURL('**/table/draw',{timeout:30000}); await W(3000)

/* §9 §10 摆牌 → 预取窗口 */
art.length = 0
let placed = 0
for(let i=0;i<6;i++){
  if(await page.getByRole('button',{name:'去翻牌'}).count())break
  let f=false
  for(let k=0;k<30;k++){await page.keyboard.press('Tab');await W(110)
    const l=await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')??''); if(/摊开的牌/.test(l)){f=true;break}}
  if(!f)break
  for(let k=0;k<i*3;k++){await page.keyboard.press('ArrowRight');await W(90)}
  await page.keyboard.press('Enter'); await W(900)
  const slot=page.getByRole('button',{name:/把这张牌放到/}).first()
  if(!(await slot.count()))break
  await slot.click(); await W(1000); placed++
}
const tPlaced = Date.now()
await W(4000)
/* 【窗口不能只往回看 500ms】预取是在**最后一次落位之后的那段等待里**触发的，
   而那段等待发生在循环内部，早于 tPlaced。D5 已经踩过一次这个坑：
   窗口设窄了会把预取请求整个漏掉，测出来永远是「0 个」。
   这里改成统计整个摆牌阶段（art 在循环前已清空），不再按时间切。 */
const pre = art.filter(a=>a.variant!=='other')
console.log(`\n[摆牌] ${placed} 张`)
console.log(`[预取] 整个摆牌阶段：full ${pre.filter(a=>a.variant==='full').length} · thumb ${pre.filter(a=>a.variant==='thumb').length} · 全部来自 R2: ${pre.every(a=>a.from==='R2')}`)

await page.getByRole('button',{name:'去翻牌'}).click()
await page.waitForURL('**/table/reveal',{timeout:20000}); await W(1500)
art.length=0
const btn=page.getByRole('button',{name:'翻开这张牌'}).first()
const box=await btn.boundingBox()
const tClick=Date.now()
await page.mouse.click(box.x+box.width/2, box.y+box.height/2)
let visAt=null,variant=null,blank=0
for(let i=0;i<40;i++){await W(100)
  const st=await page.evaluate(()=>{const imgs=[...document.querySelectorAll('img')].filter(i=>/\.webp/.test(i.currentSrc))
    const p=imgs.filter(i=>i.complete&&i.naturalWidth>0&&i.getBoundingClientRect().width>40)
    return {n:p.length, v:p[0]?(/\/thumbs\//.test(p[0].currentSrc)?'thumb':'full'):null, src:p[0]?.currentSrc??null}})
  if(st.n===0)blank++
  if(st.n>0&&visAt===null){visAt=Date.now()-tClick;variant=st.v}
  if(visAt!==null&&i>15)break}
const revealSrc = await page.evaluate(()=>[...document.querySelectorAll('img')].filter(i=>/\.webp/.test(i.currentSrc)).map(i=>i.currentSrc)[0]??null)
console.log(`[翻牌] 点击→可见 ${visAt}ms（${variant}）· 空白帧 ${blank}/17 · 点击后新请求 ${art.length}`)
console.log(`[翻牌] 牌面 src: ${revealSrc}`)
console.log(`[翻牌] 来源是 R2: ${revealSrc?.startsWith(R2)}`)

const all=art.concat(pre)
writeFileSync('/Users/wangyijie/Desktop/arcana/qa/e2-deployment/online-network.json', JSON.stringify({
  mode:'Render public URL + Cloudflare R2 artwork', profile:PROFILE, r2Base:R2,
  deckLibrary:{ requests:libArt.length, fromR2:libArt.filter(a=>a.from==='R2').length,
    fromLocal:libArt.filter(a=>a.from==='LOCAL').length, broken:libBroken },
  prefetch:{ placed, fullAfterPlacement:pre.filter(a=>a.variant==='full').length,
    thumbAfterPlacement:pre.filter(a=>a.variant==='thumb').length, allFromR2:pre.every(a=>a.from==='R2') },
  reveal:{ clickToVisibleMs:visAt, variant, blankSamples:blank, requestsAfterClick:art.length,
    src:revealSrc, fromR2: revealSrc?.startsWith(R2) ?? false },
  anyLocalArtworkRequest: libArt.concat(pre).some(a=>a.from==='LOCAL'),
  failedRequests:bad, consoleErrors:errs,
},null,2))
console.log(`\n[汇总] 是否有任何牌面来自本站 /assets/decks: ${libArt.concat(pre).some(a=>a.from==='LOCAL')}`)
console.log(`[汇总] 失败请求 ${bad.length} · console error ${errs.length}`)
if(bad.length)console.log('  '+bad.slice(0,5).join('\n  '))
await b.close()
