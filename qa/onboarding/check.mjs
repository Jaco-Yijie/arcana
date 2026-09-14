import assert from 'node:assert/strict'
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs'
const {chromium}=await import(process.env.PW_CORE || '/Users/wangyijie/.npm/_npx/31e32ef8478fbf80/node_modules/playwright-core/index.mjs')
const base=process.env.BASE_URL || 'http://127.0.0.1:8789'
const browser=await chromium.launch({channel:'chrome',headless:true})
const results=[]
mkdirSync('output/playwright/onboarding',{recursive:true})
const strings=Object.fromEntries(['zh-CN','en-US'].map(l=>[l,JSON.parse(readFileSync(new URL(`../../src/i18n/locales/${l}.json`,import.meta.url),'utf8'))]))
async function next(p,t){await p.getByRole('button',{name:t.onboarding.next,exact:true}).click()}
try {
for(const locale of ['zh-CN','en-US'])for(const width of [375,390,430]){
 const ctx=await browser.newContext({viewport:{width,height:800},locale,reducedMotion:'reduce'});const p=await ctx.newPage();const t=strings[locale];const errors=[];p.on('pageerror',e=>errors.push(e.message))
 await p.goto(base);await p.locator('.identity-cover').waitFor();await p.getByRole('button',{name:t.cover.enter,exact:true}).click();await p.locator('.home-hero').waitFor()
 for(const name of [t.introduction.whatTitle,t.introduction.howTitle,t.introduction.askTitle])assert.equal(await p.getByRole('heading',{name,exact:true}).count(),0)
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
 await p.screenshot({path:`output/playwright/onboarding/home-${locale}-${width}.png`,fullPage:true})
 await p.getByRole('button',{name:t.home.begin,exact:true}).click();await p.waitForURL('**/guide')
 for(let step=0;step<3;step++){
  const title=t.onboarding[['question','spread','reading'][step]].title
  await p.getByRole('heading',{name:title,exact:true}).waitFor()
  assert.equal(await p.locator('h1').evaluate(el=>el===document.activeElement),true)
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  assert.equal(await p.evaluate(()=>localStorage.getItem('arcana:active-session')),null)
  const button=p.getByRole('button',{name:step<2?t.onboarding.next:t.onboarding.begin,exact:true});await button.scrollIntoViewIfNeeded();const box=await button.boundingBox();assert.ok(box.height>=56 && box.x>=0 && box.x+box.width<=width)
  await p.screenshot({path:`output/playwright/onboarding/guide-${locale}-${width}-${step}.png`,fullPage:true})
  if(step<2)await next(p,t)
 }
 await p.getByRole('button',{name:t.onboarding.previous,exact:true}).click();await p.getByRole('heading',{name:t.onboarding.spread.title,exact:true}).waitFor();await next(p,t)
 await p.getByRole('button',{name:t.onboarding.begin,exact:true}).press('Enter');await p.waitForURL('**/question?mode=question')
 assert.equal(await p.evaluate(()=>localStorage.getItem('arcana:onboarding-completed')),'true');assert.equal(await p.locator('textarea').inputValue(),'')
 const q=await ctx.newPage();await q.goto(base);await q.locator('.home-hero').waitFor();assert.equal(await q.locator('.identity-cover').count(),0)
 await q.getByRole('button',{name:t.home.begin,exact:true}).click();await q.waitForURL('**/decks')
 await q.goto(base+'/settings');await q.getByRole('link',{name:t.onboarding.review}).click();await q.waitForURL('**/guide?from=settings');await next(q,t);await next(q,t);await q.getByRole('button',{name:t.onboarding.returnSettings,exact:true}).click();await q.waitForURL('**/settings')
 assert.deepEqual(errors,[]);results.push({locale,width,firstVisit:true,persistence:true,review:true,noOverflow:true,noSessionCreated:true});await ctx.close()
}
{
 const ctx=await browser.newContext({viewport:{width:1440,height:900},locale:'zh-CN'});const p=await ctx.newPage();const zh=strings['zh-CN'],en=strings['en-US']
 await p.goto(base+'/guide');await next(p,zh);await p.getByRole('button',{name:'English',exact:true}).click();await p.getByRole('heading',{name:en.onboarding.spread.title,exact:true}).waitFor();await next(p,en)
 assert.ok(!/[\u3400-\u9fff]/.test((await p.locator('.tarot-guide').innerText())))
 results.push({languageSwitch:'step preserved'});await ctx.close()
}
{
 const ctx=await browser.newContext({locale:'zh-CN'});const p=await ctx.newPage();const t=strings['zh-CN']
 const fixture=JSON.parse(readFileSync(new URL('../reading-completion/fixture.json',import.meta.url),'utf8'))
 await p.addInitScript(f=>{localStorage.setItem('arcana:active-session',JSON.stringify(f));localStorage.setItem('arcana:deck-v2',JSON.stringify(f.deckId));localStorage.setItem('arcana:settings',JSON.stringify({soundEnabled:false}))},fixture)
 await p.goto(base);await p.locator('.home-hero').waitFor();assert.equal(await p.locator('.identity-cover').count(),0)
 await p.getByRole('button',{name:t.home.begin,exact:true}).click();await p.waitForURL('**/decks')
 await p.goto(base+'/guide?from=settings');await next(p,t);await next(p,t);await p.getByRole('button',{name:t.onboarding.returnSettings,exact:true}).click();await p.waitForURL('**/settings')
 assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('arcana:active-session'))),fixture)
 results.push({existingReader:'no forced guide; review preserves session'});await ctx.close()
}
{
 const ctx=await browser.newContext({locale:'zh-CN'});const p=await ctx.newPage();const t=strings['zh-CN'];await p.goto(base+'/guide?mode=random');await next(p,t);await next(p,t);await p.getByRole('button',{name:t.onboarding.begin,exact:true}).click();await p.waitForURL('**/question?mode=random');results.push({randomMode:'preserved'});await ctx.close()
}
console.log(JSON.stringify(results,null,2));writeFileSync('output/playwright/onboarding/check.json',JSON.stringify(results,null,2))
}finally{await browser.close()}
