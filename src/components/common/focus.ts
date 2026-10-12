/** Whether the focus is on nothing: the page itself, or an element that was hidden or removed. */
function focusIsLost(): boolean {
  const active = document.activeElement
  return !active || active === document.body || active.getClientRects().length === 0
}

/**
 * Gives a lost focus to the element `find` returns, retrying for a few frames: a node just added to a graph is
 * rendered, then made visible (so focusable), a little later. A focus the user put elsewhere meanwhile is left alone.
 */
export function restoreFocus(find: () => HTMLElement | null | undefined, attempts = 20): void {
  requestAnimationFrame(() => {
    if (!focusIsLost()) return
    const element = find()
    element?.focus({ preventScroll: true })
    if (document.activeElement !== element && attempts > 1) restoreFocus(find, attempts - 1)
  })
}
