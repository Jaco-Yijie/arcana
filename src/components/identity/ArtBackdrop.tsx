/** 静态装饰，无滤镜动画、无交互、无布局占位。 */
export function ArtBackdrop({ cover = false }: { cover?: boolean }) {
  return <div aria-hidden="true" className={`art-backdrop ${cover ? 'art-backdrop-cover' : ''}`}>
    <div className="art-ink" /><div className="art-paper" /><div className="art-moon" />
    <div className="art-axis" /><span className="art-seal">☽</span>
  </div>
}
