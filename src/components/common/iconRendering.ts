import { MONSTER_ICON_SLOT } from "../../services/assets"

/**
 * Called when a monster icon has loaded. A file of one slot is pixel art, kept sharp at any size; a larger file is a
 * detailed picture, smoothed when shown smaller. Decided from the file alone: a hidden image has no displayed size.
 */
export function setIconRendering(event: Event): void {
  const image = event.target as HTMLImageElement
  image.style.imageRendering = image.naturalWidth > MONSTER_ICON_SLOT ? "auto" : "pixelated"
}
