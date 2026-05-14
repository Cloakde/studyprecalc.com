export type InviteRole = 'student' | 'admin';

export type InviteTimestamp = string | Date;

export type InviteStatus = 'active' | 'expired' | 'used';

export type InviteCodeRecord = {
  id: string;
  code: string;
  role: InviteRole;
  createdAt: string;
  expiresAt?: string;
  email?: string;
  classId?: string;
  createdByAccountId?: string;
  consumedAt?: string;
  consumedByAccountId?: string;
};

export type InviteRecord = InviteCodeRecord;

export type CreateInviteInput = {
  id: string;
  code: string;
  role?: InviteRole;
  createdAt: InviteTimestamp;
  expiresAt?: InviteTimestamp;
  email?: string;
  classId?: string;
  createdByAccountId?: string;
};

export type ValidateInviteCodeInput = {
  code: string;
  invites: InviteCodeRecord[];
  now?: InviteTimestamp;
  email?: string;
};

export type ConsumeInviteCodeInput = ValidateInviteCodeInput & {
  accountId: string;
};

export type InvalidInviteReason = 'empty-code' | 'invalid-code' | 'not-found' | 'email-mismatch';

export type InviteValidationResult =
  | {
      status: 'valid';
      invite: InviteCodeRecord;
    }
  | {
      status: 'invalid';
      reason: InvalidInviteReason;
      invite?: InviteCodeRecord;
    }
  | {
      status: 'expired';
      reason: 'expired';
      invite: InviteCodeRecord;
    }
  | {
      status: 'used';
      reason: 'used';
      invite: InviteCodeRecord;
    };

export type FailedInviteValidationResult = Exclude<InviteValidationResult, { status: 'valid' }>;

export type InviteConsumeResult =
  | {
      status: 'consumed';
      invite: InviteCodeRecord;
      invites: InviteCodeRecord[];
    }
  | (FailedInviteValidationResult & {
      invites: InviteCodeRecord[];
    });
