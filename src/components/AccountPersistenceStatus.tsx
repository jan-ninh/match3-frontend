import { useNavigate } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import { useAccountOutcome } from '@/context/OutcomeContext';
import { useOverlays } from '@/features/overlays';
import { canonicalGuestPower } from '@/services/guest/guestStore';
export default function AccountPersistenceStatus() {
  const navigate = useNavigate();
  const { user, updatePowers, playDemo, generation, mode, session } = useAuth();
  const { outcome, store } = useAccountOutcome();
  const { openLevelUp, close } = useOverlays();
  if (mode !== 'account' || !outcome || (user && outcome.ownerId !== user.id)) return null;
  if (outcome.generation !== generation)
    return user && store.blocked(user.id) ? (
      <p role="status" className="text-center">
        A previous account save is unresolved. Play Demo or check your account later.
      </p>
    ) : null;
  const result = outcome.result as { playerLevel?: number; playerExp?: number } | undefined;
  const reward =
    !!user &&
    session === 'verified' &&
    outcome.status === 'saved' &&
    !outcome.rewardClaimed &&
    outcome.rewardFromLevel !== undefined &&
    typeof result?.playerLevel === 'number' &&
    result.playerLevel > outcome.rewardFromLevel;
  const labels = { saving: 'Saving', saved: 'Saved to account', unconfirmed: 'Save unconfirmed', 'not-accepted': 'Not accepted' };
  return (
    <div role="status" className="text-center text-sm py-2">
      <p>{labels[outcome.status]}</p>
      {session === 'expired' && <p>Session expired. Sign in again or play Demo.</p>}
      {outcome.status === 'unconfirmed' && (
        <p>Persistence could not be confirmed. Account changes will not be replayed. Use Demo or check your account later.</p>
      )}
      {outcome.status === 'saved' && result?.playerLevel !== undefined && (
        <p>
          Account level {result.playerLevel} · EXP {result.playerExp}
        </p>
      )}
      {reward && (
        <button
          type="button"
          className="underline"
          onClick={() =>
            openLevelUp({
              title: 'Choose your Reward!',
              onChoose: (key) => {
                const canonical = canonicalGuestPower(key);
                if (canonical) store.claimReward(outcome.id, () => updatePowers({ [canonical]: 2 }, 'add'));
              },
            })
          }
        >
          Choose earned reward
        </button>
      )}
      {outcome.status !== 'saved' && (
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
