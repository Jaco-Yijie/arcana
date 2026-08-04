/**
 * Pointer capture 的安全封装。
 *
 * `setPointerCapture` 在 pointerId 不是活动指针时会抛 NotFoundError
 * （合成事件、某些浏览器的鼠标事件、元素刚好被重新挂载时都会出现）。
 * 一旦抛出，后面的拖拽初始化代码就整段不执行，表现是「按下去没反应」。
 * 拖拽本身不依赖 capture 才能工作，capture 只是让手指移出元素时事件不丢，
 * 所以这里失败就静默降级。
 */
export function capturePointer(e: React.PointerEvent<Element>): void {
  try {
    e.currentTarget.setPointerCapture(e.pointerId)
  } catch {
    /* 降级：没有 capture 也能拖，只是移出元素边界时可能丢事件 */
  }
}
