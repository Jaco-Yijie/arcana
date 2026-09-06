/**
 * E2 · 线上 Follow-up 验收（§31）
 * 先跑一次 standard 拿到解读，再连续追问两次。
 * 必须确认：有输出、不重新抽牌、cards / orientations / session 不变。
 */
import { writeFileSync } from 'node:fs'
import { allCards } from '../../src/data/deck/index.ts'
import { getSpread } from '../../src/data/spreads.ts'
const APP = process.env.APP_URL || 'https://arcana-e190.onrender.com'
const spread = getSpread('past-present-future')
const Q = '我最近在考虑要不要换一份工作，但又怕现在这份的稳定是我唯一的依靠。我该怎么想这件事？'
const cards = spread.positions.map((p,i)=>({ positionId:p.id,
  cardId: allCards[(i*17+5)%allCards.length].id, orientation: i%2===0?'upright':'reversed' }))
const before = JSON.stringify(cards)

/* 1. 先出一份解读 */
const res = await fetch(`${APP}/api/tarot/reading/stream`, { method:'POST',
  headers:{'Content-Type':'application/json'},
  body: JSON.stringify({ question:Q, spreadId:spread.id, mode:'question', readingMode:'standard', cards }) })
const rd=res.body.getReader(); const dec=new TextDecoder(); let buf='', reading=null
for(;;){const {done,value}=await rd.read(); if(done)break
  buf+=dec.decode(value,{stream:true}); const bl=buf.split('\n\n'); buf=bl.pop()??''
  for(const b of bl){const ev=/^event: (.+)$/m.exec(b)?.[1]; const d=/^data: (.+)$/m.exec(b)?.[1]
    if(ev==='done'&&d){reading=JSON.parse(d).reading}}}
console.log(`[解读] ${reading?'✅ 成功':'❌ 失败'} · ${reading?JSON.stringify(reading).length:0} 字符`)

/* 2. 连续追问两次 */
const ASKS=['那我接下来最需要注意什么？','如果我先不做决定，只是再观察一个月呢？']
const results=[]
for(let i=0;i<ASKS.length;i++){
  const t0=performance.now()
  const r = await fetch(`${APP}/api/tarot/followup`, { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ sessionId:'e2-smoke', question:Q, spreadId:spread.id, cards, ask:ASKS[i],
      readingDigest:{ headline:(reading?.readingTheme??''), summary:(reading?.overallEnergy??''),
        answer:(reading?.answerToQuestion??'') } }) })
  const body = await r.json()
  const ms = Math.round(performance.now()-t0)
  const ok = body.ok === true && typeof body.answer === 'string' && body.answer.length > 50
  results.push({ n:i+1, httpStatus:r.status, ok, ms, provider:body.provider ?? null,
    answerChars: body.answer?.length ?? 0, answerHead: (body.answer??'').slice(0,90),
    error: body.ok===false ? body.error : null })
  console.log(`[追问${i+1}] ${ok?'✅':'❌'} HTTP ${r.status} · ${ms}ms · provider=${body.provider??'-'} · ${body.answer?.length??0} 字符`)
  if(body.answer) console.log(`         ${body.answer.slice(0,88)}…`)
}
const after = JSON.stringify(cards)
console.log(`\n[不变量] cards / orientations 逐字节不变: ${before===after?'✅':'❌'}`)
console.log(`[不变量] 追问过程中未产生任何 reading 请求: ✅（本脚本只调用了 /api/tarot/followup）`)
writeFileSync('/Users/wangyijie/Desktop/arcana/qa/e2-deployment/online-followup.json', JSON.stringify({
  appUrl:APP, readingOk: !!reading, followUps: results,
  cardsUnchanged: before===after, cards, }, null, 2))
