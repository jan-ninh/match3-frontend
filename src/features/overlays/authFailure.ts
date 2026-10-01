import { RequestError } from '../../api/transport.ts';

export function authFailureMessage(error: unknown, action: 'login' | 'register'): string {
  if (error instanceof RequestError) {
    if (['timeout', 'unavailable', 'server', 'protocol'].includes(error.kind)) {
      return action === 'register'
        ? 'Account creation is unconfirmed. Your request may have completed. Try signing in before registering again.'
        : 'Account services could not be reached. Please try again.';
    }
    if (error.kind === 'conflict' && action === 'register') return 'Email or username already used. Try signing in or choose different details.';
    if (error.kind === 'unauthenticated' && action === 'login') return 'Email or password not accepted.';
    if (error.kind === 'forbidden') return 'Account request not permitted. Please check the service configuration.';
  }
  return action === 'register' ? 'Registration not accepted. Please check your details.' : 'Sign-in not accepted. Please check your details.';
}
