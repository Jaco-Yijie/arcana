import { identityCopy, type IdentityKey } from './copy'

export function Bilingual({ name, zh, en, className = '' }: {
  name?: IdentityKey; zh?: string; en?: string; className?: string
}) {
  const pair = name ? identityCopy[name] : [zh, en]
  return <span className={`bilingual ${className}`}><span>{pair[0]}</span>{pair[1] && <span lang="en" className="bilingual-en">{pair[1]}</span>}</span>
}

