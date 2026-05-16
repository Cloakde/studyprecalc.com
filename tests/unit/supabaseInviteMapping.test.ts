import { createInvite, type InviteCodeRecord } from '../../src/domain/invites';
import {
  checkSupabaseInviteCode,
  inviteFromSupabaseRow,
  inviteToSupabaseInsertRow,
  inviteToSupabaseRow,
  publicInviteValidationFromSupabaseRpc,
} from '../../src/data/supabase/inviteStore';

function createInviteRecord(overrides: Partial<InviteCodeRecord> = {}): InviteCodeRecord {
  return {
    ...createInvite({
      id: 'invite-1',
      code: 'CL7!UD8@CD9#',
      role: 'student',
      createdAt: '2026-05-13T10:00:00.000Z',
      expiresAt: '2026-05-14T10:00:00.000Z',
      email: 'student@example.com',
      classId: 'class-1',
      createdByAccountId: 'admin-1',
    }),
    consumedAt: '2026-05-13T12:00:00.000Z',
    consumedByAccountId: 'account-1',
    revokedAt: '2026-05-13T13:00:00.000Z',
    ...overrides,
  };
}

describe('supabase invite row mapping', () => {
  it('round-trips invites through Supabase row shape', () => {
    const invite = createInviteRecord();
    const row = inviteToSupabaseRow(invite);

    expect(row).toMatchObject({
      code: 'CL7!UD8@CD9#',
      role: 'student',
      email: 'student@example.com',
      class_id: 'class-1',
      created_by: 'admin-1',
      consumed_by: 'account-1',
      revoked_at: '2026-05-13T13:00:00.000Z',
    });
    expect(inviteFromSupabaseRow(row)).toEqual(invite);
  });

  it('maps optional invite fields to nullable Supabase columns', () => {
    const invite = createInviteRecord({
      email: undefined,
      classId: undefined,
      createdByAccountId: undefined,
      expiresAt: undefined,
      consumedAt: undefined,
      consumedByAccountId: undefined,
      revokedAt: undefined,
    });
    const row = inviteToSupabaseRow(invite);

    expect(row).toMatchObject({
      email: null,
      class_id: null,
      created_by: null,
      expires_at: null,
      consumed_at: null,
      consumed_by: null,
      revoked_at: null,
    });
    expect(inviteFromSupabaseRow(row)).toEqual(invite);
  });

  it('omits the browser-local invite id from Supabase inserts', () => {
    const invite = createInviteRecord();
    const row = inviteToSupabaseInsertRow(invite);

    expect(row).not.toHaveProperty('id');
    expect(row).toMatchObject({
      code: 'CL7!UD8@CD9#',
      role: 'student',
      email: 'student@example.com',
      class_id: 'class-1',
    });
  });
});

describe('supabase public invite validation', () => {
  it('maps the validate_invite RPC response into a public validation result', () => {
    expect(publicInviteValidationFromSupabaseRpc([{ is_valid: true, reason: null }])).toEqual({
      status: 'valid',
    });
    expect(publicInviteValidationFromSupabaseRpc([{ is_valid: false, reason: 'used' }])).toEqual({
      status: 'used',
      reason: 'used',
    });
    expect(
      publicInviteValidationFromSupabaseRpc([{ is_valid: false, reason: 'email-mismatch' }]),
    ).toEqual({
      status: 'invalid',
      reason: 'email-mismatch',
    });
  });

  it('checks invite availability through the public Supabase RPC with normalized inputs', async () => {
    const rpcCalls: unknown[] = [];
    const client = {
      async rpc(functionName: string, parameters: Record<string, string | null>) {
        rpcCalls.push({ functionName, parameters });

        return {
          data: [{ is_valid: true, reason: null }],
          error: null,
        };
      },
    };

    await expect(
      checkSupabaseInviteCode(
        {
          code: ' cl7!ud8@cd9# ',
          email: ' Student@Example.com ',
        },
        client,
      ),
    ).resolves.toEqual({ status: 'valid' });
    expect(rpcCalls).toEqual([
      {
        functionName: 'validate_invite',
        parameters: {
          p_code: 'CL7!UD8@CD9#',
          p_email: 'student@example.com',
        },
      },
    ]);
  });

  it('rejects invalid invite code formats before calling Supabase', async () => {
    const rpcCalls: unknown[] = [];
    const client = {
      async rpc() {
        rpcCalls.push({});

        return {
          data: [{ is_valid: true, reason: null }],
          error: null,
        };
      },
    };

    await expect(checkSupabaseInviteCode('a', client)).resolves.toEqual({
      status: 'invalid',
      reason: 'invalid-code',
    });
    expect(rpcCalls).toEqual([]);
  });
});
