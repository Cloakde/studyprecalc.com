import { useCallback, useEffect, useState } from 'react';

import type { CreateLocalInviteInput } from '../localInviteStore';
import {
  consumeInviteCode as consumeInviteCodeInDomain,
  createInvite,
  createRandomInviteCode,
  isInviteCodeFormatValid,
  markInviteConsumed,
  markInviteRevoked,
  normalizeInviteCode,
  normalizeInviteRecord,
  validateInviteCode as validateInviteCodeInDomain,
  type InviteCodeRecord,
  type InviteConsumeResult,
  type InvalidInviteReason,
  type InviteRole,
  type InviteValidationResult,
} from '../../domain/invites';
import { supabase } from './client';

export type InviteRow = {
  id: string;
  code: string;
  role: InviteRole;
  email: string | null;
  class_id: string | null;
  created_by: string | null;
  created_at: string;
  expires_at: string | null;
  consumed_at: string | null;
  consumed_by: string | null;
  revoked_at?: string | null;
};

export type InviteInsertRow = Omit<InviteRow, 'id'>;

export type SupabaseInviteCodeLookup = string | { code: string; email?: string };

export type PublicInviteValidationResult =
  | {
      status: 'valid';
    }
  | {
      status: 'invalid';
      reason: InvalidInviteReason;
    }
  | {
      status: 'expired';
      reason: 'expired';
    }
  | {
      status: 'used';
      reason: 'used';
    }
  | {
      status: 'revoked';
      reason: 'revoked';
    };

export type ConsumeSupabaseInviteInput = {
  code: string;
  accountId: string;
  email?: string;
};

export type CreateSupabaseInviteOptions = {
  userId: string;
  now?: () => Date;
  createId?: () => string;
  createCode?: () => string;
};

export type UseSupabaseInviteStoreOptions = {
  enabled: boolean;
  userId?: string;
  now?: () => Date;
  createId?: () => string;
  createCode?: () => string;
};

type SupabaseValidateInviteRow = {
  is_valid: boolean;
  reason: string | null;
};

type SupabaseInviteRpcClient = {
  rpc: (
    functionName: string,
    parameters: Record<string, string | null>,
  ) => PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>;
};

function createBrowserId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeLookup(input: SupabaseInviteCodeLookup): { code: string; email?: string } {
  return typeof input === 'string' ? { code: input } : input;
}

function normalizeRpcReason(reason: string | null | undefined): PublicInviteValidationResult {
  switch (reason) {
    case 'missing':
    case 'empty-code':
      return {
        status: 'invalid',
        reason: 'empty-code',
      };
    case 'invalid-code':
    case 'not-found':
    case 'email-mismatch':
      return {
        status: 'invalid',
        reason: reason as InvalidInviteReason,
      };
    case 'expired':
      return {
        status: 'expired',
        reason: 'expired',
      };
    case 'used':
      return {
        status: 'used',
        reason: 'used',
      };
    case 'revoked':
      return {
        status: 'revoked',
        reason: 'revoked',
      };
    default:
      return {
        status: 'invalid',
        reason: 'not-found',
      };
  }
}

export function publicInviteValidationFromSupabaseRpc(data: unknown): PublicInviteValidationResult {
  const row = Array.isArray(data) ? data[0] : data;

  if (!row || typeof row !== 'object') {
    return {
      status: 'invalid',
      reason: 'not-found',
    };
  }

  const result = row as Partial<SupabaseValidateInviteRow>;

  if (result.is_valid === true) {
    return {
      status: 'valid',
    };
  }

  return normalizeRpcReason(result.reason);
}

export function inviteFromSupabaseRow(row: InviteRow): InviteCodeRecord {
  return normalizeInviteRecord({
    id: row.id,
    code: row.code,
    role: row.role,
    createdAt: row.created_at,
    ...(row.expires_at ? { expiresAt: row.expires_at } : {}),
    ...(row.email ? { email: row.email } : {}),
    ...(row.class_id ? { classId: row.class_id } : {}),
    ...(row.created_by ? { createdByAccountId: row.created_by } : {}),
    ...(row.consumed_at ? { consumedAt: row.consumed_at } : {}),
    ...(row.consumed_by ? { consumedByAccountId: row.consumed_by } : {}),
    ...(row.revoked_at ? { revokedAt: row.revoked_at } : {}),
  });
}

