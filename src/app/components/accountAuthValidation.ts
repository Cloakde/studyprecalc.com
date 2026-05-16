const PASSWORD_CONFIRMATION_MESSAGE = 'Passwords do not match.';

export function getPasswordConfirmationError(
  password: string,
  confirmPassword: string,
): string | null {
  return password === confirmPassword ? null : PASSWORD_CONFIRMATION_MESSAGE;
}
