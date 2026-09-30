import { useNavigate } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import { useAccountOutcome } from '@/context/OutcomeContext';
import { useOverlays } from '@/features/overlays';
import { accountPower } from '@/services/account/gameplayStore';
export default function AccountPersistenceStatus() {
  const navigate = useNavigate();
  const { mode, generation, session, canUseAccount, playDemo } = useAuth();
  const { gameplay, store } = useAccountOutcome();
  const { openLevelUp, close } = useOverlays();
  if (mode !== 'account' || gameplay.generation !== generation || !gameplay.ownerId) return null;
  const labels = {
    idle: '',
    reconciling: 'Checking account save',
    saving: 'Saving',
    saved: 'Saved to account',
    unconfirmed: 'Save unconfirmed',
    'not-accepted': 'Not accepted',
  };
  const show = gameplay.lastCommand && (gameplay.lastCommand !== 'START' || !['saved', 'idle'].includes(gameplay.status));
  const pending = !!gameplay.pending;
  const reward = gameplay.data?.pendingRewards[0];
  const interrupted = gameplay.data?.activeAttempt && !gameplay.liveEntryId;
  const abandon = () => {
    void store.abandon();
  };
  return (
    <div role="status" className="text-center text-sm py-2">
      {show && <p>{labels[gameplay.status]}</p>}
      {session === 'expired' && <p>Session expired. Sign in again or play Demo.</p>}
      {gameplay.status === 'unconfirmed' && <p>Account save is unconfirmed. Check its receipt before retrying.</p>}
      {gameplay.status === 'not-accepted' && <p>The account transition was not accepted. Current account state determines what can happen next.</p>}
      {store.capacityReached() && <p>Account recovery has unresolved operations for other accounts. Resolve those before another account transition.</p>}
      {gameplay.storage === 'visit-only' && <p>Account recovery data: this visit only.</p>}
      {gameplay.storage === 'recovered' && <p>Account recovery data was unreadable. Check current account state.</p>}
      {pending && canUseAccount && (
        <button
          type="button"
          className="underline mr-4"
          disabled={gameplay.status === 'saving' || gameplay.status === 'reconciling'}
          onClick={() => void store.reconcile(true)}
        >
          Retry save
        </button>
      )}
      {canUseAccount && !pending && !store.capacityReached() && (interrupted || gameplay.data?.legacyInterrupted) && (
        <div>
          <p>Interrupted account attempt. The board is not restored.</p>
          <p>Abandon resets this account run; level and EXP remain.</p>
          <button type="button" className="underline" onClick={abandon}>
            Abandon attempt / reset run
          </button>
        </div>
      )}
      {canUseAccount && !pending && !gameplay.data?.activeAttempt && reward && (
        <button
          type="button"
          className="underline mr-4"
          onClick={() =>
            openLevelUp({
              title: 'Choose your Reward!',
              onChoose: (key) => {
                const canonical = accountPower(key);
                if (canonical) {
                  close();
                  void store.claimReward(reward.attemptId, canonical);
                }
              },
            })
          }
        >
          Choose earned reward
        </button>
      )}
      {show && gameplay.status === 'saved' && gameplay.data && gameplay.lastCommand !== 'START' && (
        <p>
          Account level {gameplay.data.playerLevel} · EXP {gameplay.data.playerExp}
        </p>
      )}
      {(pending || interrupted || session === 'expired') && (
        <button
          type="button"
          className="underline"
          onClick={() => {
            close();
            playDemo();
            navigate('/game-map');
          }}
        >
          Play Demo
        </button>
      )}
    </div>
  );
}
