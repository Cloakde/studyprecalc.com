import {
  consumeInviteCode,
  createInvite,
  createRandomInviteCode,
  getInviteStatus,
  markInviteRevoked,
  validateInviteCode,
  type InviteCodeRecord,
} from '../../src/domain/invites';

const now = '2026-05-13T12:00:00.000Z';

function createBaseInvite(overrides: Partial<InviteCodeRecord> = {}): InviteCodeRecord {
  return {
    ...createInvite({
      id: 'invite-1',
      code: 'AB7!CD8@EF9#',
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
      code: ' ab7!cd8@ef9# ',
      invites: [invite],
      now,
    });

    expect(result.status).toBe('valid');

    if (result.status !== 'valid') {
      throw new Error('Expected invite to be valid.');
    }

    expect(result.invite).toMatchObject({
      id: 'invite-1',
      code: 'AB7!CD8@EF9#',
      role: 'student',
    });
  });

  it('generates 12-character codes with letters, numbers, and safe symbols', () => {
    const code = createRandomInviteCode();

    expect(code).toMatch(/^[A-Z0-9!@#$%*?]{12}$/);
    expect(code).toMatch(/[A-Z]/);
    expect(code).toMatch(/[0-9]/);
    expect(code).toMatch(/[!@#$%*?]/);
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
        code: 'ZZ9!ZZ9!ZZ9!',
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
        code: 'AB7!CD8@EF9#',
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
        code: 'AB7!CD8@EF9#',
        invites: [invite],
        now,
      }),
    ).toMatchObject({
      status: 'used',
      reason: 'used',
    });
  });

  it('keeps revoked invite codes auditable and unavailable', () => {
    const invite = markInviteRevoked(createBaseInvite(), {
      revokedAt: '2026-05-13T11:30:00.000Z',
    });

    expect(invite.revokedAt).toBe('2026-05-13T11:30:00.000Z');
    expect(getInviteStatus(invite, now)).toBe('revoked');
    expect(
      validateInviteCode({
        code: 'AB7!CD8@EF9#',
        invites: [invite],
        now,
      }),
    ).toMatchObject({
      status: 'revoked',
      reason: 'revoked',
      invite: {
        revokedAt: '2026-05-13T11:30:00.000Z',
      },
    });
  });

  it('consumes a valid invite code once', () => {
    const invite = createBaseInvite();
    const firstConsumption = consumeInviteCode({
      code: 'AB7!CD8@EF9#',
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
        code: 'AB7!CD8@EF9#',
        invites: firstConsumption.invites,
        now,
      }),
    ).toMatchObject({
      status: 'used',
      reason: 'used',
    });
  });
});
