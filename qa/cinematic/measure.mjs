import { writeFileSync } from 'node:fs'
const {chromium}=await import(process.env.PW_CORE || '/Users/wangyijie/.npm/_npx/31e32ef8478fbf80/node_modules/playwright-core/index.mjs')
const browser=await chromium.launch({channel:'chrome',headless:true})
const page=await browser.newPage({viewport:{width:1440,height:960}})
await page.addInitScript(()=>{
 localStorage.setItem('arcana:onboarding-completed','true')
 window.metrics={lcp:0,cls:0}
 new PerformanceObserver(list=>{for(const e of list.getEntries())window.metrics.lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true})
 new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.metrics.cls+=e.value}).observe({type:'layout-shift',buffered:true})
})
await page.goto(process.env.BASE_URL || 'http://127.0.0.1:8790/')
await page.waitForTimeout(6000)
const result=await page.evaluate(async()=>{
 const times=[]; await new Promise(resolve=>{const start=performance.now();function tick(t){times.push(t);if(t-start<2000)requestAnimationFrame(tick);else resolve()}requestAnimationFrame(tick)})
 return {...window.metrics,fps:(times.length-1)*1000/(times.at(-1)-times[0]),imageBytes:performance.getEntriesByType('resource').filter(r=>r.initiatorType==='img').reduce((n,r)=>n+r.encodedBodySize,0),videoCount:document.querySelectorAll('video').length}
})
const tag=process.argv[2]||'current'
await page.screenshot({path:`output/playwright/cinematic/${tag}.png`,fullPage:true})
writeFileSync(`output/playwright/cinematic/${tag}-metrics.json`,JSON.stringify(result,null,2))
console.log(result)
await browser.close()
