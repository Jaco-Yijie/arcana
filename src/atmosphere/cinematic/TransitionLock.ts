/** One selection owns preload → crossfade → cleanup; rapid clicks cannot enqueue more work. */
export class TransitionLock {
  private locked = false
  acquire() { if (this.locked) return false; this.locked = true; return true }
  release() { this.locked = false }
}