export function inviteToSupabaseRow(invite: InviteCodeRecord): InviteRow {
  return {
    id: invite.id,
    code: invite.code,
    role: invite.role,
    email: invite.email ?? null,
    class_id: invite.classId ?? null,
    created_by: invite.createdByAccountId ?? null,
    created_at: invite.createdAt,
    expires_at: invite.expiresAt ?? null,
    consumed_at: invite.consumedAt ?? null,
    consumed_by: invite.consumedByAccountId ?? null,
    revoked_at: invite.revokedAt ?? null,
  };
}

export function inviteToSupabaseInsertRow(invite: InviteCodeRecord): InviteInsertRow {
  const row = inviteToSupabaseRow(invite);

  return {
    code: row.code,
    role: row.role,
    email: row.email,
    class_id: row.class_id,
    created_by: row.created_by,
    created_at: row.created_at,
    expires_at: row.expires_at,
    consumed_at: row.consumed_at,
    consumed_by: row.consumed_by,
    revoked_at: row.revoked_at,
  };
}

function createInviteFromInput(
  input: CreateLocalInviteInput,
  userId: string,
  options: Omit<CreateSupabaseInviteOptions, 'userId'> = {},
): InviteCodeRecord {
  const now = options.now ?? (() => new Date());
  const createId = options.createId ?? (() => createBrowserId('invite'));
  const createCode = options.createCode ?? createRandomInviteCode;

  return createInvite({
    id: input.id ?? createId(),
    code: input.code ?? createCode(),
    role: input.role,
    createdAt: input.createdAt ?? now(),
    ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
    ...(input.email ? { email: input.email } : {}),
    ...(input.classId ? { classId: input.classId } : {}),
    createdByAccountId: input.createdByAccountId ?? userId,
  });
}

async function loadInviteByCode(code: string): Promise<InviteCodeRecord | null> {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('invites')
    .select('*')
    .eq('code', code)
    .maybeSingle<InviteRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ? inviteFromSupabaseRow(data) : null;
}

async function loadInviteById(id: string): Promise<InviteCodeRecord | null> {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('invites')
    .select('*')
    .eq('id', id)
    .maybeSingle<InviteRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ? inviteFromSupabaseRow(data) : null;
}

export async function createSupabaseInvite(
  input: CreateLocalInviteInput = {},
  options: CreateSupabaseInviteOptions,
): Promise<InviteCodeRecord> {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const invite = createInviteFromInput(input, options.userId, options);
  const { data, error } = await supabase
    .from('invites')
    .insert(inviteToSupabaseInsertRow(invite))
    .select('*')
    .single<InviteRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ? inviteFromSupabaseRow(data) : invite;
}

export async function validateSupabaseInviteCode(
  input: SupabaseInviteCodeLookup,
  options: Pick<UseSupabaseInviteStoreOptions, 'now'> = {},
): Promise<InviteValidationResult> {
  const lookup = normalizeLookup(input);
  const code = normalizeInviteCode(lookup.code);

  if (!code || !isInviteCodeFormatValid(code)) {
    return validateInviteCodeInDomain({
      code,
      invites: [],
      now: options.now?.(),
      ...(lookup.email ? { email: lookup.email } : {}),
    });
  }

  const invite = await loadInviteByCode(code);

  return validateInviteCodeInDomain({
    code,
    invites: invite ? [invite] : [],
    now: options.now?.(),
    ...(lookup.email ? { email: lookup.email } : {}),
  });
}

