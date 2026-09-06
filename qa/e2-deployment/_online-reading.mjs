/**
 * E2 · 线上 AI 验收（§29 §30 §31）
 * 直连 Render 的 /api/tarot/reading/stream，逐个 SSE 事件打时间戳。
 * 核心 Gate：Deep 的 SSE 必须能连续保持 100 秒以上不被平台切断。
 */
import { writeFileSync } from 'node:fs'
import { allCards } from '../../src/data/deck/index.ts'
import { getSpread } from '../../src/data/spreads.ts'

const APP = process.env.APP_URL || 'https://arcana-e190.onrender.com'
const mode = process.argv[2] || 'standard'
const nCards = Number(process.argv[3] || 3)
const runs = Number(process.argv[4] || 1)
const SPREADS = { 1:'single', 3:'past-present-future', 5:'two-choices' }
const spread = getSpread(SPREADS[nCards])
const Q = '我最近在考虑要不要换一份工作，但又怕现在这份的稳定是我唯一的依靠。我该怎么想这件事？'

function req(seed) {
  return { question:Q, spreadId:spread.id, mode:'question', readingMode:mode,
    cards: spread.positions.map((p,i)=>({ positionId:p.id,
      cardId: allCards[(i*17+seed*3+5)%allCards.length].id,
      orientation: i%2===0?'upright':'reversed' })) }
}
function themeClosed(a){ return /"readingTheme"\s*:\s*"(?:[^"\\]|\\.)*"\s*,/.test(a) }

const out = []
for (let n=0;n<runs;n++){
  const t0=performance.now(); const ms=()=>Math.round(performance.now()-t0)
  const r = { run:n+1, mode, cards:nCards }
  let res
  try { res = await fetch(`${APP}/api/tarot/reading/stream`, { method:'POST',
    headers:{'Content-Type':'application/json'}, body:JSON.stringify(req(n)) }) }
  catch(e){ r.error=String(e).slice(0,120); out.push(r); console.log(`  run ${n+1} 连接失败 ${r.error}`); continue }
  r.httpStatus = res.status
  r.headersMs = ms()
  r.contentType = res.headers.get('content-type')
  const rd = res.body.getReader(); const dec=new TextDecoder()
  let buf='', acc='', deltas=0, lastEventAt=0, maxGap=0
  for(;;){
    const {done,value}=await rd.read(); if(done)break
    const now=ms(); if(lastEventAt) maxGap=Math.max(maxGap, now-lastEventAt); lastEventAt=now
    buf+=dec.decode(value,{stream:true})
    const blocks=buf.split('\n\n'); buf=blocks.pop()??''
    for(const b of blocks){
      const ev=/^event: (.+)$/m.exec(b)?.[1]; const d=/^data: (.+)$/m.exec(b)?.[1]
      if(!ev||!d)continue
      let p; try{p=JSON.parse(d)}catch{continue}
      if(ev==='phase'){ r.phases=(r.phases??[]).concat([{phase:p.phase,at:ms()}]) }
      else if(ev==='delta'){ deltas++; if(!r.firstDeltaMs)r.firstDeltaMs=ms()
        acc+=String(p.text??''); if(!r.firstMeaningfulMs&&themeClosed(acc))r.firstMeaningfulMs=ms() }
      else if(ev==='done'){ r.doneMs=ms(); r.ok=true
        r.outputChars=JSON.stringify(p.reading).length
        r.reading=p.reading }
      else if(ev==='failed'){ r.doneMs=ms(); r.error=JSON.stringify(p.error).slice(0,200) }
    }
  }
  r.deltaCount=deltas; r.maxGapMs=maxGap; r.totalMs=r.doneMs??ms()
  out.push(r)
  console.log(`  run ${n+1}: ${r.ok?'✅':'❌'} HTTP ${r.httpStatus} · 首字 ${r.firstDeltaMs}ms · 首段 ${r.firstMeaningfulMs}ms · 完成 ${r.totalMs}ms · ${r.outputChars}字符 · delta ${deltas} · 最大事件间隔 ${maxGap}ms${r.error?' · '+r.error:''}`)
}
const ok=out.filter(r=>r.ok)
const st=(xs)=>{const s=[...xs].sort((a,b)=>a-b);return {min:s[0],median:s[Math.floor(s.length/2)],max:s[s.length-1]}}
const summary = ok.length ? { mode, cards:nCards, runs:ok.length,
  firstDeltaMs:st(ok.map(r=>r.firstDeltaMs)), firstMeaningfulMs:st(ok.filter(r=>r.firstMeaningfulMs).map(r=>r.firstMeaningfulMs)),
  totalMs:st(ok.map(r=>r.totalMs)), outputChars:st(ok.map(r=>r.outputChars)),
  maxEventGapMs:st(ok.map(r=>r.maxGapMs)),
  sseHeldSeconds: Math.round(Math.max(...ok.map(r=>r.totalMs))/1000) } : null
if(summary){ console.log(`\n${mode} ${nCards}牌 · ${ok.length}/${runs} 成功`)
  console.log(`  首字 ${JSON.stringify(summary.firstDeltaMs)}`)
  console.log(`  首段 ${JSON.stringify(summary.firstMeaningfulMs)}`)
  console.log(`  总计 ${JSON.stringify(summary.totalMs)}`)
  console.log(`  输出 ${JSON.stringify(summary.outputChars)}`)
  console.log(`  SSE 连接最长保持 ${summary.sseHeldSeconds}s · 事件最大间隔 ${JSON.stringify(summary.maxEventGapMs)}ms`) }
writeFileSync(`/Users/wangyijie/Desktop/arcana/qa/e2-deployment/online-${mode==='deep'?'deep-':''}reading.json`,
  JSON.stringify({ appUrl:APP, summary, runs:out.map(({reading,...rest})=>rest),
    sampleReading: ok[0]?.reading ?? null }, null, 2))
