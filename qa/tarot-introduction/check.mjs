import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
const {chromium}=await import(process.env.PW_CORE || '/Users/wangyijie/.npm/_npx/31e32ef8478fbf80/node_modules/playwright-core/index.mjs')
const base=process.env.BASE_URL || 'http://127.0.0.1:8789'
const resources=Object.fromEntries(['zh-CN','en-US'].map(l=>[l,JSON.parse(readFileSync(new URL(`../../src/i18n/locales/${l}.json`,import.meta.url),'utf8'))]))
const browser=await chromium.launch({channel:'chrome',headless:true});const results=[]
mkdirSync('output/playwright/tarot-introduction',{recursive:true})
try {
for(const locale of ['zh-CN','en-US'])for(const width of [375,390,430,1440]){
 const ctx=await browser.newContext({viewport:{width,height:850},locale,reducedMotion:'reduce'});const p=await ctx.newPage();const t=resources[locale];const errors=[];p.on('pageerror',e=>errors.push(e.message))
 await p.addInitScript(()=>{sessionStorage.setItem('arcana:entered','1');localStorage.setItem('arcana:onboarding-completed','true')})
 await p.goto(base);await p.locator('.home-hero').waitFor();assert.equal(await p.getByRole('heading',{name:t.introduction.whatTitle,exact:true}).count(),0)
 const nav=p.locator(width<768?'.site-nav-panel':'.site-nav-desktop')
 if(width<768)await p.locator('.site-nav-mobile summary').click()
 await nav.getByRole('link',{name:t.navigation.tarot,exact:true}).click();await p.waitForURL('**/what-is-tarot')
 await p.getByRole('heading',{name:t.introduction.whatTitle,exact:true}).waitFor()
 for(const title of [t.tarotPage.reflectionTitle,t.introduction.howTitle,t.tarotPage.cardsTitle,t.introduction.askTitle])assert.equal(await p.getByRole('heading',{name:title,exact:true}).count(),1)
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
 assert.equal(await p.locator('.tarot-manual-chapters section').count(),4)
 assert.equal(await p.locator('.tarot-journey li').count(),5)
 if(locale==='en-US')assert.ok(!/[\u3400-\u9fff]/.test(await p.locator('main').innerText()))
 if(width<768){
  await p.locator('.site-nav-mobile summary').click();await p.screenshot({path:`output/playwright/tarot-introduction/menu-${locale}-${width}.png`})
  await p.keyboard.press('Escape');assert.equal(await p.locator('.site-nav-mobile').getAttribute('open'),null)
 }
 await p.screenshot({path:`output/playwright/tarot-introduction/page-${locale}-${width}.png`,fullPage:true})
 const cta=p.locator('.tarot-manual-cta').getByRole('link',{name:t.navigation.begin,exact:true});await cta.scrollIntoViewIfNeeded();const box=await cta.boundingBox();assert.ok(box.height>=56 && box.x>=0 && box.x+box.width<=width)
 await cta.focus();await p.keyboard.press('Enter');await p.waitForURL('**/decks')
 assert.deepEqual(errors,[]);results.push({locale,width,menu:true,chapters:4,overflow:false,cta:'decks'});await ctx.close()
}
{
 const ctx=await browser.newContext({viewport:{width:390,height:850},locale:'zh-CN'});const p=await ctx.newPage();const en=resources['en-US'];await p.goto(base+'/what-is-tarot')
 await p.locator('.site-nav-mobile summary').click();await p.locator('.site-nav-panel').getByRole('button',{name:'English',exact:true}).click();await p.getByRole('heading',{name:en.introduction.whatTitle,exact:true}).waitFor()
 assert.ok(!/[\u3400-\u9fff]/.test(await p.locator('main').innerText()));await p.keyboard.press('Escape')
 await p.locator('.tarot-manual-cta').getByRole('link',{name:en.navigation.begin,exact:true}).click();await p.waitForURL('**/guide');results.push({freshUser:'guide',languageSwitch:'complete'});await ctx.close()
}
{
 const ctx=await browser.newContext({locale:'zh-CN'});const p=await ctx.newPage();const f=JSON.parse(readFileSync(new URL('../reading-completion/fixture.json',import.meta.url),'utf8'))
 await p.addInitScript(f=>localStorage.setItem('arcana:active-session',JSON.stringify(f)),f)
 await p.goto(base+'/what-is-tarot');await p.locator('.tarot-manual-cta').waitFor();assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('arcana:active-session'))),f)
 results.push({existingSession:'unchanged'});await ctx.close()
}
writeFileSync('output/playwright/tarot-introduction/check.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2))
}finally{await browser.close()}
