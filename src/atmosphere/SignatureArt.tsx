import { DECK_SIGNATURES } from './signatures'
import type { DeckId } from '@/decks/ids'

/** Each family has a different silhouette; no shared moon/ring template. */
export function SignatureArt({ deckId }: { deckId: DeckId }) {
  const { motif, texture, motion } = DECK_SIGNATURES[deckId]
  return <div className="signature-art" data-motif={motif} data-texture={texture} data-motion={motion} aria-hidden="true">
    <svg viewBox="0 0 600 600" fill="none" stroke="currentColor" strokeWidth="1.3" focusable="false">
      {motif === 'veil' && <><ellipse cx="300" cy="250" rx="155" ry="180"/><ellipse cx="300" cy="250" rx="170" ry="195"/><path d="M0 370 Q160 230 300 380 T600 350 M0 420 Q160 280 300 430 T600 400 M20 475 Q200 340 400 450 T600 440"/></>}
      {motif === 'heraldry' && <><path d="M300 55 520 300 300 545 80 300Z M300 100 480 300 300 500 120 300Z M185 150V450 M415 150V450 M155 200H445 M155 400H445"/><circle cx="300" cy="300" r="88"/><path d="m300 220 25 55 55 25-55 25-25 55-25-55-55-25 55-25Z"/></>}
      {motif === 'tide' && <>{[0,1,2,3,4,5,6].map(i=><path key={i} d={`M300 420 Q${70+i*65} ${15+Math.abs(i-3)*25} ${100+i*65} 200 Q${70+i*65} 390 300 420`}/>)}<path d="M0 460 Q100 400 200 460T400 460T600 460 M0 500 Q100 440 200 500T400 500T600 500"/></>}
      {motif === 'thicket' && <><path d="M180 540V260 Q160 50 320 90 Q450 120 420 330L440 540 M130 530Q220 380 120 130 M470 550Q370 360 490 150"/>{[180,260,340,420].map(y=><g key={y}><path d={`M155 ${y}q-80-80-60-120q100 40 60 120 M440 ${y}q90-70 75-100q-100 10-75 100`}/><circle cx="150" cy={y} r="7"/></g>)}</>}
      {motif === 'archive' && <><path d="M80 100Q190 60 300 120Q410 60 520 100V490Q410 450 300 510Q190 450 80 490Z M300 120V510 M110 135V450 M490 135V450"/>{[185,245,305,365].map(y=><path key={y} d={`M135 ${y}q65-15 130 5 M335 ${y+5}q65-20 130-5`}/>)}</>}
      {motif === 'lunar' && <><path d="M340 100A180 180 0 1 0 340 460A145 180 0 0 1 340 100Z"/><circle cx="290" cy="280" r="215"/><circle cx="290" cy="280" r="230"/><path d="m450 130 6 18 18 6-18 6-6 18-6-18-18-6 18-6Z"/></>}
      {motif === 'engraving' && <><circle cx="300" cy="300" r="120"/><circle cx="300" cy="300" r="135"/>{Array.from({length:24},(_,i)=><path key={i} transform={`rotate(${i*15} 300 300)`} d="M300 145V65 M294 140 300 120 306 140"/>)}<path d="M40 40H160 M40 40V160 M560 560H440 M560 560V440"/></>}
      {motif === 'canopy' && <><path d="M130 600Q240 350 130 20 M465 600Q350 350 470 20"/>{[120,220,320,420].map(y=><g key={y}><path d={`M165 ${y}q-150-25-140-100q140 0 140 100 M165 ${y}q110-20 125-100q-115 5-125 100 M435 ${y}q150-25 140-100q-140 0-140 100 M435 ${y}q-110-20-125-100q115 5 125 100`}/></g>)}</>}
      {motif === 'constellation' && <><path d="m80 150 140-65 90 170 180-85-60 210-170 130-120-200 170-55 120 125 M220 85 260 510"/>{[[80,150],[220,85],[310,255],[490,170],[430,380],[260,510],[140,310]].map(([x,y])=><circle key={x} cx={x} cy={y} r="5"/>)}<path d="M300 20V65 M300 535V580 M20 300H65 M535 300H580"/></>}
      {motif === 'eclipse' && <><circle cx="300" cy="250" r="125"/><path d="M180 235A130 130 0 0 1 420 235 M180 265A130 130 0 0 0 420 265 M90 0Q190 280 90 600 M125 0Q220 280 125 600 M510 0Q410 280 510 600 M475 0Q380 280 475 600"/></>}
    </svg>
  </div>
}
