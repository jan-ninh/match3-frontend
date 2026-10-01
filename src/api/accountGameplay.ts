import { accountSession } from './http';
import { AccountGameplayStore } from '@/services/account/gameplayStore';
export const accountGameplay = new AccountGameplayStore(accountSession, () => window.localStorage);
