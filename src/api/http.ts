import { createRequester } from './transport';
import { SessionStore } from '@/services/account/modeStore';
import { apiBase } from './apiBase';
export { RequestError } from './transport';
export type { RequestOptions, FailureKind } from './transport';
const apiRequest = createRequester(apiBase(import.meta.env.VITE_API_URL, import.meta.env.PROD));
export const request: typeof apiRequest = (path, opts = {}) => {
  const headers = new Headers(opts.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return apiRequest(path, { ...opts, headers, credentials: opts.credentials ?? 'omit' });
};
export const accountSession = new SessionStore(request);
export const accountRequest = accountSession.request;
export const resourceRequest = createRequester('');
