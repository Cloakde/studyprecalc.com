import {
  createAdminMfaCodeRequiredResult,
  createStudentProgressSmokeRows,
  formatSmokeNextActions,
  formatSmokeResults,
  getSmokeExitCode,
  parseSupabaseSmokeEnv,
  type SmokeResult,
} from '../../scripts/smoke-supabase';

describe('Supabase smoke helpers', () => {
  it('requires Supabase URL and anon key', () => {
    const result = parseSupabaseSmokeEnv({});

    expect(result.config).toBeUndefined();
    expect(result.issues).toEqual([
      {
        variable: 'VITE_SUPABASE_URL',
        message: 'VITE_SUPABASE_URL is required.',
      },
      {
        variable: 'VITE_SUPABASE_ANON_KEY',
        message: 'VITE_SUPABASE_ANON_KEY is required.',
      },
    ]);
  });

  it('rejects non-http Supabase URLs', () => {
    const result = parseSupabaseSmokeEnv({
      VITE_SUPABASE_URL: 'ftp://example.com',
      VITE_SUPABASE_ANON_KEY: 'anon-key',
    });

    expect(result.config).toBeUndefined();
    expect(result.issues).toEqual([
      {
        variable: 'VITE_SUPABASE_URL',
        message: 'VITE_SUPABASE_URL must be a valid http(s) URL.',
      },
    ]);
  });

  it('parses optional admin credentials and write opt-in', () => {
    const result = parseSupabaseSmokeEnv({
      VITE_SUPABASE_URL: ' https://example.supabase.co ',
      VITE_SUPABASE_ANON_KEY: ' anon-key ',
      SMOKE_ADMIN_EMAIL: ' admin@example.com ',
      SMOKE_ADMIN_PASSWORD: ' password ',
      SMOKE_ADMIN_MFA_CODE: ' 123456 ',
      SMOKE_STUDENT_EMAIL: ' student@example.com ',
      SMOKE_STUDENT_PASSWORD: ' student-password ',
      SMOKE_INVALID_INVITE_CODE: ' intentionally-missing ',
      SMOKE_WRITE: '1',
    });

    expect(result.issues).toEqual([]);
    expect(result.config).toEqual({
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'anon-key',
      invalidInviteCode: 'intentionally-missing',
      writeEnabled: true,
      adminCredentials: {
        email: 'admin@example.com',
        password: 'password',
        mfaCode: '123456',
      },
      studentCredentials: {
        email: 'student@example.com',
        password: 'student-password',
      },
    });
  });

  it('only enables write smoke checks with the exact SMOKE_WRITE opt-in', () => {
    const result = parseSupabaseSmokeEnv({
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'anon-key',
      SMOKE_WRITE: 'true',
    });

    expect(result.issues).toEqual([]);
    expect(result.config?.writeEnabled).toBe(false);
  });

  it('requires admin email and password together', () => {
    const result = parseSupabaseSmokeEnv({
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'anon-key',
      SMOKE_ADMIN_EMAIL: 'admin@example.com',
    });

    expect(result.config).toBeUndefined();
    expect(result.issues).toEqual([
      {
        variable: 'SMOKE_ADMIN_PASSWORD',
        message: 'SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD must be provided together.',
      },
    ]);
  });

  it('does not require an MFA code just to parse admin credentials', () => {
    const result = parseSupabaseSmokeEnv({
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'anon-key',
      SMOKE_ADMIN_EMAIL: 'admin@example.com',
      SMOKE_ADMIN_PASSWORD: 'password',
    });

    expect(result.issues).toEqual([]);
    expect(result.config?.adminCredentials).toEqual({
      email: 'admin@example.com',
      password: 'password',
    });
  });

  it('requires student email and password together', () => {
    const result = parseSupabaseSmokeEnv({
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'anon-key',
      SMOKE_STUDENT_PASSWORD: 'student-password',
    });

    expect(result.config).toBeUndefined();
    expect(result.issues).toEqual([
      {
        variable: 'SMOKE_STUDENT_EMAIL',
        message: 'SMOKE_STUDENT_EMAIL and SMOKE_STUDENT_PASSWORD must be provided together.',
      },
    ]);
  });

  it('formats smoke results for console output', () => {
    const results: SmokeResult[] = [
      { name: 'question-images bucket', status: 'pass', message: 'configured' },
      {
        name: 'cloud image write path',
        status: 'skip',
        message: 'SMOKE_WRITE was not provided',
      },
      { name: 'media_records schema', status: 'fail', message: 'missing table' },
    ];

    expect(formatSmokeResults(results)).toBe(
      [
        '[PASS] question-images bucket: configured',
        '[SKIP] cloud image write path: SMOKE_WRITE was not provided',
        '[FAIL] media_records schema: missing table',
      ].join('\n'),
    );
  });

  it('returns a failing exit code when any check fails', () => {
    expect(
      getSmokeExitCode([
        { name: 'env', status: 'pass', message: 'configured' },
        { name: 'admin login', status: 'skip', message: 'not provided' },
      ]),
    ).toBe(0);
    expect(
      getSmokeExitCode([
        { name: 'env', status: 'pass', message: 'configured' },
        { name: 'rpc', status: 'fail', message: 'missing' },
      ]),
    ).toBe(1);
  });

  it('formats the admin MFA requirement as a failing smoke result', () => {
    expect(createAdminMfaCodeRequiredResult('admin login', 'aal1')).toEqual({
      name: 'admin login',
      status: 'fail',
      message:
        'Admin account has a verified MFA factor and current session AAL is aal1; set SMOKE_ADMIN_MFA_CODE to run the TOTP challenge.',
    });
  });

  it('builds generated student progress smoke rows without real question content', () => {
    const rows = createStudentProgressSmokeRows(
      '00000000-0000-0000-0000-000000000001',
      'smoke-progress-123',
      '2026-05-15T12:00:00.000Z',
    );

    expect(rows.attempt).toMatchObject({
      id: 'smoke-progress-123-attempt',
      user_id: '00000000-0000-0000-0000-000000000001',
      question_id: 'smoke-progress-123-generated-question',
      question_type: 'mcq',
      score: 1,
      max_score: 1,
      is_correct: true,
    });
    expect(rows.attempt.response).toEqual({
      selectedChoiceId: 'A',
      isCorrect: true,
    });
    expect(rows.session).toMatchObject({
      id: 'smoke-progress-123-session',
      user_id: '00000000-0000-0000-0000-000000000001',
      question_set_version: 'smoke',
      planned_question_count: 1,
      answered_question_count: 1,
      score: 1,
      max_score: 1,
      percent: 100,
    });
    expect(rows.session.question_results).toEqual([
      {
        attemptId: 'smoke-progress-123-attempt',
        questionId: 'smoke-progress-123-generated-question',
        score: 1,
        maxScore: 1,
        isCorrect: true,
      },
    ]);
    expect(JSON.stringify(rows)).not.toContain('College Board');
    expect(JSON.stringify(rows)).not.toContain('AP ');
  });

  it('prints owner next actions for missing production activation pieces', () => {
    const results: SmokeResult[] = [
      {
        name: 'validate_invite RPC',
        status: 'fail',
        message: 'Could not find the function public.validate_invite in the schema cache',
      },
      {
        name: 'question-images bucket',
        status: 'fail',
        message: 'Bucket not found',
      },
      {
        name: 'cloud image write path',
        status: 'skip',
        message:
          'No writes are performed. Set SMOKE_WRITE=1 to upload and clean up a tiny generated image.',
      },
    ];

    expect(formatSmokeNextActions(results)).toBe(
      [
        'Next owner action(s):',
        '- Run the full supabase/schema.sql in the production Supabase SQL Editor.',
        '- Confirm the private question-images bucket exists with a 1 MB limit and PNG/JPEG/WebP/GIF MIME allowlist.',
        '- After admin and student smoke accounts exist, rerun with SMOKE_WRITE=1 and smoke credentials to verify cloud image publishing.',
      ].join('\n'),
    );
  });

  it('prints the student progress write rerun action when progress DML is skipped', () => {
    expect(
      formatSmokeNextActions([
        {
          name: 'student progress write path',
          status: 'skip',
          message:
            'No progress writes are performed. Set SMOKE_WRITE=1 with student credentials to verify INSERT/UPDATE/DELETE RLS.',
        },
      ]),
    ).toBe(
      [
        'Next owner action(s):',
        '- Rerun with SMOKE_WRITE=1 plus SMOKE_STUDENT_EMAIL and SMOKE_STUDENT_PASSWORD to verify progress INSERT/UPDATE/DELETE RLS.',
      ].join('\n'),
    );
  });

  it('points table permission errors back to the schema grants', () => {
    expect(
      formatSmokeNextActions([
        {
          name: 'student progress tables',
          status: 'fail',
          message: 'attempts: permission denied for table attempts',
        },
      ]),
    ).toBe(
      [
        'Next owner action(s):',
        '- Run the full supabase/schema.sql in the production Supabase SQL Editor.',
      ].join('\n'),
    );
  });

  it('does not print next actions when no action is needed', () => {
    expect(
      formatSmokeNextActions([
        { name: 'validate_invite RPC', status: 'pass', message: 'configured' },
        { name: 'admin login', status: 'pass', message: 'admin verified' },
      ]),
    ).toBe('');
  });
});