export async function checkSupabaseInviteCode(
  input: SupabaseInviteCodeLookup,
  client: SupabaseInviteRpcClient | undefined = supabase as unknown as
    | SupabaseInviteRpcClient
    | undefined,
): Promise<PublicInviteValidationResult> {
  if (!client) {
    throw new Error('Supabase is not configured.');
  }

  const lookup = normalizeLookup(input);
  const code = normalizeInviteCode(lookup.code);

  if (!code || !isInviteCodeFormatValid(code)) {
    return validateInviteCodeInDomain({
      code,
      invites: [],
      ...(lookup.email ? { email: lookup.email } : {}),
    });
  }

  const { data, error } = await client.rpc('validate_invite', {
    p_code: code,
    p_email: lookup.email?.trim() ? lookup.email.trim().toLowerCase() : null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return publicInviteValidationFromSupabaseRpc(data);
}

export async function consumeSupabaseInviteCode(
  input: ConsumeSupabaseInviteInput,
  options: Pick<UseSupabaseInviteStoreOptions, 'now'> = {},
): Promise<InviteConsumeResult> {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const now = options.now ?? (() => new Date());
  const validation = await validateSupabaseInviteCode(
    {
      code: input.code,
      ...(input.email ? { email: input.email } : {}),
    },
    { now },
  );

  if (validation.status !== 'valid') {
    return {
      ...validation,
      invites: validation.invite ? [validation.invite] : [],
    };
  }

  const consumedInvite = markInviteConsumed(validation.invite, {
    accountId: input.accountId,
    consumedAt: now(),
  });
  const { data, error } = await supabase
    .from('invites')
    .update({
      consumed_at: consumedInvite.consumedAt,
      consumed_by: consumedInvite.consumedByAccountId,
    })
    .eq('id', validation.invite.id)
    .is('consumed_at', null)
    .is('revoked_at', null)
    .select('*')
    .maybeSingle<InviteRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    const currentInvite = await loadInviteById(validation.invite.id);
    const currentValidation = validateInviteCodeInDomain({
      code: input.code,
      invites: currentInvite ? [currentInvite] : [],
      now: now(),
      ...(input.email ? { email: input.email } : {}),
    });

    if (currentValidation.status !== 'valid') {
      return {
        ...currentValidation,
        invites: currentValidation.invite ? [currentValidation.invite] : [],
      };
    }

    return {
      status: 'used',
      reason: 'used',
      invite: validation.invite,
      invites: [validation.invite],
    };
  }

  const updatedInvite = inviteFromSupabaseRow(data);

  return consumeInviteCodeInDomain({
    code: updatedInvite.code,
    accountId: input.accountId,
    invites: [validation.invite],
    now: updatedInvite.consumedAt ?? now(),
    ...(input.email ? { email: input.email } : {}),
  });
}

export function useSupabaseInviteStore({
  enabled,
  userId,
  now,
  createId,
  createCode,
}: UseSupabaseInviteStoreOptions) {
  const [invites, setInvites] = useState<InviteCodeRecord[]>([]);
  const [lastError, setLastError] = useState('');

  const refreshInvites = useCallback(async () => {
    if (!enabled || !supabase) {
      setInvites([]);
      setLastError('');
      return;
    }

    const { data, error } = await supabase
      .from('invites')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setLastError(error.message);
      return;
    }

    setLastError('');
    setInvites((data ?? []).map((row) => inviteFromSupabaseRow(row as InviteRow)));
  }, [enabled]);

  const createInviteRecord = useCallback(
    async (input: CreateLocalInviteInput = {}) => {
      if (!enabled || !supabase || !userId) {
        throw new Error('Cloud invites are not available.');
      }

      try {
        const savedInvite = await createSupabaseInvite(input, {
          userId,
          ...(now ? { now } : {}),
          ...(createId ? { createId } : {}),
          ...(createCode ? { createCode } : {}),
        });
        setLastError('');
        setInvites((currentInvites) => [savedInvite, ...currentInvites]);
        return savedInvite;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to create invite.';
        setLastError(message);
        throw error;
      }
    },
    [createCode, createId, enabled, now, userId],
  );

  const validateCode = useCallback(
    (input: SupabaseInviteCodeLookup) => checkSupabaseInviteCode(input),
    [],
  );

  const consumeCode = useCallback(
    async (input: ConsumeSupabaseInviteInput) => {
      const result = await consumeSupabaseInviteCode(input, { now });

      if (result.status === 'consumed') {
        setInvites((currentInvites) =>
          currentInvites.map((invite) => (invite.id === result.invite.id ? result.invite : invite)),
        );
      }

      return result;
    },
    [now],
  );

  const revokeInvite = useCallback(
    async (inviteId: string) => {
      const revokedAt = new Date().toISOString();

      if (enabled && supabase) {
        const { data, error } = await supabase
          .from('invites')
          .update({ revoked_at: revokedAt })
          .eq('id', inviteId)
          .select('*')
          .maybeSingle<InviteRow>();

        if (error) {
          setLastError(error.message);
          return;
        }

        setLastError('');

        if (data) {
          const revokedInvite = inviteFromSupabaseRow(data);
          setInvites((currentInvites) =>
            currentInvites.map((invite) => (invite.id === inviteId ? revokedInvite : invite)),
          );
          return;
        }
      }

      setInvites((currentInvites) =>
        currentInvites.map((invite) =>
          invite.id === inviteId ? markInviteRevoked(invite, { revokedAt }) : invite,
        ),
      );
    },
    [enabled],
  );

  useEffect(() => {
    void refreshInvites();
  }, [refreshInvites]);

  return {
    invites,
    lastError,
    createInvite: createInviteRecord,
    validateInviteCode: validateCode,
    consumeInviteCode: consumeCode,
    revokeInvite,
    refreshInvites,
  };
}
