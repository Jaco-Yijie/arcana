/**
 * E2 · 移动端公网验收（§33）+ Console/Network 扫描（§34）
 * 390×844 走 Home → Deck → Draw → Reveal → Reading 完整一遍。
 */
import { writeFileSync } from 'node:fs'
const PW = process.env.PW_CORE || '/Users/wangyijie/.npm/_npx/31e32ef8478fbf80/node_modules/playwright-core/index.mjs'
const { chromium } = await import(PW)
const APP = process.env.APP_URL || 'https://arcana-e190.onrender.com'
const R2 = 'https://pub-17c0bf59be5e46f2a771ac7d2f068072.r2.dev'
const b = await chromium.launch({ channel:'chrome' })
const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:3 })
const page = await ctx.newPage()
const W=(ms)=>page.waitForTimeout(ms)
const errs=[], bad=[], upstream=[], mixed=[]
page.on('console', m=>{ if(m.type()==='error') errs.push(m.text().slice(0,180)) })
page.on('pageerror', e=>errs.push('pageerror: '+e.message.slice(0,180)))
page.on('response', r=>{ if(r.status()>=400) bad.push(`${r.status()} ${r.url().slice(0,120)}`) })
page.on('request', r=>{ const u=r.url()
  if(/api\.deepseek\.com/.test(u)) upstream.push(u)
  if(/^http:\/\//.test(u) && !/localhost|127\.0\.0\.1/.test(u)) mixed.push(u) })

const steps=[]
async function mark(name){ const o=await page.evaluate(()=>({url:location.pathname,
  overflowX:document.documentElement.scrollWidth>window.innerWidth+1,
  broken:[...document.querySelectorAll('img')].filter(i=>i.complete&&i.naturalWidth===0).length,
  text:document.body.innerText.slice(0,120)}))
  steps.push({name,...o}); console.log(`  ${o.overflowX?'⚠溢出':'ok'} · 图失败 ${o.broken} · ${name} → ${o.url}`) }

await page.goto(APP+'/',{waitUntil:'networkidle',timeout:120000}); await W(1500); await mark('home')
await page.getByText('带着问题来').click(); await page.waitForURL(/\/(decks|question)/,{timeout:30000}); await W(2500); await mark('deck-library')
await page.getByRole('button',{name:'就用这副'}).click(); await page.waitForURL('**/question**',{timeout:30000}); await W(1500)
const ta=page.locator('textarea').first(); await ta.click()
await ta.fill('我最近在考虑要不要换一份工作，但又怕现在这份的稳定是我唯一的依靠。我该怎么想这件事？')
await page.getByRole('button',{name:'继续'}).click(); await W(2500)
await page.getByRole('button',{name:'用优化后的'}).click(); await W(2000); await mark('spread')
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
await page.waitForURL('**/table/draw',{timeout:40000}); await W(3000); await mark('draw')
for(let i=0;i<6;i++){
  if(await page.getByRole('button',{name:'去翻牌'}).count())break
  let f=false
  for(let k=0;k<30;k++){await page.keyboard.press('Tab');await W(110)
    const l=await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')??''); if(/摊开的牌/.test(l)){f=true;break}}
  if(!f)break
  for(let k=0;k<i*3;k++){await page.keyboard.press('ArrowRight');await W(90)}
  await page.keyboard.press('Enter'); await W(900)
  const s=page.getByRole('button',{name:/把这张牌放到/}).first(); if(!(await s.count()))break
  await s.click(); await W(1000) }
await page.getByRole('button',{name:'去翻牌'}).click()
await page.waitForURL('**/table/reveal',{timeout:30000}); await W(2000)
for(let i=0;i<6;i++){const f=page.getByRole('button',{name:'翻开这张牌'}).first()
  if(!(await f.count()))break; const bb=await f.boundingBox(); if(!bb)break
  await page.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await W(1500)
  await page.keyboard.press('Escape'); await W(600)}
await W(800); await mark('reveal')
await page.screenshot({path:'qa/e2-deployment/online-mobile-reveal.png'})
await page.getByRole('button',{name:/开始完整解读|解读/}).first().click()
await page.waitForURL('**/reading',{timeout:30000}); await W(1200)
const d=page.getByRole('button',{name:/标准解读/}).first(); if(await d.count()){await d.click();await W(800)}
const t0=Date.now(); await page.getByRole('button',{name:'开始解读'}).click()
let firstText=null,done=null
for(let i=0;i<120;i++){await W(500)
  const s=await page.evaluate(()=>({len:document.body.innerText.length,
    sec:/每张牌的分析|整体走向/.test(document.body.innerText)}))
  if(!firstText&&s.len>150)firstText=Date.now()-t0
  if(s.sec){done=Date.now()-t0;break}}
console.log(`  Reading 首段 ${firstText}ms · 完成 ${done}ms`)
await mark('reading')
await page.screenshot({path:'qa/e2-deployment/online-mobile-reading.png',fullPage:true})
console.log(`\n[§34] console error ${errs.length} · 失败请求 ${bad.length} · 直连上游 ${upstream.length} · mixed content ${mixed.length}`)
if(bad.length)console.log('  '+bad.slice(0,5).join('\n  '))
if(errs.length)console.log('  '+errs.slice(0,5).join('\n  '))
writeFileSync('qa/e2-deployment/online-mobile.json',JSON.stringify({appUrl:APP,viewport:'390x844 dpr3',
  steps, reading:{firstMeaningfulMs:firstText,doneMs:done},
  consoleErrors:errs, failedRequests:bad, directUpstreamRequests:upstream, mixedContent:mixed},null,2))
await b.close()
