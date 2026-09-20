import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
const {chromium}=await import(process.env.PW_CORE || '/Users/wangyijie/.npm/_npx/31e32ef8478fbf80/node_modules/playwright-core/index.mjs')
const base=process.env.BASE_URL || 'http://127.0.0.1:8790'
const browser=await chromium.launch({channel:'chrome',headless:true})
const results=[]
const ids=['legacy-moonlight','legacy-classic','legacy-forest','legacy-celestial','legacy-shadow','ethereal','elysian','opaline','wonderland','classic']
async function open({width=1440,locale='zh-CN',deck='legacy-moonlight',reducedMotion='no-preference',session=null,path='/',failedAsset=false}={}) {
 const ctx=await browser.newContext({viewport:{width,height:960},locale,reducedMotion,isMobile:width<768,hasTouch:width<768})
 const page=await ctx.newPage();const errors=[];const requests=[]
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()))
 await page.route('**/api/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"user":null}'}))
 await page.addInitScript(({locale,deck,session})=>{
  if(sessionStorage.getItem('cinematic-qa'))return
  sessionStorage.setItem('cinematic-qa','1')
  localStorage.setItem('arcana:onboarding-completed','true')
  localStorage.setItem('arcana:language',locale)
  localStorage.setItem('arcana:deck-v2',JSON.stringify(deck))
  localStorage.setItem('arcana:settings',JSON.stringify({guidanceEnabled:false,soundEnabled:false,hapticsEnabled:false,spreadMode:'fan'}))
  if(session)localStorage.setItem('arcana:active-session',JSON.stringify(session))
 },{locale,deck,session})
 if(failedAsset)await page.route('**/assets/cinematic/*',r=>r.abort())
 await page.goto(base+path);await page.locator('.cinematic-world').first().waitFor({state:'attached'})
 await page.waitForTimeout(400)
 return {ctx,page,errors,requests}
}
async function idle(page){await page.waitForFunction(()=>document.querySelector('.cinematic-home')?.dataset.transition==='idle')}
try {
 const {ctx,page,errors,requests}=await open()
 assert.equal(await page.locator('.cinema-deck-option').count(),10)
 assert.equal(await page.locator('.cinema-deck-option:enabled').count(),5)
 assert.ok(requests.filter(u=>u.includes('/assets/cinematic/')).every(u=>u.includes('legacy-moonlight')),'only initial world is requested')
 await page.mouse.move(1100,340);await page.waitForTimeout(250)
 assert.notEqual(await page.locator('.cinematic-home').evaluate(e=>e.style.getPropertyValue('--cinema-pointer-x')),'0')
 for(const [selector,limit] of [['.cinema-background',4],['.cinema-foreground',20]]) {
  const x=await page.locator(selector).evaluate(e=>new DOMMatrixReadOnly(getComputedStyle(e).transform).m41)
  assert.ok(Math.abs(x)>0 && Math.abs(x)<=limit)
 }
 for(const id of ids.slice(1,5)){
  await page.locator(`[data-deck-option="${id}"]`).click()
  await page.waitForFunction(()=>document.querySelector('.cinematic-home')?.dataset.transition==='fading')
  assert.equal(await page.locator('.cinematic-world').count(),2)
  assert.equal(await page.locator('.cinema-card-layer').count(),2)
  // Programmatic second click exercises the same rapid-click guard as pointer / keyboard events.
  await page.locator('[data-deck-option="legacy-moonlight"]').evaluate(e=>e.click())
  await idle(page)
  assert.equal(await page.locator('.cinematic-world').getAttribute('data-cinematic-deck'),id)
  assert.equal(await page.locator('.cinema-card-layer').count(),1)
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('arcana:deck-v2'))),id)
  assert.equal(await page.locator('.hero-card-stage img').count(),3)
  assert.ok((await page.locator('.hero-card-stage img').evaluateAll(imgs=>imgs.map(i=>i.src))).every(src=>src.includes(id)))
  await page.screenshot({path:`output/playwright/cinematic/home-${id}.png`,fullPage:true})
 }
 assert.deepEqual(errors,[]);results.push({switching:4,locking:true,lazyLoading:true,realCards:true})
 await ctx.close()
 {
 const {ctx,page}=await open({deck:'legacy-shadow'})
 // Use a fresh context: previously decoded images legitimately survive a simulated network failure.
 await page.route('**/assets/cinematic/legacy-forest.svg',r=>r.abort())
 await page.locator('[data-deck-option="legacy-forest"]').click();await idle(page)
 assert.equal(await page.locator('.cinematic-world').getAttribute('data-cinematic-deck'),'legacy-shadow')
 assert.match(await page.locator('[role="status"]').innerText(),/重试/)
 await page.unroute('**/assets/cinematic/legacy-forest.svg')
 await page.locator('[data-deck-option="legacy-forest"]').click();await idle(page)
 assert.equal(await page.locator('.cinematic-world').getAttribute('data-cinematic-deck'),'legacy-forest')
 results.push({failedSelection:'preserves current deck',retry:true});await ctx.close()
 }
 // Compare all 10 background worlds without cards or hero copy, including unplayable art slots.
 for(const id of ids){
  const {ctx,page}=await open({deck:id,reducedMotion:'reduce'})
  await page.addStyleTag({content:'.cinematic-home > :not(.cinema-worlds){opacity:0!important}'})
  assert.equal(await page.locator('.home-hero').evaluate(e=>getComputedStyle(e).opacity),'0')
  await page.screenshot({path:`output/playwright/cinematic/world-${id}.png`})
  await ctx.close()
 }
 for(const width of [375,390,430])for(const locale of ['zh-CN','en-US']){
  const {ctx,page,errors}=await open({width,locale})
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  await page.locator('.site-nav-mobile summary').click()
  assert.ok(await page.locator('.site-nav-panel').isVisible())
  await page.keyboard.press('Escape')
  await page.locator('[data-deck-option="legacy-forest"]').click();await idle(page)
  const button=page.locator('.hero-actions button').first();await button.scrollIntoViewIfNeeded()
  const box=await button.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width&&box.height>=44)
  assert.equal(await page.locator('.hero-depth-plane').evaluate(e=>getComputedStyle(e).transform),'none')
  if(locale==='en-US')assert.doesNotMatch(await page.locator('.cinematic-home').innerText(),/[\u3400-\u9fff]/)
  await page.screenshot({path:`output/playwright/cinematic/mobile-${locale}-${width}.png`,fullPage:true})
  assert.deepEqual(errors,[]);results.push({width,locale,overflow:false,menu:true,cta:true});await ctx.close()
 }
 {
  const {ctx,page}=await open({reducedMotion:'reduce'})
  const motion=await page.locator('.cinema-overlay,.hero-card-float').evaluateAll(es=>es.map(e=>getComputedStyle(e).animationName))
  assert.ok(motion.every(x=>x==='none'))
  await page.mouse.move(1200,450);assert.equal(await page.locator('.cinematic-home').evaluate(e=>e.style.getPropertyValue('--cinema-pointer-x')),'')
  await page.locator('[data-deck-option="legacy-classic"]').click();await idle(page)
  assert.equal(await page.locator('.cinematic-world').getAttribute('data-cinematic-deck'),'legacy-classic')
  results.push({reducedMotion:'static depth and brief crossfade'});await ctx.close()
 }
 {
  const {ctx,page}=await open({failedAsset:true})
  assert.equal(await page.locator('.cinema-media').count(),0)
  assert.ok(await page.locator('.cinema-fallback').isVisible())
  assert.ok(await page.locator('.hero-actions button').first().isEnabled())
  results.push({initialMediaFailure:'decorative fallback, functional CTA'});await ctx.close()
 }
 {
  const {ctx,page}=await open()
  await page.locator('.site-nav-desktop').getByRole('button',{name:'English',exact:true}).click()
  await page.getByRole('region',{name:'Choose your world'}).waitFor()
  assert.doesNotMatch(await page.locator('.home-hero').innerText(),/[\u3400-\u9fff]/)
  assert.doesNotMatch(await page.locator('.cinema-switcher').innerText(),/[\u3400-\u9fff]/)
  assert.equal(await page.evaluate(()=>localStorage.getItem('arcana:language')),'en-US')
  results.push({liveLanguageSwitch:true});await ctx.close()
 }
 const fixture=JSON.parse(readFileSync(new URL('../reading-completion/fixture.json',import.meta.url),'utf8'))
 for(const [path,stage] of [['/spread','spread'],['/table/shuffle','shuffle'],['/table/draw','draw'],['/reading','reading']]){
  const session={...fixture,id:'cinematic-fixture',stage,status:stage==='reading'?'completed':'in-progress',deckId:'legacy-classic',deckLocked:stage!=='spread',readingMode:'standard'}
  const {ctx,page,errors}=await open({deck:'legacy-forest',session,path,width:390})
  const expected=stage==='spread'?'legacy-forest':'legacy-classic'
  assert.equal(await page.locator('.cinematic-world').getAttribute('data-cinematic-deck'),expected)
  assert.equal(await page.locator('.cinematic-world').getAttribute('data-mode'),stage==='reading'?'reading':'table')
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  await page.screenshot({path:`output/playwright/cinematic/flow-${stage}.png`,fullPage:true})
  assert.deepEqual(errors,[]);results.push({path,world:expected,frozen:stage!=='spread'});await ctx.close()
 }
 writeFileSync('output/playwright/cinematic/check.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2))
}finally{await browser.close()}
