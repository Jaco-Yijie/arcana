/** Run after npm run build and npm run preview -- --port 8788.
 * Uses isolated browser storage and deterministic SSE responses, no AI calls.
 * PW_CORE can point to an installed playwright-core module.
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const { chromium } = await import(process.env.PW_CORE || '/Users/wangyijie/.npm/_npx/31e32ef8478fbf80/node_modules/playwright-core/index.mjs')
const base = process.env.BASE_URL || 'http://127.0.0.1:8788'
const fixture = JSON.parse(readFileSync(new URL('./fixture.json', import.meta.url), 'utf8'))
const resources = Object.fromEntries(['zh-CN','en-US'].map(locale => [locale, JSON.parse(readFileSync(new URL(`../../src/i18n/locales/${locale}.json`, import.meta.url), 'utf8'))]))
const settings = {guidanceEnabled:false,soundEnabled:false,hapticsEnabled:false,spreadMode:'fan'}
const results = []
const browser = await chromium.launch({channel:'chrome',headless:true})
mkdirSync('output/playwright/completion',{recursive:true})
function resultFor(locale) {
 const r = structuredClone(fixture.structuredReading)
 r.meta.language = locale === 'en-US' ? 'en' : 'zh'
 if(locale === 'en-US') {
  r.readingTheme='A little space for your next step'
  r.overallEnergy='Let reflection give your next decision room to breathe.'
  r.cards=r.cards.map((c,i)=>({...c,cardName:['The Fool','The High Priestess','The Lovers'][i],position:['Past','Present','Future'][i],interpretation:'A completed card interpretation.',connectionToQuestion:'Return to what matters to you.'}))
  r.relationships=r.relationships.map(x=>({...x,interpretation:'The cards invite a thoughtful next step.'}))
  r.narrative='Take time to notice what has changed.';r.answerToQuestion='Begin with one small, deliberate action.';r.reflectionQuestions=['What needs your attention?'];r.safetyNotice=null
 }
 return r
}
async function setup(locale, mode, completed=true, width=390) {
 const ctx=await browser.newContext({viewport:{width,height:900},locale,reducedMotion:'reduce'})
 const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message))
 const session={...structuredClone(fixture),question:'',readingMode:mode,reading:completed?{...fixture.reading,headline:[],cardAnalyses:[],relations:[],trend:'',watchOut:[],actions:[],safetyNotice:null}:null,followUps:[],structuredReading:completed?resultFor(locale):null,status:completed?'completed':'in-progress'}
 await p.addInitScript(({session,locale,settings})=>{
  if(sessionStorage.getItem('completion-test'))return
  sessionStorage.setItem('completion-test','1')
  localStorage.setItem('arcana:active-session',JSON.stringify(session))
  localStorage.setItem('arcana:language',locale)
  localStorage.setItem('arcana:deck-v2',JSON.stringify('legacy-forest'))
  localStorage.setItem('arcana:settings',JSON.stringify(settings))
 },{session,locale,settings})
 await p.route('**/api/tarot/translate',r=>r.abort())
 return {ctx,p,errors,session,t:resources[locale]}
}
try {
for(const locale of ['zh-CN','en-US']) for(const mode of ['standard','deep']) {
 const {ctx,p,errors,session,t}=await setup(locale,mode,false)
 let resolveRequest;const began=new Promise(r=>resolveRequest=r)
 await p.route('**/api/tarot/reading/stream',route=>{resolveRequest(route)})
 await p.goto(base+'/reading')
 assert.equal(await p.locator('.reading-completion').count(),0)
 await p.getByRole('button',{name:t.reading.mode.start,exact:true}).click()
 const route=await Promise.race([began, new Promise((_, reject) => { const timer=setTimeout(()=>reject(new Error('Expected request was not sent')),10000);timer.unref() })])
 assert.equal(route.request().postDataJSON().readingMode,mode)
 assert.equal(await p.locator('.reading-completion').count(),0)
 assert.equal(await p.getByRole('button',{name:t.reading.saveToJournal,exact:true}).isEnabled(),false)
 await route.fulfill({contentType:'text/event-stream',body:'event: done\ndata: '+JSON.stringify({reading:resultFor(locale)})+'\n\n'})
 const section=p.locator('.reading-completion');await section.waitFor()
 for(const width of [375,390,430]) {
  await p.setViewportSize({width,height:900});await section.getByRole('button',{name:t.reading.completion.new,exact:true}).scrollIntoViewIfNeeded()
  await section.getByRole('button',{name:t.reading.completion.new,exact:true}).focus()
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  const box=await section.getByRole('button',{name:t.reading.completion.new,exact:true}).boundingBox()
  assert.ok(box.height>=56 && box.x>=0 && box.x+box.width<=width)
  await p.screenshot({path:`output/playwright/completion/${locale}-${mode}-${width}.png`})
 }
 await section.getByRole('button',{name:t.reading.completion.new,exact:true}).press('Enter')
 await p.waitForURL('**/question?mode=question')
 assert.equal(await p.locator('textarea').inputValue(),'')
 const state=await p.evaluate(()=>({active:localStorage.getItem('arcana:active-session'),deck:JSON.parse(localStorage.getItem('arcana:deck-v2')),language:localStorage.getItem('arcana:language'),settings:JSON.parse(localStorage.getItem('arcana:settings')),journal:JSON.parse(localStorage.getItem('arcana:journal'))}))
 assert.equal(state.active,null);assert.equal(state.deck,session.deckId);assert.equal(state.language,locale);assert.deepEqual(state.settings,settings)
 assert.equal(state.journal.length,1);assert.equal(state.journal[0].id,session.id);assert.deepEqual(state.journal[0].structuredReading,resultFor(locale))
 await p.locator('textarea').fill(locale==='en-US'?'What deserves my attention today?':'今天有哪些值得留意的事？')
 await p.getByRole('button',{name:t.question.continue,exact:true}).click()
 if(await p.getByRole('button',{name:t.question.optimize.keepMine,exact:true}).isVisible())await p.getByRole('button',{name:t.question.optimize.keepMine,exact:true}).click()
 await p.waitForURL('**/spread')
 const next=await p.evaluate(()=>JSON.parse(localStorage.getItem('arcana:active-session')))
 assert.notEqual(next.id,session.id);assert.notEqual(next.shuffleSeed,session.shuffleSeed)
 assert.deepEqual(next.placements,[]);assert.deepEqual(next.drawn,[]);assert.deepEqual(next.followUps,[]);assert.equal(next.reading,null);assert.ok(!next.structuredReading);assert.equal(next.deckId,session.deckId);assert.equal(next.shuffled,false);assert.equal(next.cut,false)
 assert.deepEqual(errors,[]);results.push({locale,mode,loadingHidden:true,widths:[375,390,430],oldReadingSaved:true,newSessionClean:true,preferencesPreserved:true});await ctx.close()
}
for(const action of ['save','share']) {
 const {ctx,p,t,session,errors}=await setup('zh-CN','standard')
 await p.goto(base+'/reading');await p.locator('.reading-completion').getByRole('button',{name:t.reading.completion[action],exact:true}).click()
 await p.waitForURL(`**/${action==='save'?'journal':'share'}/${session.id}`)
 assert.equal(await p.evaluate(()=>localStorage.getItem('arcana:active-session')),null)
 assert.deepEqual(errors,[]);results.push({action,navigation:true});await ctx.close()
}
{
 const {ctx,p,t}=await setup('en-US','deep')
 let resolveFollowUp;const began=new Promise(r=>resolveFollowUp=r)
 await p.route('**/api/tarot/followup',route=>{resolveFollowUp(route)})
 await p.goto(base+'/reading')
 await p.getByRole('textbox',{name:t.reading.followUp.title,exact:true}).fill('What can I try next?')
 await p.getByRole('button',{name:t.common.send,exact:true}).click()
 const route=await Promise.race([began, new Promise((_, reject) => { const timer=setTimeout(()=>reject(new Error('Expected request was not sent')),10000);timer.unref() })])
 for(const button of await p.locator('.reading-completion button').all())assert.equal(await button.isEnabled(),false)
 await p.getByText(t.reading.completion.busy,{exact:true}).waitFor()
 await route.fulfill({json:{ok:true,answer:'Try one small change.',provider:'deepseek'}})
 await p.getByText('Try one small change.',{exact:true}).waitFor()
 assert.equal(await p.locator('.reading-completion').getByRole('button',{name:t.reading.completion.new,exact:true}).isEnabled(),true)
 results.push({followUp:'actions disabled until response completes'});await ctx.close()
}
{
 const {ctx,p,t}=await setup('en-US','deep',false)
 await p.route('**/api/tarot/reading/stream',r=>r.fulfill({contentType:'text/event-stream',body:'event: failed\ndata: '+JSON.stringify({error:{code:'network-error',message:'Test failure',retryable:true}})+'\n\n'}))
 await p.goto(base+'/reading')
 await p.getByRole('button',{name:t.reading.mode.start,exact:true}).click()
 await p.getByRole('button',{name:t.reading.error.retryDeep,exact:true}).waitFor()
 assert.equal(await p.locator('.reading-completion').count(),0)
 results.push({failure:'no completion actions'});await ctx.close()
}
writeFileSync('output/playwright/completion/check.json',JSON.stringify(results,null,2))
console.log(JSON.stringify(results,null,2))
} finally {await browser.close()}
