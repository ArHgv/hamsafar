/** Authentication redirects must stay inside this app, including after URL decoding. */
export function safeNext(value: string | null): string {
  if (!value || !value.startsWith('/')) return '/';
  let decoded = value;
  for (let pass = 0; pass < 3; pass++) {
    if (
      !decoded.startsWith('/') ||
      decoded.startsWith('//') ||
      /[\\\u0000-\u001f\u007f]/.test(decoded)
    )
      return '/';
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      return '/';
    }
  }
  if (decoded.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(decoded)) return '/';
  try {
    if (decodeURIComponent(decoded) !== decoded) return '/';
  } catch {
    return '/';
  }
  return value;
}
