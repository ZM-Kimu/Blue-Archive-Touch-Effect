type PointerHandlers = {
  pointerDown: (event: PointerEvent) => void
  pointerMove: (event: PointerEvent) => void
  pointerEnd: (event: PointerEvent) => void
  pointerLeave: (event: PointerEvent) => void
  windowBlur: () => void
}

export const setCanvasStyles = (canvas: HTMLCanvasElement) =>
{
  Object.assign(canvas.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    display: 'block',
    pointerEvents: 'none',
    zIndex: '0',
  })
}

export const addPointerInputListeners = (
  listenTarget: HTMLElement | Window,
  captureTarget: HTMLElement,
  hostWindow: Window,
  handlers: PointerHandlers
) =>
{
  listenTarget.addEventListener('pointerdown', handlers.pointerDown as EventListener)
  listenTarget.addEventListener('pointermove', handlers.pointerMove as EventListener)
  listenTarget.addEventListener('pointerup', handlers.pointerEnd as EventListener)
  listenTarget.addEventListener('pointercancel', handlers.pointerEnd as EventListener)
  listenTarget.addEventListener('pointerleave', handlers.pointerLeave as EventListener)
  captureTarget.addEventListener('lostpointercapture', handlers.pointerEnd as EventListener)
  hostWindow.addEventListener('blur', handlers.windowBlur)
}

export const removePointerInputListeners = (
  listenTarget: HTMLElement | Window,
  captureTarget: HTMLElement,
  hostWindow: Window,
  handlers: PointerHandlers
) =>
{
  listenTarget.removeEventListener('pointerdown', handlers.pointerDown as EventListener)
  listenTarget.removeEventListener('pointermove', handlers.pointerMove as EventListener)
  listenTarget.removeEventListener('pointerup', handlers.pointerEnd as EventListener)
  listenTarget.removeEventListener('pointercancel', handlers.pointerEnd as EventListener)
  listenTarget.removeEventListener('pointerleave', handlers.pointerLeave as EventListener)
  captureTarget.removeEventListener('lostpointercapture', handlers.pointerEnd as EventListener)
  hostWindow.removeEventListener('blur', handlers.windowBlur)
}
