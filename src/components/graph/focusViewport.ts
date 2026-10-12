import { useVueFlow } from "@vue-flow/core"
import { type Ref, watch } from "vue"

import { ROOT_ID } from "../../services/graph/focusTree"

const PADDING = 48
const MAX_FIT_ZOOM = 1.25
const MIN_FIT_ZOOM = 0.5

interface PlacedNode {
  id: string
  position: { x: number; y: number }
  width?: unknown
  height?: unknown
}

export interface FocusViewportOptions {
  container: Ref<HTMLElement | undefined>
  nodes: () => PlacedNode[]
  /** Root monster of the open tree: a new one is fitted. */
  rootId: () => string | null
  /** The node kept where it is on screen when the tree changes around it. */
  anchorId: () => string
  /** Height hidden by an overlay at the bottom of the canvas. */
  bottomInset: () => number
}

/**
 * Viewport of the synthesis tree: a new tree is fitted; later changes (choices, depth, selection) keep the selected
 * node where it was on screen once the user has moved the view, so editing a branch never throws them back to an
 * overall view.
 */
export function useFocusViewport({ container, nodes, rootId, anchorId, bottomInset }: FocusViewportOptions) {
  const { setViewport, getViewport } = useVueFlow("focus")

  const visibleHeight = () => {
    const element = container.value
    return element ? Math.max(element.clientHeight * 0.3, element.clientHeight - bottomInset()) : 0
  }

  // A very wide row (many children) is not shrunk below MIN_FIT_ZOOM to fit the width (the height always fits): the
  // view stays centred on the root and the rest is reached by panning.
  function fit() {
    const element = container.value
    const placed = nodes()
    if (!element || placed.length === 0) return
    const left = Math.min(...placed.map((node) => node.position.x))
    const top = Math.min(...placed.map((node) => node.position.y))
    const right = Math.max(...placed.map((node) => node.position.x + Number(node.width)))
    const bottom = Math.max(...placed.map((node) => node.position.y + Number(node.height)))
    const width = element.clientWidth
    const height = visibleHeight()
    const widthZoom = Math.max(MIN_FIT_ZOOM, (width - 2 * PADDING) / (right - left))
    const zoom = Math.min(MAX_FIT_ZOOM, widthZoom, (height - 2 * PADDING) / (bottom - top))
    const root = placed.find((node) => node.id === ROOT_ID)
    const centerX = root ? root.position.x + Number(root.width) / 2 : (left + right) / 2
    void setViewport({ x: width / 2 - centerX * zoom, y: (height - (bottom - top) * zoom) / 2 - top * zoom, zoom })
  }

  /** Pans the least needed to bring the node inside the visible part of the canvas. */
  function ensureVisible(nodeId: string) {
    const element = container.value
    const node = nodes().find((candidate) => candidate.id === nodeId)
    if (!element || !node) return
    const { x, y, zoom } = getViewport()
    const margin = 16
    const left = node.position.x * zoom + x
    const top = node.position.y * zoom + y
    const right = left + Number(node.width) * zoom
    const bottom = top + Number(node.height) * zoom
    const shift = (start: number, end: number, min: number, max: number) => (start < min ? min - start : end > max ? Math.max(max - end, min - start) : 0)
    const dx = shift(left, right, margin, element.clientWidth - margin)
    const dy = shift(top, bottom, margin, visibleHeight() - margin)
    if (dx !== 0 || dy !== 0) void setViewport({ x: x + dx, y: y + dy, zoom })
  }

  let fittedRootId: string | null = null
  let userMoved = false
  let previousPositions = new Map<string, { x: number; y: number }>()
  /** A picked monster takes the place of its slot's node: its position is compared with the slot's. */
  let replaced: { from: string; to: string } | null = null

  watch(
    nodes,
    (placed) => {
      const anchor = anchorId()
      if (rootId() !== fittedRootId || !userMoved) {
        fittedRootId = rootId()
        userMoved = false
        fit()
      } else {
        const before = previousPositions.get(anchor) ?? (replaced?.to === anchor ? previousPositions.get(replaced.from) : undefined)
        const after = placed.find((node) => node.id === anchor)?.position
        if (before && after && (before.x !== after.x || before.y !== after.y)) {
          const { x, y, zoom } = getViewport()
          void setViewport({ x: x - (after.x - before.x) * zoom, y: y - (after.y - before.y) * zoom, zoom })
        }
        ensureVisible(anchor)
      }
      replaced = null
      previousPositions = new Map(placed.map((node) => [node.id, node.position]))
    },
    { flush: "post" },
  )
  watch(bottomInset, () => (userMoved ? ensureVisible(anchorId()) : fit()), { flush: "post" })

  return {
    visibleHeight,
    /** Announces that the node `to` is about to take the place of the node `from`. */
    replace(from: string, to: string) {
      replaced = { from, to }
    },
    // Vue Flow emits this again whenever new nodes get measured: only the first time for a tree fits it.
    onInitialized() {
      if (rootId() === fittedRootId) return
      fittedRootId = rootId()
      fit()
    },
    /**
     * Programmatic viewport changes have no source event: only the user's pans and zooms count. `move` (not
     * `move-start`) is used because a plain click on a node already starts a zoom gesture without moving anything.
     */
    onMove({ event }: { event: unknown }) {
      if (event && typeof event === "object" && (!("sourceEvent" in event) || event.sourceEvent)) userMoved = true
    },
  }
}
