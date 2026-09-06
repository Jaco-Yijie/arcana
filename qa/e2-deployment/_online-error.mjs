/**
 * E2 · 线上错误恢复验收（§35）
 * 不删除真实 Secret。用 route 拦截制造故障，确认牌 / 问题 / 牌阵 / 正逆位全部保留。
 */
import { writeFileSync } from 'node:fs'
const PW = process.env.PW_CORE || '/Users/wangyijie/.npm/_npx/31e32ef8478fbf80/node_modules/playwright-core/index.mjs'
const { chromium } = await import(PW)
const APP = process.env.APP_URL || 'https://arcana-e190.onrender.com'
const b = await chromium.launch({ channel:'chrome' })
const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:3 })
const page = await ctx.newPage(); const W=(ms)=>page.waitForTimeout(ms)
await page.route('**/api/tarot/reading**', r=>r.abort('failed'))
await page.goto(APP+'/',{waitUntil:'networkidle',timeout:120000}); await W(1200)
await page.evaluate(()=>localStorage.clear()); await page.goto(APP+'/',{waitUntil:'networkidle'}); await W(1200)
await page.getByText('带着问题来').click(); await page.waitForURL(/\/(decks|question)/,{timeout:30000}); await W(2000)
await page.getByRole('button',{name:'就用这副'}).click(); await page.waitForURL('**/question**',{timeout:30000}); await W(1400)
const Q='我最近在考虑要不要换一份工作，但又怕现在这份的稳定是我唯一的依靠。我该怎么想这件事？'
const ta=page.locator('textarea').first(); await ta.click(); await ta.fill(Q)
await page.getByRole('button',{name:'继续'}).click(); await W(2500)
await page.getByRole('button',{name:'用优化后的'}).click(); await W(2000)
await page.getByRole('button',{name:/过去|三张|二选一/}).first().click(); await W(2000)
await page.getByRole('button',{name:'直接开始'}).click()
await page.waitForURL('**/table/shuffle',{timeout:30000}); await W(1500)
for(let i=0;i<30;i++){await page.keyboard.press('Tab');await W(110)
  const l=await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')??''); if(/牌堆/.test(l))break}
for(let i=0;i<8;i++){await page.keyboard.press('Enter');await W(360)}
await W(700); await page.getByRole('button',{name:'洗好了'}).click()
await page.waitForURL('**/table/cut',{timeout:30000}); await W(1400)
for(let i=0;i<30;i++){await page.keyboard.press('Tab');await W(110)
  const l=await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')??''); if(/切牌位置/.test(l))break}
await page.keyboard.press('Enter'); await W(500)
for(let i=0;i<4;i++){await page.keyboard.press('ArrowDown');await W(200)}
await page.getByRole('button',{name:'从这里切开'}).click(); await W(2200)
await page.getByRole('button',{name:'合起来'}).click(); await W(1800)
await page.getByRole('button',{name:'摊开牌'}).click()
await page.waitForURL('**/table/draw',{timeout:40000}); await W(3000)
for(let i=0;i<6;i++){
  if(await page.getByRole('button',{name:'去翻牌'}).count())break
  let f=false
  for(let k=0;k<30;k++){await page.keyboard.press('Tab');await W(110)
    const l=await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')??''); if(/摊开的牌/.test(l)){f=true;break}}
  if(!f)break
  for(let k=0;k<i*3;k++){await page.keyboard.press('ArrowRight');await W(90)}
  await page.keyboard.press('Enter'); await W(900)
  const s=page.getByRole('button',{name:/把这张牌放到/}).first(); if(!(await s.count()))break
  await s.click(); await W(1000)}
await page.getByRole('button',{name:'去翻牌'}).click()
await page.waitForURL('**/table/reveal',{timeout:30000}); await W(2000)
for(let i=0;i<6;i++){const f=page.getByRole('button',{name:'翻开这张牌'}).first()
  if(!(await f.count()))break; const bb=await f.boundingBox(); if(!bb)break
  await page.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await W(1400)
  await page.keyboard.press('Escape'); await W(600)}
await W(800)
const snap=()=>page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('arcana:active-session')||'null')
  return s?{id:s.id,question:s.question,spreadId:s.spreadId,
    cards:(s.placements||[]).map(p=>s.deck[p.deckIndex]?.cardId),
    orientations:(s.placements||[]).map(p=>s.deck[p.deckIndex]?.orientation)}:null})
const before=await snap()
await page.getByRole('button',{name:/开始完整解读|解读/}).first().click()
await page.waitForURL('**/reading',{timeout:30000}); await W(1200)
const d=page.getByRole('button',{name:/标准解读/}).first(); if(await d.count()){await d.click();await W(800)}
await page.getByRole('button',{name:'开始解读'}).click()
for(let i=0;i<40;i++){await W(2000)
  const t=await page.evaluate(()=>document.body.innerText)
  if(/重新|再试|失败|没有成功|没有连上/.test(t))break}
const err=await page.evaluate(()=>({text:document.body.innerText,
  controls:[...document.querySelectorAll('button')].map(b=>b.innerText.trim()).filter(Boolean)}))
const after=await snap()
const same=JSON.stringify(before)===JSON.stringify(after)
console.log(`[错误面板] ${err.text.replace(/\n+/g,' | ').slice(0,240)}`)
console.log(`[控件] ${err.controls.join(' | ')}`)
console.log(`[暴露 HTTP 码] ${/HTTP|\b(401|403|429|500|502|503)\b/.test(err.text)?'❌ 是':'✅ 否'}`)
console.log(`[明说牌保留] ${/牌仍然保留|仍然保留/.test(err.text)?'✅ 是':'⚠ 否'}`)
console.log(`[不变量] 牌/正逆位/问题/牌阵/会话 全部保留: ${same?'✅':'❌'}`)
console.log(`  cards: ${JSON.stringify(after?.cards)}`)
console.log(`  orientations: ${JSON.stringify(after?.orientations)}`)
writeFileSync('qa/e2-deployment/online-error-retry.json',JSON.stringify({appUrl:APP,
  injected:'route.abort on /api/tarot/reading**（不删除真实 Secret）',
  errorText:err.text.slice(0,600), controls:err.controls,
  showsHttpCode:/HTTP|\b(401|403|429|500|502|503)\b/.test(err.text),
  saysCardsKept:/牌仍然保留|仍然保留/.test(err.text),
  sessionUnchanged:same, before, after},null,2))
await b.close()
