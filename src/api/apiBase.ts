// Public browser configuration only; never place credentials or secrets here.
export function apiBase(value: unknown, production = false): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('VITE_API_URL is required; use an API origin or / for an intentional same-origin proxy');
  const base = value.trim();
  if (base === '/') return '';
  try {
    const url = new URL(base);
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname.replace(/\/+$/, '') ||
      (production && url.protocol !== 'https:' && !loopback)
    )
      throw new Error();
    return url.origin;
  } catch {
    throw new Error('Invalid VITE_API_URL: use a credential-free HTTPS origin (HTTP loopback allowed for local tests)');
  }
}
