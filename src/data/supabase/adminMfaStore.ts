import { useCallback, useEffect, useMemo, useState } from 'react';

import { isSupabaseConfigured, supabase } from './client';

type SupabaseErrorLike = {
  message?: string;
};

type SupabaseMfaResult<T> = {
  data: T | null;
  error: SupabaseErrorLike | null;
};

type SupabaseMfaApi = {
  listFactors: () => Promise<SupabaseMfaResult<SupabaseMfaListFactorsData>>;
  getAuthenticatorAssuranceLevel: () => Promise<
    SupabaseMfaResult<SupabaseAuthenticatorAssuranceLevelData>
  >;
  enroll: (input: {
    factorType: 'totp';
    friendlyName?: string;
  }) => Promise<SupabaseMfaResult<SupabaseMfaEnrollData>>;
  challengeAndVerify: (input: {
    factorId: string;
    code: string;
  }) => Promise<SupabaseMfaResult<unknown>>;
};

export type SupabaseAdminMfaClient = {
  auth?: {
    mfa?: SupabaseMfaApi;
  };
};

export type AdminMfaFactorStatus = 'unverified' | 'verified' | string;

export type AdminMfaTotpFactor = {
  id: string;
  factorType: 'totp';
  status: AdminMfaFactorStatus;
  friendlyName?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminMfaAssuranceLevel = 'aal1' | 'aal2' | string;

export type AdminMfaRequirementStatus =
  | 'unavailable'
  | 'setup-required'
  | 'verification-required'
  | 'satisfied';

export type AdminMfaRequirement = {
  status: AdminMfaRequirementStatus;
  isSatisfied: boolean;
  requiresSetup: boolean;
  requiresVerification: boolean;
};

export type AdminMfaState = {
  factors: AdminMfaTotpFactor[];
  currentLevel: AdminMfaAssuranceLevel;
  nextLevel: AdminMfaAssuranceLevel;
  preferredFactor: AdminMfaTotpFactor | null;
  requirement: AdminMfaRequirement;
};

export type AdminTotpEnrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string;
};

type SupabaseMfaFactorData = {
  id?: unknown;
  factor_type?: unknown;
  factorType?: unknown;
  status?: unknown;
  friendly_name?: unknown;
  friendlyName?: unknown;
  created_at?: unknown;
  createdAt?: unknown;
  updated_at?: unknown;
  updatedAt?: unknown;
};

type SupabaseMfaListFactorsData = {
  all?: SupabaseMfaFactorData[];
  totp?: SupabaseMfaFactorData[];
};

type SupabaseAuthenticatorAssuranceLevelData = {
  currentLevel?: unknown;
  current_level?: unknown;
  nextLevel?: unknown;
  next_level?: unknown;
};

type SupabaseMfaEnrollData = {
  id?: unknown;
  totp?: {
    qr_code?: unknown;
    qrCode?: unknown;
    secret?: unknown;
    uri?: unknown;
  } | null;
};

type CreateSupabaseAdminMfaStoreOptions = {
  client?: SupabaseAdminMfaClient | null;
  enabled?: boolean;
};

type UseSupabaseAdminMfaStoreOptions = {
  enabled?: boolean;
  client?: SupabaseAdminMfaClient | null;
};

const unavailableRequirement: AdminMfaRequirement = {
  status: 'unavailable',
  isSatisfied: false,
  requiresSetup: false,
  requiresVerification: false,
};

const emptyAdminMfaState: AdminMfaState = {
  factors: [],
  currentLevel: 'aal1',
  nextLevel: 'aal1',
  preferredFactor: null,
  requirement: unavailableRequirement,
};

