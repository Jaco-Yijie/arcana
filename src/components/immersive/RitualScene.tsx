/** Decorative CSS 3D scene; no input handlers, images, or render loop. */
export function RitualScene({ variant = 'hero' }: { variant?: 'hero' | 'cover' | 'table' }) {
  return (
    <div className={`ritual-scene ritual-scene-${variant}`} aria-hidden="true">
      <div className="ritual-horizon" />
      <div className="ritual-orb"><span /></div>
      <div className="ritual-armillary">
        <i className="ritual-ring ritual-ring-a" />
        <i className="ritual-ring ritual-ring-b" />
        <i className="ritual-ring ritual-ring-c" />
        <span className="ritual-pole" />
      </div>
      <div className="ritual-floor"><i /><span>✦</span></div>
      <div className="ritual-mist" />
    </div>
  )
}
