import { createRequester } from './transport';
import { SessionStore } from '@/services/account/modeStore';
import { apiBase } from './apiBase';
import { BackendReadiness } from '@/services/network/backendReadiness';
export { RequestError } from './transport';
export type { RequestOptions, FailureKind } from './transport';
const apiRequest = createRequester(apiBase(import.meta.env.VITE_API_URL, import.meta.env.PROD));
export const request: typeof apiRequest = (path, opts = {}) => {
  const headers = new Headers(opts.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return apiRequest(path, { ...opts, headers, credentials: opts.credentials ?? 'omit' });
};
export const backendReadiness = new BackendReadiness(apiRequest);
export const accountSession = new SessionStore(request, {
  getItem: (key) => sessionStorage.getItem(key),
  setItem: (key, value) => sessionStorage.setItem(key, value),
});
export const accountRequest = accountSession.request;
export const resourceRequest = createRequester('');
