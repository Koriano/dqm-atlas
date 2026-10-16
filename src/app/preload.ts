/**
 * Loads images before they are shown, so a canvas opens with its pictures instead of filling in one by one. A file
 * that fails to load counts as done: the image element shows the failure itself.
 */
export function preloadImages(urls: string[], onProgress: (done: number, total: number) => void): Promise<void> {
  const unique = [...new Set(urls)]
  let done = 0
  onProgress(done, unique.length)
  return Promise.all(
    unique.map(
      (url) =>
        new Promise<void>((resolve) => {
          const image = new Image()
          image.onload = image.onerror = () => {
            done += 1
            onProgress(done, unique.length)
            resolve()
          }
          image.src = url
        }),
    ),
  ).then(() => undefined)
}
