import { getPasswordConfirmationError } from '../../src/app/components/accountAuthValidation';

describe('account auth signup validation', () => {
  it('accepts matching signup passwords', () => {
    expect(getPasswordConfirmationError('secret1', 'secret1')).toBeNull();
  });

  it('rejects mismatched signup passwords', () => {
    expect(getPasswordConfirmationError('secret1', 'secret2')).toBe('Passwords do not match.');
  });
});
