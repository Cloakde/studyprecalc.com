import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

export type SmokeEnvInput = Partial<Record<string, string | undefined>>;

export type SmokeConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  invalidInviteCode: string;
  writeEnabled: boolean;
  adminCredentials?: {
    email: string;
    password: string;
    mfaCode?: string;
  };
  studentCredentials?: {
    email: string;
    password: string;
  };
};

export type SmokeEnvIssue = {
  variable: string;
  message: string;
};

export type SmokeResultStatus = 'pass' | 'fail' | 'skip';

export type SmokeResult = {
  name: string;
  status: SmokeResultStatus;
  message: string;
};

type ValidateInviteRow = {
  is_valid: boolean;
  reason: string | null;
};

const currentFile = fileURLToPath(import.meta.url);
const defaultInvalidInviteCode = 'ZZ9!ZZ9!ZZ9!';
const questionImagesBucket = 'question-images';
const questionImagesMaxBytes = 1024 * 1024;
const questionImagesAllowedMimeTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const tinySmokePngBytes = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0xf8, 0xcf, 0xc0, 0xf0,
  0x1f, 0x00, 0x05, 0x00, 0x01, 0xff, 0x89, 0x99, 0x3d, 0x1d, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
  0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

function readEnvValue(env: SmokeEnvInput, name: string): string {
  return env[name]?.trim() ?? '';
}