function errorMessage(error: SupabaseErrorLike | null | undefined, fallback: string): string {
  return error?.message || fallback;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function normalizeFactor(rawFactor: SupabaseMfaFactorData): AdminMfaTotpFactor | null {
  const factorType = stringValue(rawFactor.factor_type ?? rawFactor.factorType);
  const id = stringValue(rawFactor.id);

  if (!id || factorType !== 'totp') {
    return null;
  }

  const friendlyName = stringValue(rawFactor.friendly_name ?? rawFactor.friendlyName);
  const createdAt = stringValue(rawFactor.created_at ?? rawFactor.createdAt);
  const updatedAt = stringValue(rawFactor.updated_at ?? rawFactor.updatedAt);

  return {
    id,
    factorType: 'totp',
    status: stringValue(rawFactor.status) || 'unverified',
    ...(friendlyName ? { friendlyName } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(updatedAt ? { updatedAt } : {}),
  };
}

function sortTotpFactors(factors: AdminMfaTotpFactor[]): AdminMfaTotpFactor[] {
  return [...factors].sort((left, right) => {
    if (left.status === 'verified' && right.status !== 'verified') {
      return -1;
    }

    if (right.status === 'verified' && left.status !== 'verified') {
      return 1;
    }

    return (right.updatedAt ?? right.createdAt ?? '').localeCompare(
      left.updatedAt ?? left.createdAt ?? '',
    );
  });
}

function getMfaApi(enabled: boolean, client: SupabaseAdminMfaClient | null): SupabaseMfaApi {
  if (!enabled || !client?.auth?.mfa) {
    throw new Error('Supabase MFA is not configured.');
  }

  return client.auth.mfa;
}

export function normalizeMfaCode(code: string): string {
  return code.trim().replace(/[\s-]+/g, '');
}

export function selectPreferredTotpFactor(
  factors: AdminMfaTotpFactor[],
): AdminMfaTotpFactor | null {
  return sortTotpFactors(factors)[0] ?? null;
}

export function deriveAdminMfaRequirement(input: {
  enabled: boolean;
  currentLevel?: AdminMfaAssuranceLevel | null;
  factors?: AdminMfaTotpFactor[];
}): AdminMfaRequirement {
  if (!input.enabled) {
    return unavailableRequirement;
  }

  if (input.currentLevel === 'aal2') {
    return {
      status: 'satisfied',
      isSatisfied: true,
      requiresSetup: false,
      requiresVerification: false,
    };
  }

  const hasVerifiedTotpFactor = (input.factors ?? []).some(
    (factor) => factor.status === 'verified',
  );

  if (!hasVerifiedTotpFactor) {
    return {
      status: 'setup-required',
      isSatisfied: false,
      requiresSetup: true,
      requiresVerification: false,
    };
  }

  return {
    status: 'verification-required',
    isSatisfied: false,
    requiresSetup: false,
    requiresVerification: true,
  };
}

export function createSupabaseAdminMfaStore({
  client = supabase as SupabaseAdminMfaClient | null,
  enabled = isSupabaseConfigured,
}: CreateSupabaseAdminMfaStoreOptions = {}) {
  async function listFactorsAndAal(): Promise<AdminMfaState> {
    if (!enabled || !client?.auth?.mfa) {
      return emptyAdminMfaState;
    }

    const mfa = getMfaApi(enabled, client);
    const [factorResponse, assuranceResponse] = await Promise.all([
      mfa.listFactors(),
      mfa.getAuthenticatorAssuranceLevel(),
    ]);

    if (factorResponse.error) {
      throw new Error(errorMessage(factorResponse.error, 'Unable to load MFA factors.'));
    }

    if (assuranceResponse.error) {
      throw new Error(errorMessage(assuranceResponse.error, 'Unable to load MFA status.'));
    }

    const factorRows = factorResponse.data?.totp?.length
      ? factorResponse.data.totp
      : (factorResponse.data?.all ?? []);
    const factors = sortTotpFactors(
      factorRows.flatMap((factor) => {
        const normalizedFactor = normalizeFactor(factor);
        return normalizedFactor ? [normalizedFactor] : [];
      }),
    );
    const currentLevel =
      stringValue(assuranceResponse.data?.currentLevel ?? assuranceResponse.data?.current_level) ||
      'aal1';
    const nextLevel =
      stringValue(assuranceResponse.data?.nextLevel ?? assuranceResponse.data?.next_level) ||
      currentLevel;

    return {
      factors,
      currentLevel,
      nextLevel,
      preferredFactor: selectPreferredTotpFactor(factors),
      requirement: deriveAdminMfaRequirement({
        enabled,
        currentLevel,
        factors,
      }),
    };
  }

  async function startTotpEnrollment(friendlyName?: string): Promise<AdminTotpEnrollment> {
    const mfa = getMfaApi(enabled, client);
    const { data, error } = await mfa.enroll({
      factorType: 'totp',
      ...(friendlyName?.trim() ? { friendlyName: friendlyName.trim() } : {}),
    });

    if (error) {
      throw new Error(errorMessage(error, 'Unable to start MFA enrollment.'));
    }

    const factorId = stringValue(data?.id);
    const qrCode = stringValue(data?.totp?.qr_code ?? data?.totp?.qrCode);
    const secret = stringValue(data?.totp?.secret);
    const uri = stringValue(data?.totp?.uri);

    if (!factorId || !qrCode || !secret || !uri) {
      throw new Error('Supabase did not return a complete TOTP enrollment.');
    }

    return {
      factorId,
      qrCode,
      secret,
      uri,
    };
  }

  async function verifyTotpFactor(factorId: string, code: string): Promise<void> {
    const normalizedFactorId = factorId.trim();
    const normalizedCode = normalizeMfaCode(code);

    if (!normalizedFactorId) {
      throw new Error('Choose an MFA factor to verify.');
    }

    if (!/^\d{6}$/.test(normalizedCode)) {
      throw new Error('Enter the 6-digit MFA code.');
    }

    const mfa = getMfaApi(enabled, client);
    const { error } = await mfa.challengeAndVerify({
      factorId: normalizedFactorId,
      code: normalizedCode,
    });

    if (error) {
      throw new Error(errorMessage(error, 'Unable to verify MFA code.'));
    }
  }

  return {
    listFactorsAndAal,
    startTotpEnrollment,
    verifyTotpEnrollment: verifyTotpFactor,
    verifyTotpFactor,
  };
}

export function useSupabaseAdminMfaStore({
  enabled = isSupabaseConfigured,
  client = supabase as SupabaseAdminMfaClient | null,
}: UseSupabaseAdminMfaStoreOptions = {}) {
  const [state, setState] = useState<AdminMfaState>(emptyAdminMfaState);
  const [enrollment, setEnrollment] = useState<AdminTotpEnrollment | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [lastError, setLastError] = useState('');

  const store = useMemo(
    () =>
      createSupabaseAdminMfaStore({
        client,
        enabled,
      }),
    [client, enabled],
  );

  const clearLastError = useCallback(() => {
    setLastError('');
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled || !client?.auth?.mfa) {
      setState(emptyAdminMfaState);
      setIsLoading(false);
      return emptyAdminMfaState;
    }

    setIsLoading(true);

    try {
      const nextState = await store.listFactorsAndAal();
      setState(nextState);
      setLastError('');
      return nextState;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load MFA status.';
      setLastError(message);
      return emptyAdminMfaState;
    } finally {
      setIsLoading(false);
    }
  }, [client?.auth?.mfa, enabled, store]);

  const startTotpEnrollment = useCallback(
    async (friendlyName?: string) => {
      try {
        setLastError('');
        const nextEnrollment = await store.startTotpEnrollment(friendlyName);
        setEnrollment(nextEnrollment);
        await refresh();
        return nextEnrollment;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to start MFA enrollment.';
        setLastError(message);
        throw error;
      }
    },
    [refresh, store],
  );

  const verifyTotpEnrollment = useCallback(
    async (factorId: string, code: string) => {
      try {
        setLastError('');
        await store.verifyTotpEnrollment(factorId, code);
        setEnrollment(null);
        return await refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to verify MFA enrollment.';
        setLastError(message);
        throw error;
      }
    },
    [refresh, store],
  );

  const verifyTotpFactor = useCallback(
    async (factorId: string, code: string) => {
      try {
        setLastError('');
        await store.verifyTotpFactor(factorId, code);
        return await refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to verify MFA code.';
        setLastError(message);
        throw error;
      }
    },
    [refresh, store],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    ...state,
    enrollment,
    isEnabled: enabled && Boolean(client?.auth?.mfa),
    isLoading,
    lastError,
    clearLastError,
    refresh,
    startTotpEnrollment,
    verifyTotpEnrollment,
    verifyTotpFactor,
  };
}
