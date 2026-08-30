import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import type { Member, MemberId } from '../../../../packages/domain/src/models';
import type { SessionPolicyContext } from '../../../../packages/domain/src/session/local-session';

import type { LocalSessionStore } from './session';

export type LocalSessionStatus = 'error' | 'loading' | 'ready';

export interface LocalSessionContextValue {
  readonly activeMember: Member | null;
  readonly error: string | null;
  readonly members: readonly Member[];
  readonly pendingMemberId: MemberId | null;
  readonly retry: () => void;
  readonly selectMember: (memberId: MemberId) => Promise<void>;
  readonly status: LocalSessionStatus;
}

type LocalSessionProviderProps = {
  children: ReactNode;
  store?: LocalSessionStore;
};

const defaultContext: LocalSessionContextValue = {
  activeMember: null,
  error: null,
  members: [],
  pendingMemberId: null,
  retry: () => undefined,
  selectMember: async () => undefined,
  status: 'loading',
};

const LocalSessionContext = createContext<LocalSessionContextValue>(defaultContext);

export function LocalSessionProvider({ children, store }: LocalSessionProviderProps) {
  const [status, setStatus] = useState<LocalSessionStatus>('loading');
  const [members, setMembers] = useState<readonly Member[]>([]);
  const [activeMemberId, setActiveMemberId] = useState<MemberId | null>(null);
  const [pendingMemberId, setPendingMemberId] = useState<MemberId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const storeRef = useRef<LocalSessionStore | null>(null);
  const auditSequence = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    storeRef.current = null;

    const storePromise = store
      ? Promise.resolve(store)
      : import('./sqlite-session-store').then(({ createSqliteLocalSessionStore }) =>
          createSqliteLocalSessionStore(),
        );

    void storePromise
      .then((resolvedStore) => {
        if (cancelled) {
          return null;
        }
        storeRef.current = resolvedStore;
        return resolvedStore.load();
      })
      .then((snapshot) => {
        if (!snapshot || cancelled) {
          return;
        }
        setMembers(snapshot.members);
        setActiveMemberId(snapshot.activeMemberId);
        setStatus('ready');
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        storeRef.current = null;
        setStatus('error');
        setError('Local profiles could not be restored. Try again.');
      });

    return () => {
      cancelled = true;
    };
  }, [retryToken, store]);

  const selectMember = useCallback(
    async (memberId: MemberId): Promise<void> => {
      const sessionStore = storeRef.current;
      if (!sessionStore || status !== 'ready' || pendingMemberId !== null) {
        return;
      }

      const sequence = auditSequence.current + 1;
      auditSequence.current = sequence;
      const context: SessionPolicyContext = {
        at: new Date().toISOString(),
        auditEventId: `session-profile-${memberId}-${sequence}`,
      };
      setPendingMemberId(memberId);

      try {
        const outcome = await sessionStore.selectMember(memberId, context);
        if (!mountedRef.current) {
          return;
        }
        if (outcome.accepted) {
          setActiveMemberId(outcome.value.activeMemberId);
          setError(null);
        } else {
          setError(outcome.reason);
        }
      } catch {
        if (mountedRef.current) {
          setError('The local profile could not be saved. Try again.');
        }
      } finally {
        if (mountedRef.current) {
          setPendingMemberId(null);
        }
      }
    },
    [pendingMemberId, status],
  );

  const retry = useCallback(() => {
    storeRef.current = null;
    setStatus('loading');
    setError(null);
    setPendingMemberId(null);
    setRetryToken((current) => current + 1);
  }, []);

  const activeMember = members.find((member) => member.id === activeMemberId) ?? null;

  return (
    <LocalSessionContext.Provider
      value={{
        activeMember,
        error,
        members,
        pendingMemberId,
        retry,
        selectMember,
        status,
      }}
    >
      {children}
    </LocalSessionContext.Provider>
  );
}

export function useLocalSession(): LocalSessionContextValue {
  return useContext(LocalSessionContext);
}
