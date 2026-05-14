import {
  consumeInviteCode,
  createInvite,
  validateInviteCode,
  type InviteCodeRecord,
} from '../../src/domain/invites';

const now = '2026-05-13T12:00:00.000Z';

function createBaseInvite(overrides: Partial<InviteCodeRecord> = {}): InviteCodeRecord {
  return {
    ...createInvite({
      id: 'invite-1',
      code: 'beta-2026',
      role: 'student',
      createdAt: '2026-05-13T10:00:00.000Z',
      expiresAt: '2026-05-14T10:00:00.000Z',
    }),
    ...overrides,
  };
}

describe('invite domain helpers', () => {
  it('validates an active invite code', () => {
    const invite = createBaseInvite();
    const result = validateInviteCode({
      code: ' beta-2026 ',
      invites: [invite],
      now,
    });

    expect(result.status).toBe('valid');

    if (result.status !== 'valid') {
      throw new Error('Expected invite to be valid.');
    }

    expect(result.invite).toMatchObject({
      id: 'invite-1',
      code: 'BETA-2026',
      role: 'student',
    });
  });

  it('rejects invalid invite codes', () => {
    expect(
      validateInviteCode({
        code: '',
        invites: [createBaseInvite()],
        now,
      }),
    ).toMatchObject({
      status: 'invalid',
      reason: 'empty-code',
    });

    expect(
      validateInviteCode({
        code: 'missing-2026',
        invites: [createBaseInvite()],
        now,
      }),
    ).toMatchObject({
      status: 'invalid',
      reason: 'not-found',
    });
  });

  it('rejects expired invite codes', () => {
    const invite = createBaseInvite({
      expiresAt: '2026-05-13T11:59:59.000Z',
    });

    expect(
      validateInviteCode({
        code: 'BETA-2026',
        invites: [invite],
        now,
      }),
    ).toMatchObject({
      status: 'expired',
      reason: 'expired',
    });
  });

  it('rejects used invite codes', () => {
    const invite = createBaseInvite({
      consumedAt: '2026-05-13T11:00:00.000Z',
      consumedByAccountId: 'account-1',
    });

    expect(
      validateInviteCode({
        code: 'BETA-2026',
        invites: [invite],
        now,
      }),
    ).toMatchObject({
      status: 'used',
      reason: 'used',
    });
  });

  it('consumes a valid invite code once', () => {
    const invite = createBaseInvite();
    const firstConsumption = consumeInviteCode({
      code: 'BETA-2026',
      invites: [invite],
      now,
      accountId: 'account-1',
    });

    expect(firstConsumption.status).toBe('consumed');

    if (firstConsumption.status !== 'consumed') {
      throw new Error('Expected invite to be consumed.');
    }

    expect(firstConsumption.invite).toMatchObject({
      consumedAt: now,
      consumedByAccountId: 'account-1',
    });

    expect(
      validateInviteCode({
        code: 'BETA-2026',
        invites: firstConsumption.invites,
        now,
      }),
    ).toMatchObject({
      status: 'used',
      reason: 'used',
    });
  });
});
