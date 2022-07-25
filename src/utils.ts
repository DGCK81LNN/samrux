export function escapeRegExp(source: string) {
  return source.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&").replace(/-/g, "\\x2d")
}

/**
 * Shuffles an array.
 *
 * This modiifes the array instead of creating a new one.
 */
export function shuffle<T>(array: T[]) {
  for (let i = array.length - 1; i > 0; --i) {
    const j = 0 | (Math.random() * (i + 1))
    if (j !== i) [array[i], array[j]] = [array[j], array[i]]
  }
  return array
}
