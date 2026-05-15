import type {
  ConsumeInviteCodeInput,
  CreateInviteInput,
  InviteCodeRecord,
  InviteConsumeResult,
  InviteRole,
  InviteStatus,
  InviteTimestamp,
  InviteValidationResult,
  ValidateInviteCodeInput,
} from './types';

const inviteCodePattern = /^[A-Z0-9](?:[A-Z0-9-]{2,62}[A-Z0-9])$/;

function toIsoTimestamp(timestamp: InviteTimestamp): string {
  return timestamp instanceof Date ? timestamp.toISOString() : timestamp;
}

function timestampMs(timestamp: string): number {
  const parsed = Date.parse(timestamp);
  return Number.isNaN(parsed) ? Number.NaN : parsed;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '');
}

export function isInviteCodeFormatValid(code: string): boolean {
  return inviteCodePattern.test(normalizeInviteCode(code));
}

export function isInviteRole(value: unknown): value is InviteRole {
  return value === 'student' || value === 'admin';
}

export function createInvite(input: CreateInviteInput): InviteCodeRecord {
  const code = normalizeInviteCode(input.code);
  const createdAt = toIsoTimestamp(input.createdAt);
  const expiresAt = input.expiresAt ? toIsoTimestamp(input.expiresAt) : undefined;
  const role = input.role ?? 'student';

  if (!input.id.trim()) {
    throw new Error('Invite id is required.');
  }

  if (!isInviteCodeFormatValid(code)) {
    throw new Error('Invite code must be 4 to 64 uppercase letters, numbers, or hyphens.');
  }

  if (!isInviteRole(role)) {
    throw new Error('Invite role must be student or admin.');
  }

  if (Number.isNaN(timestampMs(createdAt))) {
    throw new Error('Invite createdAt must be a valid timestamp.');
  }

  if (expiresAt) {
    const expiresAtMs = timestampMs(expiresAt);

    if (Number.isNaN(expiresAtMs)) {
      throw new Error('Invite expiresAt must be a valid timestamp.');
    }

    if (expiresAtMs <= timestampMs(createdAt)) {
      throw new Error('Invite expiresAt must be after createdAt.');
    }
  }

  return {
    id: input.id.trim(),
    code,
    role,
    createdAt,
    ...(expiresAt ? { expiresAt } : {}),
    ...(input.email?.trim() ? { email: normalizeEmail(input.email) } : {}),
    ...(input.classId?.trim() ? { classId: input.classId.trim() } : {}),
    ...(input.createdByAccountId?.trim()
      ? { createdByAccountId: input.createdByAccountId.trim() }
      : {}),
  };
}

export function isInviteRecord(candidate: unknown): candidate is InviteCodeRecord {
  if (typeof candidate !== 'object' || candidate === null) {
    return false;
  }

  const invite = candidate as Partial<InviteCodeRecord>;

  return (
    typeof invite.id === 'string' &&
    invite.id.trim().length > 0 &&
    typeof invite.code === 'string' &&
    isInviteCodeFormatValid(invite.code) &&
    isInviteRole(invite.role) &&
    typeof invite.createdAt === 'string' &&
    !Number.isNaN(timestampMs(invite.createdAt)) &&
    (invite.expiresAt === undefined ||
      (typeof invite.expiresAt === 'string' && !Number.isNaN(timestampMs(invite.expiresAt)))) &&
    (invite.email === undefined || typeof invite.email === 'string') &&
    (invite.classId === undefined || typeof invite.classId === 'string') &&
    (invite.createdByAccountId === undefined || typeof invite.createdByAccountId === 'string') &&
    (invite.consumedAt === undefined ||
      (typeof invite.consumedAt === 'string' && !Number.isNaN(timestampMs(invite.consumedAt)))) &&
    (invite.consumedByAccountId === undefined || typeof invite.consumedByAccountId === 'string') &&
    (invite.revokedAt === undefined ||
      (typeof invite.revokedAt === 'string' && !Number.isNaN(timestampMs(invite.revokedAt))))
  );
}

export function normalizeInviteRecord(invite: InviteCodeRecord): InviteCodeRecord {
  return {
    id: invite.id.trim(),
    code: normalizeInviteCode(invite.code),
    role: invite.role,
    createdAt: invite.createdAt,
    ...(invite.expiresAt ? { expiresAt: invite.expiresAt } : {}),
    ...(invite.email?.trim() ? { email: normalizeEmail(invite.email) } : {}),
    ...(invite.classId?.trim() ? { classId: invite.classId.trim() } : {}),
    ...(invite.createdByAccountId?.trim()
      ? { createdByAccountId: invite.createdByAccountId.trim() }
      : {}),
    ...(invite.consumedAt ? { consumedAt: invite.consumedAt } : {}),
    ...(invite.consumedByAccountId?.trim()
      ? { consumedByAccountId: invite.consumedByAccountId.trim() }
      : {}),
    ...(invite.revokedAt ? { revokedAt: invite.revokedAt } : {}),
  };
}

