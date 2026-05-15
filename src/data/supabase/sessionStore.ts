import { useCallback, useEffect, useRef, useState } from 'react';

import type { AttemptTimestamp } from '../../domain/attempts/types';
import type { SessionResult } from '../../domain/sessions/types';
import {
  mergeSessionsById,
  parseSessionImportPayload,
  serializeSessions,
  sortSessionsBySubmittedAt,
  validateSessionResult,
  type ImportSessionsResult,
} from '../localSessionStore';
import { supabase } from './client';

type SessionRow = {
  id: string;
  user_id: string;
  question_set_version: string;
  started_at: string;
  submitted_at: string;
  updated_at: string;
  duration_seconds: number;
  time_limit_seconds: number | null;
  filters: SessionResult['filters'];
  planned_question_count: number;
  answered_question_count: number;
  score: number;
  max_score: number;
  percent: number;
  pending_manual_score_count: number;
  missed_question_ids: string[];
  marked_question_ids: string[];
  question_results: SessionResult['questionResults'];
};

type SupabasePersistenceResult = {
  error: { message?: string } | null;
};

type UseSupabaseSessionStoreOptions = {
  enabled: boolean;
  userId?: string;
};

function getPersistenceErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string' &&
    error.message
  ) {
    return error.message;
  }

  return fallback;
}

async function recordSupabasePersistenceResult(
  operation: () => PromiseLike<SupabasePersistenceResult>,
  setLastError: (message: string) => void,
  fallbackMessage: string,
): Promise<void> {
  try {
    const { error } = await operation();

    setLastError(error ? getPersistenceErrorMessage(error, fallbackMessage) : '');
  } catch (error) {
    setLastError(getPersistenceErrorMessage(error, fallbackMessage));
  }
}

export function sessionToSupabaseRow(session: SessionResult, userId: string): SessionRow {
  return {
    id: session.id,
    user_id: userId,
    question_set_version: session.questionSetVersion,
    started_at: session.startedAt,
    submitted_at: session.submittedAt,
    updated_at: session.updatedAt,
    duration_seconds: session.durationSeconds,
    time_limit_seconds: session.timeLimitSeconds ?? null,
    filters: session.filters,
    planned_question_count: session.plannedQuestionCount,
    answered_question_count: session.answeredQuestionCount,
    score: session.score,
    max_score: session.maxScore,
    percent: session.percent,
    pending_manual_score_count: session.pendingManualScoreCount,
    missed_question_ids: session.missedQuestionIds,
    marked_question_ids: session.markedQuestionIds,
    question_results: session.questionResults,
  };
}

export function sessionFromSupabaseRow(row: SessionRow): SessionResult {
  return validateSessionResult({
    id: row.id,
    questionSetVersion: row.question_set_version,
    startedAt: row.started_at,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
    durationSeconds: row.duration_seconds,
    ...(row.time_limit_seconds === null ? {} : { timeLimitSeconds: row.time_limit_seconds }),
    filters: row.filters,
    plannedQuestionCount: row.planned_question_count,
    answeredQuestionCount: row.answered_question_count,
    score: row.score,
    maxScore: row.max_score,
    percent: row.percent,
    pendingManualScoreCount: row.pending_manual_score_count,
    missedQuestionIds: row.missed_question_ids,
    markedQuestionIds: row.marked_question_ids,
    questionResults: row.question_results,
  });
}

export function useSupabaseSessionStore({ enabled, userId }: UseSupabaseSessionStoreOptions) {
  const [sessions, setSessions] = useState<SessionResult[]>([]);
  const [lastError, setLastError] = useState('');
  const sessionsRef = useRef(sessions);

  const setSortedSessions = useCallback((nextSessions: SessionResult[]) => {
    const sortedSessions = sortSessionsBySubmittedAt(nextSessions);
    sessionsRef.current = sortedSessions;
    setSessions(sortedSessions);
    return sortedSessions;
  }, []);

  const persistSession = useCallback(
    async (session: SessionResult) => {
      if (!enabled || !supabase || !userId) {
        return;
      }

      const client = supabase;

      await recordSupabasePersistenceResult(
        () =>
          client
            .from('session_results')
            .upsert(sessionToSupabaseRow(session, userId), { onConflict: 'id' }),
        setLastError,
        'Unable to save session result.',
      );
    },
    [enabled, userId],
  );

  const saveSessionResult = useCallback(
    (session: SessionResult) => {
      const validatedSession = validateSessionResult(session);
      const merged = mergeSessionsById(sessionsRef.current, [validatedSession]);

      setSortedSessions(merged.sessions);
      void persistSession(validatedSession);
      return validatedSession;
    },
    [persistSession, setSortedSessions],
  );

  const importSessions = useCallback(
    (payload: unknown): ImportSessionsResult => {
      const parsed = parseSessionImportPayload(payload);
      const merged = mergeSessionsById(sessionsRef.current, parsed.sessions);
      const nextSessions = setSortedSessions(merged.sessions);

      if (enabled && supabase && userId) {
        const client = supabase;

        void recordSupabasePersistenceResult(
          () =>
            client.from('session_results').upsert(
              nextSessions.map((session) => sessionToSupabaseRow(session, userId)),
              { onConflict: 'id' },
            ),
          setLastError,
          'Unable to sync imported sessions.',
        );
      }

      return {
        ...merged,
        imported: parsed.sessions.length,
        rejectedCount: parsed.rejectedCount,
        errors: parsed.errors,
      };
    },
    [enabled, setSortedSessions, userId],
  );

  const removeSession = useCallback(
    (sessionId: string) => {
      const nextSessions = sessionsRef.current.filter((session) => session.id !== sessionId);
      setSortedSessions(nextSessions);

      if (enabled && supabase && userId) {
        const client = supabase;

        void recordSupabasePersistenceResult(
          () => client.from('session_results').delete().eq('user_id', userId).eq('id', sessionId),
          setLastError,
          'Unable to remove session from cloud storage.',
        );
      }

      return nextSessions;
    },
    [enabled, setSortedSessions, userId],
  );

  const clearSessions = useCallback(() => {
    sessionsRef.current = [];
    setSessions([]);

    if (enabled && supabase && userId) {
      const client = supabase;

      void recordSupabasePersistenceResult(
        () => client.from('session_results').delete().eq('user_id', userId).neq('id', ''),
        setLastError,
        'Unable to clear cloud session history.',
      );
    }
  }, [enabled, userId]);

  const exportSessions = useCallback(
    (exportedAt?: AttemptTimestamp) => serializeSessions(sessionsRef.current, exportedAt),
    [],
  );

  useEffect(() => {
    if (!enabled || !supabase || !userId) {
      setSortedSessions([]);
      setLastError('');
      return;
    }

    const client = supabase;
    let isCancelled = false;

    async function loadSessions() {
      const { data, error } = await client
        .from('session_results')
        .select('*')
        .eq('user_id', userId)
        .order('submitted_at', { ascending: false });

      if (isCancelled) {
        return;
      }

      if (error) {
        setLastError(getPersistenceErrorMessage(error, 'Unable to load session history.'));
        return;
      }

      setLastError('');
      setSortedSessions((data ?? []).map((row) => sessionFromSupabaseRow(row as SessionRow)));
    }

    void loadSessions();

    return () => {
      isCancelled = true;
    };
  }, [enabled, setSortedSessions, userId]);

  return {
    sessions,
    lastError,
    saveSessionResult,
    importSessions,
    exportSessions,
    removeSession,
    clearSessions,
  };
}
