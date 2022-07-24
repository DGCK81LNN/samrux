export function escapeRegExp(source: string) {
  return source.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&").replace(/-/g, "\\x2d")
}