function isHttpUrl(candidate: string): boolean {
  try {
    const parsedUrl = new URL(candidate);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

export function parseSupabaseSmokeEnv(env: SmokeEnvInput): {
  config?: SmokeConfig;
  issues: SmokeEnvIssue[];
} {
  const supabaseUrl = readEnvValue(env, 'VITE_SUPABASE_URL');
  const supabaseAnonKey = readEnvValue(env, 'VITE_SUPABASE_ANON_KEY');
  const adminEmail = readEnvValue(env, 'SMOKE_ADMIN_EMAIL');
  const adminPassword = readEnvValue(env, 'SMOKE_ADMIN_PASSWORD');
  const adminMfaCode = readEnvValue(env, 'SMOKE_ADMIN_MFA_CODE');
  const studentEmail = readEnvValue(env, 'SMOKE_STUDENT_EMAIL');
  const studentPassword = readEnvValue(env, 'SMOKE_STUDENT_PASSWORD');
  const issues: SmokeEnvIssue[] = [];

  if (!supabaseUrl) {
    issues.push({
      variable: 'VITE_SUPABASE_URL',
      message: 'VITE_SUPABASE_URL is required.',
    });
  } else if (!isHttpUrl(supabaseUrl)) {
    issues.push({
      variable: 'VITE_SUPABASE_URL',
      message: 'VITE_SUPABASE_URL must be a valid http(s) URL.',
    });
  }

  if (!supabaseAnonKey) {
    issues.push({
      variable: 'VITE_SUPABASE_ANON_KEY',
      message: 'VITE_SUPABASE_ANON_KEY is required.',
    });
  }

  if ((adminEmail && !adminPassword) || (!adminEmail && adminPassword)) {
    issues.push({
      variable: adminEmail ? 'SMOKE_ADMIN_PASSWORD' : 'SMOKE_ADMIN_EMAIL',
      message: 'SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD must be provided together.',
    });
  }

  if ((studentEmail && !studentPassword) || (!studentEmail && studentPassword)) {
    issues.push({
      variable: studentEmail ? 'SMOKE_STUDENT_PASSWORD' : 'SMOKE_STUDENT_EMAIL',
      message: 'SMOKE_STUDENT_EMAIL and SMOKE_STUDENT_PASSWORD must be provided together.',
    });
  }

  if (issues.length > 0) {
    return { issues };
  }

  return {
    config: {
      supabaseUrl,
      supabaseAnonKey,
      invalidInviteCode: readEnvValue(env, 'SMOKE_INVALID_INVITE_CODE') || defaultInvalidInviteCode,
      writeEnabled: readEnvValue(env, 'SMOKE_WRITE') === '1',
      ...(adminEmail && adminPassword
        ? {
            adminCredentials: {
              email: adminEmail,
              password: adminPassword,
              ...(adminMfaCode ? { mfaCode: adminMfaCode } : {}),
            },
          }
        : {}),
      ...(studentEmail && studentPassword
        ? {
            studentCredentials: {
              email: studentEmail,
              password: studentPassword,
            },
          }
        : {}),
    },
    issues,
  };
}

export function formatSmokeResults(results: SmokeResult[]): string {
  return results
    .map((result) => {
      const label = result.status.toUpperCase().padEnd(4, ' ');
      return `[${label}] ${result.name}: ${result.message}`;
    })
    .join('\n');
}

function resultMatches(result: SmokeResult, patterns: RegExp[]): boolean {
  const searchableText = `${result.name} ${result.message}`;
  return result.status === 'fail' && patterns.some((pattern) => pattern.test(searchableText));
}

export function formatSmokeNextActions(results: SmokeResult[]): string {
  const actions: string[] = [];
  const addAction = (action: string) => {
    if (!actions.includes(action)) {
      actions.push(action);
    }
  };

  if (
    results.some((result) =>
      resultMatches(result, [
        /validate_invite/i,
        /questions/i,
        /media_records/i,
        /question_media/i,
        /schema cache/i,
        /could not find/i,
        /permission denied for table/i,
        /relation .* does not exist/i,
      ]),
    )
  ) {
    addAction('Run the full supabase/schema.sql in the production Supabase SQL Editor.');
  }

  if (
    results.some((result) =>
      resultMatches(result, [/question-images bucket/i, /bucket not found/i, /storage/i]),
    )
  ) {
    addAction(
      'Confirm the private question-images bucket exists with a 1 MB limit and PNG/JPEG/WebP/GIF MIME allowlist.',
    );
  }

  if (
    results.some((result) =>
      resultMatches(result, [/admin login/i, /profiles/i, /not marked admin/i]),
    )
  ) {
    addAction(
      'Bootstrap or verify a real Supabase admin account; the local dev admin is not valid for this smoke.',
    );
  }

  if (
    results.some((result) =>
      resultMatches(result, [/MFA/i, /aal1/i, /aal2/i, /SMOKE_ADMIN_MFA_CODE/i]),
    )
  ) {
    addAction('Complete admin TOTP MFA and rerun with the current SMOKE_ADMIN_MFA_CODE.');
  }

  if (
    results.some((result) => result.status === 'skip' && result.name === 'cloud image write path')
  ) {
    addAction(
      'After admin and student smoke accounts exist, rerun with SMOKE_WRITE=1 and smoke credentials to verify cloud image publishing.',
    );
  }

  if (actions.length === 0) {
    return '';
  }

  return ['Next owner action(s):', ...actions.map((action) => `- ${action}`)].join('\n');
}

export function getSmokeExitCode(results: SmokeResult[]): number {
  return results.some((result) => result.status === 'fail') ? 1 : 0;
}

function createSmokePngBlob(): Blob {
  return new Blob([tinySmokePngBytes], { type: 'image/png' });
}

function createSmokeId(): string {
  return `smoke-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createAdminMfaCodeRequiredResult(
  name: string,
  currentLevel: string | null,
): SmokeResult {
  return {
    name,
    status: 'fail',
    message: `Admin account has a verified MFA factor and current session AAL is ${currentLevel ?? 'unknown'}; set SMOKE_ADMIN_MFA_CODE to run the TOTP challenge.`,
  };
}

async function ignoreCleanupError(cleanup: PromiseLike<unknown>): Promise<void> {
  try {
    await cleanup;
  } catch {
    // Best-effort cleanup should not hide the smoke check result that triggered it.
  }
}

async function signInSmokeAdmin(
  config: SmokeConfig,
  adminClient: SupabaseClient,
): Promise<
  | {
      userId: string;
    }
  | {
      result: SmokeResult;
    }
> {
  if (!config.adminCredentials) {
    return {
      result: {
        name: 'admin login',
        status: 'skip',
        message: 'SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD were not provided.',
      },
    };
  }

  const { data: signInData, error: signInError } = await adminClient.auth.signInWithPassword({
    email: config.adminCredentials.email,
    password: config.adminCredentials.password,
  });

  if (signInError || !signInData.user) {
    return {
      result: {
        name: 'admin login',
        status: 'fail',
        message: signInError?.message ?? 'Supabase Auth did not return a user.',
      },
    };
  }

  const mfaResult = await verifyAdminMfaIfRequired(config, adminClient, 'admin login');

  if (mfaResult) {
    await ignoreCleanupError(adminClient.auth.signOut());

    return {
      result: mfaResult,
    };
  }

  return {
    userId: signInData.user.id,
  };
}

async function verifyAdminMfaIfRequired(
  config: SmokeConfig,
  adminClient: SupabaseClient,
  resultName: string,
): Promise<SmokeResult | undefined> {
  const { data: factors, error: factorsError } = await adminClient.auth.mfa.listFactors();

  if (factorsError) {
    return {
      name: resultName,
      status: 'fail',
      message: `MFA factor lookup failed: ${factorsError.message}`,
    };
  }

  const verifiedTotpFactor = factors?.totp?.[0];

  if (!verifiedTotpFactor) {
    return undefined;
  }

  const { data: aal, error: aalError } =
    await adminClient.auth.mfa.getAuthenticatorAssuranceLevel();

  if (aalError) {
    return {
      name: resultName,
      status: 'fail',
      message: `MFA AAL check failed: ${aalError.message}`,
    };
  }

  if (aal.currentLevel === 'aal2') {
    return undefined;
  }

  if (!config.adminCredentials?.mfaCode) {
    return createAdminMfaCodeRequiredResult(resultName, aal.currentLevel);
  }

  const { error: verifyError } = await adminClient.auth.mfa.challengeAndVerify({
    factorId: verifiedTotpFactor.id,
    code: config.adminCredentials.mfaCode,
  });

  if (verifyError) {
    return {
      name: resultName,
      status: 'fail',
      message: `MFA challenge verification failed: ${verifyError.message}`,
    };
  }

  const { data: verifiedAal, error: verifiedAalError } =
    await adminClient.auth.mfa.getAuthenticatorAssuranceLevel();

  if (verifiedAalError) {
    return {
      name: resultName,
      status: 'fail',
      message: `MFA post-verification AAL check failed: ${verifiedAalError.message}`,
    };
  }

  if (verifiedAal.currentLevel !== 'aal2') {
    return {
      name: resultName,
      status: 'fail',
      message: `MFA challenge completed but current session AAL is ${verifiedAal.currentLevel ?? 'unknown'}, expected aal2.`,
    };
  }

  return undefined;
}

async function checkInviteRpc(
  client: SupabaseClient,
  invalidInviteCode: string,
): Promise<SmokeResult> {
  const { data, error } = await client.rpc('validate_invite', {
    p_code: invalidInviteCode,
    p_email: 'smoke-invalid@example.com',
  });

  if (error) {
    return {
      name: 'validate_invite RPC',
      status: 'fail',
      message: error.message,
    };
  }

  const row = Array.isArray(data) ? (data[0] as ValidateInviteRow | undefined) : undefined;

  if (!row) {
    return {
      name: 'validate_invite RPC',
      status: 'fail',
      message: 'RPC returned no rows for a known-invalid invite code.',
    };
  }

  if (row.is_valid === false && row.reason === 'not-found') {
    return {
      name: 'validate_invite RPC',
      status: 'pass',
      message: 'Known-invalid invite code returned not-found.',
    };
  }

  return {
    name: 'validate_invite RPC',
    status: 'fail',
    message: `Expected not-found for invalid code, received ${JSON.stringify(row)}.`,
  };
}

async function checkAnonUnpublishedAccess(client: SupabaseClient): Promise<SmokeResult> {
  const { data, error } = await client
    .from('questions')
    .select('id,status,is_published')
    .neq('status', 'published')
    .limit(1);

  if (error) {
    const isPermissionBlocked =
      error.code === '42501' || error.message.toLowerCase().includes('permission denied');

    if (!isPermissionBlocked) {
      return {
        name: 'anon unpublished content access',
        status: 'fail',
        message: error.message,
      };
    }

    return {
      name: 'anon unpublished content access',
      status: 'pass',
      message: `Anon read was blocked by Supabase: ${error.message}`,
    };
  }

  if ((data ?? []).length === 0) {
    return {
      name: 'anon unpublished content access',
      status: 'pass',
      message: 'Anon client returned no unpublished question rows.',
    };
  }

  return {
    name: 'anon unpublished content access',
    status: 'fail',
    message: `Anon client can read unpublished question row ${(data as { id?: string }[])[0]?.id ?? '(unknown)'}.`,
  };
}

async function signInSmokeStudent(
  config: SmokeConfig,
  studentClient: SupabaseClient,
): Promise<
  | {
      userId: string;
    }
  | {
      result: SmokeResult;
    }
> {
  if (!config.studentCredentials) {
    return {
      result: {
        name: 'student login',
        status: 'skip',
        message: 'SMOKE_STUDENT_EMAIL and SMOKE_STUDENT_PASSWORD were not provided.',
      },
    };
  }

  const { data: signInData, error: signInError } = await studentClient.auth.signInWithPassword({
    email: config.studentCredentials.email,
    password: config.studentCredentials.password,
  });

  if (signInError || !signInData.user) {
    return {
      result: {
        name: 'student login',
        status: 'fail',
        message: signInError?.message ?? 'Supabase Auth did not return a user.',
      },
    };
  }

  return {
    userId: signInData.user.id,
  };
}

async function checkQuestionImagesBucket(client: SupabaseClient): Promise<SmokeResult> {
  const { data, error } = await client.storage.getBucket(questionImagesBucket);

  if (error) {
    return {
      name: 'question-images bucket',
      status: 'fail',
      message: error.message,
    };
  }

  const bucket = data as {
    public?: boolean;
    file_size_limit?: number | null;
    allowed_mime_types?: string[] | null;
  } | null;

  if (!bucket) {
    return {
      name: 'question-images bucket',
      status: 'fail',
      message: 'Supabase returned no bucket metadata.',
    };
  }

  const issues: string[] = [];

  if (bucket.public !== false) {
    issues.push('bucket must be private');
  }

  if (bucket.file_size_limit !== questionImagesMaxBytes) {
    issues.push(`file_size_limit must be ${questionImagesMaxBytes}`);
  }

  const allowedMimeTypes = bucket.allowed_mime_types ?? [];
  const missingMimeTypes = questionImagesAllowedMimeTypes.filter(
    (mimeType) => !allowedMimeTypes.includes(mimeType),
  );

  if (missingMimeTypes.length > 0) {
    issues.push(`missing allowed MIME type(s): ${missingMimeTypes.join(', ')}`);
  }

  if (issues.length > 0) {
    return {
      name: 'question-images bucket',
      status: 'fail',
      message: issues.join('; '),
    };
  }

  return {
    name: 'question-images bucket',
    status: 'pass',
    message: 'Private bucket exists with expected image limits and MIME types.',
  };
}

async function checkMediaTableSchema(
  client: SupabaseClient,
  tableName: 'media_records' | 'question_media',
  columns: string,
): Promise<SmokeResult> {
  const { error } = await client.from(tableName).select(columns, { count: 'exact', head: true });

  if (error) {
    return {
      name: `${tableName} schema`,
      status: 'fail',
      message: error.message,
    };
  }

  return {
    name: `${tableName} schema`,
    status: 'pass',
    message: `${tableName} is queryable with expected columns.`,
  };
}

async function checkStudentProgressTables(
  config: SmokeConfig,
  studentClient: SupabaseClient,
): Promise<SmokeResult> {
  const signInResult = await signInSmokeStudent(config, studentClient);

  if ('result' in signInResult) {
    return {
      ...signInResult.result,
      name: 'student progress tables',
      message:
        signInResult.result.status === 'skip'
          ? 'SMOKE_STUDENT_EMAIL and SMOKE_STUDENT_PASSWORD were not provided.'
          : signInResult.result.message,
    };
  }

  try {
    const progressTables = ['attempts', 'session_results'] as const;

    for (const tableName of progressTables) {
      const { error } = await studentClient
        .from(tableName)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', signInResult.userId);

      if (error) {
        return {
          name: 'student progress tables',
          status: 'fail',
          message: `${tableName}: ${error.message}`,
        };
      }
    }

    return {
      name: 'student progress tables',
      status: 'pass',
      message: 'Student can query owned attempts and session_results through RLS.',
    };
  } finally {
    await ignoreCleanupError(studentClient.auth.signOut());
  }
}

async function checkAdminLogin(
  config: SmokeConfig,
  adminClient: SupabaseClient,
): Promise<SmokeResult> {
  const signInResult = await signInSmokeAdmin(config, adminClient);

  if ('result' in signInResult) {
    return signInResult.result;
  }

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', signInResult.userId)
    .maybeSingle();

  await adminClient.auth.signOut();

  if (profileError) {
    return {
      name: 'admin login',
      status: 'fail',
      message: profileError.message,
    };
  }

  if ((profile as { role?: string } | null)?.role !== 'admin') {
    return {
      name: 'admin login',
      status: 'fail',
      message: 'Authenticated user profile is not marked admin.',
    };
  }

  return {
    name: 'admin login',
    status: 'pass',
    message: 'Admin credentials authenticated and profile role is admin.',
  };
}

async function checkCloudImageWritePath(
  config: SmokeConfig,
  adminClient: SupabaseClient,
  studentClient: SupabaseClient,
): Promise<SmokeResult> {
  if (!config.writeEnabled) {
    return {
      name: 'cloud image write path',
      status: 'skip',
      message:
        'No writes are performed. Set SMOKE_WRITE=1 to upload and clean up a tiny generated image.',
    };
  }

  const signInResult = await signInSmokeAdmin(config, adminClient);

  if ('result' in signInResult) {
    return {
      ...signInResult.result,
      name: 'cloud image write path',
      message:
        signInResult.result.status === 'skip'
          ? 'SMOKE_WRITE=1 also requires SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD.'
          : signInResult.result.message,
    };
  }

  const smokeId = createSmokeId();
  const storagePath = `smoke/${smokeId}.png`;
  const now = new Date().toISOString();
  let mediaRecordId: string | undefined;
  let studentWasSignedIn = false;
  const smokeQuestion = {
    id: smokeId,
    type: 'mcq',
    unit: 'Smoke Test',
    topic: 'Cloud image activation',
    skill: 'Verify Supabase image storage and RLS',
    difficulty: 'intro',
    calculator: 'none',
    section: 'practice',
    tags: ['smoke'],
    prompt: 'Generated smoke test question. Safe to delete.',
    assets: [],
    choices: [
      {
        id: 'A',
        text: 'Generated correct choice',
        explanation: 'This generated smoke choice is correct.',
      },
      {
        id: 'B',
        text: 'Generated distractor B',
        explanation: 'This generated smoke choice is not correct.',
      },
      {
        id: 'C',
        text: 'Generated distractor C',
        explanation: 'This generated smoke choice is not correct.',
      },
      {
        id: 'D',
        text: 'Generated distractor D',
        explanation: 'This generated smoke choice is not correct.',
      },
    ],
    correctChoiceId: 'A',
    explanation: {
      summary: 'Generated smoke test explanation. Safe to delete.',
      steps: ['Upload generated image.', 'Link image metadata.', 'Publish the smoke question.'],
      commonMistakes: ['Using copyrighted or persistent content for smoke tests.'],
      assets: [
        {
          id: 'smoke-image',
          type: 'image',
          path: `supabase-image:${storagePath}`,
          alt: 'Generated one-pixel smoke test image.',
          caption: 'Generated smoke test image.',
        },
      ],
    },
  };
  const draftPublication = {
    status: 'draft',
    questionSetVersion: 'smoke',
    createdAt: now,
    updatedAt: now,
    createdBy: signInResult.userId,
    updatedBy: signInResult.userId,
  };

  try {
    const uploadResult = await adminClient.storage
      .from(questionImagesBucket)
      .upload(storagePath, createSmokePngBlob(), {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadResult.error) {
      throw new Error(`Storage upload failed: ${uploadResult.error.message}`);
    }

    const mediaRecordInsert = await adminClient
      .from('media_records')
      .insert({
        kind: 'image',
        source_kind: 'storage',
        storage_bucket: questionImagesBucket,
        storage_path: storagePath,
        external_url: null,
        mime_type: 'image/png',
        byte_size: tinySmokePngBytes.byteLength,
        alt: 'Generated one-pixel smoke test image.',
        caption: 'Generated smoke test image. Safe to delete.',
        created_by: signInResult.userId,
      })
      .select('id')
      .single();

    if (mediaRecordInsert.error || !mediaRecordInsert.data) {
      throw new Error(
        `media_records insert failed: ${mediaRecordInsert.error?.message ?? 'no row returned'}`,
      );
    }

    mediaRecordId = (mediaRecordInsert.data as { id: string }).id;

    const questionInsert = await adminClient.from('questions').insert({
      id: smokeId,
      question_set_version: 'smoke',
      content: {
        question: smokeQuestion,
        publication: draftPublication,
      },
      status: 'draft',
      is_published: false,
      question_type: 'mcq',
      unit: smokeQuestion.unit,
      topic: smokeQuestion.topic,
      skill: smokeQuestion.skill,
      difficulty: smokeQuestion.difficulty,
      calculator: smokeQuestion.calculator,
      section: smokeQuestion.section,
      tags: smokeQuestion.tags,
      created_by: signInResult.userId,
      updated_by: signInResult.userId,
    });

    if (questionInsert.error) {
      throw new Error(`questions insert failed: ${questionInsert.error.message}`);
    }

    const questionMediaInsert = await adminClient.from('question_media').insert({
      question_id: smokeId,
      media_id: mediaRecordId,
      placement: 'explanation',
      asset_id: 'smoke-image',
      sort_order: 0,
    });

    if (questionMediaInsert.error) {
      throw new Error(`question_media insert failed: ${questionMediaInsert.error.message}`);
    }

    const publishedAt = new Date().toISOString();
    const publishResult = await adminClient
      .from('questions')
      .update({
        content: {
          question: smokeQuestion,
          publication: {
            ...draftPublication,
            status: 'published',
            updatedAt: publishedAt,
            publishedAt,
          },
        },
        status: 'published',
        is_published: true,
        published_by: signInResult.userId,
        published_at: publishedAt,
        updated_by: signInResult.userId,
      })
      .eq('id', smokeId);

    if (publishResult.error) {
      throw new Error(`questions publish failed: ${publishResult.error.message}`);
    }

    const adminSignedUrl = await adminClient.storage
      .from(questionImagesBucket)
      .createSignedUrl(storagePath, 60);

    if (adminSignedUrl.error || !adminSignedUrl.data?.signedUrl) {
      throw new Error(
        `admin signed URL creation failed: ${adminSignedUrl.error?.message ?? 'no URL returned'}`,
      );
    }

    let studentMessage =
      'Student signed URL check skipped; provide SMOKE_STUDENT_EMAIL and SMOKE_STUDENT_PASSWORD for full RLS verification.';
    const studentSignInResult = await signInSmokeStudent(config, studentClient);

    if ('result' in studentSignInResult) {
      if (studentSignInResult.result.status === 'fail') {
        throw new Error(`student login failed: ${studentSignInResult.result.message}`);
      }
    } else {
      studentWasSignedIn = true;
      const studentSignedUrl = await studentClient.storage
        .from(questionImagesBucket)
        .createSignedUrl(storagePath, 60);

      if (studentSignedUrl.error || !studentSignedUrl.data?.signedUrl) {
        throw new Error(
          `student signed URL creation failed after publish: ${studentSignedUrl.error?.message ?? 'no URL returned'}`,
        );
      }

      const archivedAt = new Date().toISOString();
      const archiveResult = await adminClient
        .from('questions')
        .update({
          content: {
            question: smokeQuestion,
            publication: {
              ...draftPublication,
              status: 'archived',
              updatedAt: archivedAt,
              archivedAt,
            },
          },
          status: 'archived',
          is_published: false,
          archived_at: archivedAt,
          updated_by: signInResult.userId,
        })
        .eq('id', smokeId);

      if (archiveResult.error) {
        throw new Error(`questions archive failed: ${archiveResult.error.message}`);
      }

      const archivedStudentSignedUrl = await studentClient.storage
        .from(questionImagesBucket)
        .createSignedUrl(storagePath, 60);

      if (!archivedStudentSignedUrl.error && archivedStudentSignedUrl.data?.signedUrl) {
        throw new Error('student could create a new signed image URL after archive.');
      }

      studentMessage = 'Student signed URL worked after publish and was denied after archive.';
    }

    return {
      name: 'cloud image write path',
      status: 'pass',
      message: `Uploaded, linked, published, signed, and cleaned smoke question ${smokeId}. ${studentMessage}`,
    };
  } catch (error) {
    return {
      name: 'cloud image write path',
      status: 'fail',
      message: error instanceof Error ? error.message : 'Unknown write-path smoke failure.',
    };
  } finally {
    await ignoreCleanupError(
      adminClient.from('question_media').delete().eq('question_id', smokeId),
    );
    await ignoreCleanupError(adminClient.from('questions').delete().eq('id', smokeId));

    if (mediaRecordId) {
      await ignoreCleanupError(adminClient.from('media_records').delete().eq('id', mediaRecordId));
    } else {
      await ignoreCleanupError(
        adminClient.from('media_records').delete().eq('storage_path', storagePath),
      );
    }

    await ignoreCleanupError(adminClient.storage.from(questionImagesBucket).remove([storagePath]));
    await ignoreCleanupError(adminClient.auth.signOut());

    if (studentWasSignedIn) {
      await ignoreCleanupError(studentClient.auth.signOut());
    }
  }
}

export async function runSupabaseSmoke(config: SmokeConfig): Promise<SmokeResult[]> {
  const anonClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const adminClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const studentClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return [
    await checkCloudImageWritePath(config, adminClient, studentClient),
    await checkInviteRpc(anonClient, config.invalidInviteCode),
    await checkAnonUnpublishedAccess(anonClient),
    await checkQuestionImagesBucket(anonClient),
    await checkMediaTableSchema(
      anonClient,
      'media_records',
      'id,kind,source_kind,storage_bucket,storage_path,mime_type,byte_size,alt,caption',
    ),
    await checkMediaTableSchema(
      anonClient,
      'question_media',
      'id,question_id,media_id,placement,asset_id,sort_order',
    ),
    await checkStudentProgressTables(config, studentClient),
    await checkAdminLogin(config, adminClient),
  ];
}

const isCliEntryPoint = () =>
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === currentFile;

async function main() {
  const viteEnv = loadEnv(process.env.MODE ?? 'production', process.cwd(), '');
  const { config, issues } = parseSupabaseSmokeEnv({
    ...viteEnv,
    ...process.env,
  });

  if (!config) {
    for (const issue of issues) {
      console.error(`[FAIL] ${issue.variable}: ${issue.message}`);
    }
    process.exitCode = 1;
    return;
  }

  const results = await runSupabaseSmoke(config);
  const output = [formatSmokeResults(results), formatSmokeNextActions(results)]
    .filter(Boolean)
    .join('\n\n');

  if (output) {
    console.log(output);
  }

  process.exitCode = getSmokeExitCode(results);
}

if (isCliEntryPoint()) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