export function isInviteExpired(
  invite: InviteCodeRecord,
  now: InviteTimestamp = new Date(),
): boolean {
  if (!invite.expiresAt) {
    return false;
  }

  const expiresAtMs = timestampMs(invite.expiresAt);
  const nowMs = timestampMs(toIsoTimestamp(now));

  return Number.isNaN(expiresAtMs) || Number.isNaN(nowMs) || expiresAtMs <= nowMs;
}

export function isInviteConsumed(invite: InviteCodeRecord): boolean {
  return Boolean(invite.consumedAt || invite.consumedByAccountId);
}

export function isInviteRevoked(invite: InviteCodeRecord): boolean {
  return Boolean(invite.revokedAt);
}

export function getInviteStatus(
  invite: InviteCodeRecord,
  now: InviteTimestamp = new Date(),
): InviteStatus {
  if (isInviteRevoked(invite)) {
    return 'revoked';
  }

  if (isInviteConsumed(invite)) {
    return 'used';
  }

  if (isInviteExpired(invite, now)) {
    return 'expired';
  }

  return 'active';
}

export function validateInviteCode(input: ValidateInviteCodeInput): InviteValidationResult {
  const code = normalizeInviteCode(input.code);

  if (!code) {
    return {
      status: 'invalid',
      reason: 'empty-code',
    };
  }

  if (!isInviteCodeFormatValid(code)) {
    return {
      status: 'invalid',
      reason: 'invalid-code',
    };
  }

  const invite = input.invites
    .map(normalizeInviteRecord)
    .find((candidate) => candidate.code === code);

  if (!invite) {
    return {
      status: 'invalid',
      reason: 'not-found',
    };
  }

  if (input.email && invite.email && normalizeEmail(input.email) !== invite.email) {
    return {
      status: 'invalid',
      reason: 'email-mismatch',
      invite,
    };
  }

  if (isInviteRevoked(invite)) {
    return {
      status: 'revoked',
      reason: 'revoked',
      invite,
    };
  }

  if (isInviteConsumed(invite)) {
    return {
      status: 'used',
      reason: 'used',
      invite,
    };
  }

  if (isInviteExpired(invite, input.now)) {
    return {
      status: 'expired',
      reason: 'expired',
      invite,
    };
  }

  return {
    status: 'valid',
    invite,
  };
}

export function markInviteConsumed(
  invite: InviteCodeRecord,
  metadata: { accountId: string; consumedAt: InviteTimestamp },
): InviteCodeRecord {
  if (!metadata.accountId.trim()) {
    throw new Error('Invite consumer account id is required.');
  }

  return normalizeInviteRecord({
    ...invite,
    consumedAt: toIsoTimestamp(metadata.consumedAt),
    consumedByAccountId: metadata.accountId.trim(),
  });
}

export function markInviteRevoked(
  invite: InviteCodeRecord,
  metadata: { revokedAt: InviteTimestamp },
): InviteCodeRecord {
  const revokedAt = toIsoTimestamp(metadata.revokedAt);

  if (Number.isNaN(timestampMs(revokedAt))) {
    throw new Error('Invite revokedAt must be a valid timestamp.');
  }

  return normalizeInviteRecord({
    ...invite,
    revokedAt,
  });
}

export function consumeInviteCode(input: ConsumeInviteCodeInput): InviteConsumeResult {
  const normalizedInvites = input.invites.map(normalizeInviteRecord);
  const validation = validateInviteCode({
    code: input.code,
    invites: normalizedInvites,
    now: input.now,
    ...(input.email ? { email: input.email } : {}),
  });

  if (validation.status !== 'valid') {
    return {
      ...validation,
      invites: normalizedInvites,
    };
  }

  const consumedInvite = markInviteConsumed(validation.invite, {
    accountId: input.accountId,
    consumedAt: input.now ?? new Date(),
  });

  return {
    status: 'consumed',
    invite: consumedInvite,
    invites: normalizedInvites.map((invite) =>
      invite.id === consumedInvite.id ? consumedInvite : invite,
    ),
  };
}
