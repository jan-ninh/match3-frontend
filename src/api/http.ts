import { createRequester } from './transport';
export { RequestError } from './transport';
export type { RequestOptions, FailureKind } from './transport';
const apiRequest = createRequester(import.meta.env.VITE_API_URL || '');
export const request: typeof apiRequest = (path, opts = {}) => {
  const headers = new Headers(opts.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return apiRequest(path, { ...opts, headers });
};
// Same bounded transport for optional local assets; never prefixes the backend URL.
export const resourceRequest = createRequester('');
