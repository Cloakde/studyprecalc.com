import { createInvite, type InviteCodeRecord } from '../../src/domain/invites';
import {
  inviteFromSupabaseRow,
  inviteToSupabaseInsertRow,
  inviteToSupabaseRow,
} from '../../src/data/supabase/inviteStore';

function createInviteRecord(overrides: Partial<InviteCodeRecord> = {}): InviteCodeRecord {
  return {
    ...createInvite({
      id: 'invite-1',
      code: 'cloud-2026',
      role: 'student',
      createdAt: '2026-05-13T10:00:00.000Z',
      expiresAt: '2026-05-14T10:00:00.000Z',
      email: 'student@example.com',
      classId: 'class-1',
      createdByAccountId: 'admin-1',
    }),
    consumedAt: '2026-05-13T12:00:00.000Z',
    consumedByAccountId: 'account-1',
    ...overrides,
  };
}

describe('supabase invite row mapping', () => {
  it('round-trips invites through Supabase row shape', () => {
    const invite = createInviteRecord();
    const row = inviteToSupabaseRow(invite);

    expect(row).toMatchObject({
      code: 'CLOUD-2026',
      role: 'student',
      email: 'student@example.com',
      class_id: 'class-1',
      created_by: 'admin-1',
      consumed_by: 'account-1',
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
    });
    const row = inviteToSupabaseRow(invite);

    expect(row).toMatchObject({
      email: null,
      class_id: null,
      created_by: null,
      expires_at: null,
      consumed_at: null,
      consumed_by: null,
    });
    expect(inviteFromSupabaseRow(row)).toEqual(invite);
  });

  it('omits the browser-local invite id from Supabase inserts', () => {
    const invite = createInviteRecord();
    const row = inviteToSupabaseInsertRow(invite);

    expect(row).not.toHaveProperty('id');
    expect(row).toMatchObject({
      code: 'CLOUD-2026',
      role: 'student',
      email: 'student@example.com',
      class_id: 'class-1',
    });
  });
});
