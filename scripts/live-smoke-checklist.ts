import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type LiveSmokeFormat = 'markdown' | 'json';

export type LiveSmokeChecklistOptions = {
  baseUrl?: string;
  runLabel?: string;
  includeCleanup?: boolean;
};

export type LiveSmokeStep = {
  id: string;
  title: string;
  actor: 'owner' | 'admin' | 'student';
  goal: string;
  actions: string[];
  evidence: string[];
  passCriteria: string[];
  cleanup?: string[];
};

export type LiveSmokeChecklist = {
  title: string;
  generatedAt: string;
  baseUrl: string;
  runLabel: string;
  notes: string[];
  steps: LiveSmokeStep[];
};

export type LiveSmokeCliConfig = {
  format: LiveSmokeFormat;
  options: LiveSmokeChecklistOptions;
  help: boolean;
};

const currentFile = fileURLToPath(import.meta.url);
const defaultBaseUrl = 'https://studyprecalc.com';
const defaultRunLabel = 'M18 live admin/student smoke';

function normalizeBaseUrl(baseUrl: string | undefined): string {
  const trimmedUrl = baseUrl?.trim() || defaultBaseUrl;

  try {
    const parsedUrl = new URL(trimmedUrl);
    parsedUrl.hash = '';
    parsedUrl.search = '';
    return parsedUrl.toString().replace(/\/$/, '');
  } catch {
    throw new Error(`Invalid --base-url value: ${trimmedUrl}`);
  }
}

export function createLiveSmokeChecklist(
  options: LiveSmokeChecklistOptions = {},
): LiveSmokeChecklist {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const runLabel = options.runLabel?.trim() || defaultRunLabel;
  const includeCleanup = options.includeCleanup ?? true;
  const generatedAt = new Date().toISOString();

  const steps: LiveSmokeStep[] = [
    {
      id: 'invite-signup',
      title: 'Invite signup',
      actor: 'owner',
      goal: 'Confirm a new invited student can reach the account creation flow with a fresh invite.',
      actions: [
        'Create a fresh student invite for a throwaway smoke email address.',
        `Open ${baseUrl} in a normal browser session that is not signed in.`,
        'Enter the throwaway email address and invite code on the sign-up screen.',
        'Submit invite validation and complete the password form only for the throwaway account.',
      ],
      evidence: [
        'Invite code value or redacted code suffix.',
        'Throwaway student email address.',
        'Screenshot or note showing the app accepted the invite and reached account creation.',
      ],
      passCriteria: [
        'The app rejects no valid smoke invite input.',
        'The account creation form is available only after invite and email validation.',
        'No public signup path bypasses the invite code.',
      ],
    },
    {
      id: 'email-code',
      title: 'Email verification code',
      actor: 'student',
      goal: 'Confirm Supabase email-code verification works after invited signup.',
      actions: [
        'Check the throwaway inbox for the Confirm Signup email.',
        'Enter the numeric or token-style verification code shown in that email.',
        'Use resend only if the first code expires or does not arrive.',
      ],
      evidence: [
        'Email arrival timestamp.',
        'Verification code redacted to the last two characters.',
        'Screenshot or note showing the student reached the signed-in app.',
      ],
      passCriteria: [
        'The code email arrives for the invited address.',
        'A valid code signs the student in.',
        'An invalid or expired code remains blocked.',
      ],
    },
    {
      id: 'admin-2fa',
      title: 'Admin 2FA gate',
      actor: 'admin',
      goal: 'Confirm production admin access requires TOTP MFA before cloud admin tools are usable.',
      actions: [
        'Sign out of any student session.',
        'Sign in with a real Supabase admin account.',
        'Complete the TOTP challenge when prompted.',
        'Open the admin-only areas after the session reaches AAL2.',
      ],
      evidence: [
        'Admin account email.',
        'MFA challenge timestamp.',
        'Screenshot or note showing Manage Content and Classes are visible after 2FA.',
      ],
      passCriteria: [
        'Admin tools are unavailable before completing MFA.',
        'The TOTP challenge succeeds with the current code.',
        'Admin tools are available after successful MFA.',
      ],
    },
    {
      id: 'class-invite',
      title: 'Class invite enrollment',
      actor: 'admin',
      goal: 'Confirm repeatable admin class creation, class-bound invite creation, and student enrollment work with the same throwaway account.',
      actions: [
        'Create a new smoke-test class with a run-specific name, or record the existing class ID if reusing one intentionally.',
        'Generate a fresh class-bound invite for the throwaway student email from the Classes admin area.',
        'Before signup, record that the invite is active, has the expected email, and points at the intended class.',
        'After student signup, verify the student appears on the class roster.',
        'Attempt to reuse, revoke, or expire a separate test invite only if safe, and confirm it cannot enroll a student.',
      ],
      evidence: [
        'Class name and class ID using a clear smoke prefix.',
        'Invite status before signup, redacted code suffix, and bound email.',
        'Invite created timestamp.',
        'Roster screenshot or note showing the throwaway student enrollment after signup.',
      ],
      passCriteria: [
        'The admin can create the smoke class without direct database edits.',
        'The admin can create a class-bound invite without using the local development admin.',
        'The invite is associated with the intended class.',
        'The student roster includes the throwaway account after signup.',
        'Revoked or expired invites are not accepted for enrollment.',
      ],
    },
    {
      id: 'publish-archive-content',
      title: 'Original throwaway content publish and archive',
      actor: 'admin',
      goal: 'Confirm admins can draft, publish, and archive original non-copyrighted smoke content.',
      actions: [
        'Create a new MCQ or FRQ with a smoke prefix and original throwaway text.',
        'Add concise original explanations; do not copy College Board text, images, rubrics, or assets.',
        'Save the item as a draft, refresh the admin library, and confirm the draft is still visible to the admin.',
        'Preview the draft, then publish it from the admin workflow.',
        'Record the published question title or ID, then archive the same item after student visibility and progress checks.',
        'Refresh the admin library after archive and record whether archived items are hidden from active admin views or only visible in archived filters.',
      ],
      evidence: [
        'Question title or ID.',
        'Draft saved timestamp.',
        'Admin draft reload screenshot or note.',
        'Published timestamp.',
        'Archived timestamp after cleanup.',
      ],
      passCriteria: [
        'Draft save survives a page refresh or navigation away and back.',
        'Draft content is not visible to students.',
        'Published content is visible to students.',
        'Archived content is removed from student practice views.',
        'Archived content does not remain in the default active admin library view.',
      ],
      cleanup: includeCleanup
        ? [
            'Archive the smoke question before ending the run.',
            'Keep the item title clearly marked as smoke content if retained for audit.',
          ]
        : undefined,
    },
    {
      id: 'student-visibility',
      title: 'Student visibility',
      actor: 'student',
      goal: 'Confirm the throwaway student sees only published content and loses visibility after archive.',
      actions: [
        'Sign in as the throwaway student after email verification.',
        'Open Practice and find the published smoke question.',
        'Refresh the page and confirm the question remains available while published.',
        'Confirm no draft smoke question and no previously archived smoke question appears in Practice or Session setup.',
        'After the admin archives the question, refresh and confirm the question is gone.',
      ],
      evidence: [
        'Student account email.',
        'Practice view screenshot or note while the question is published.',
        'Practice view screenshot or note after archive.',
      ],
      passCriteria: [
        'The published smoke question is visible to the student.',
        'Draft or archived smoke content is not visible to the student.',
        'Student visibility changes after publish/archive without requiring database edits.',
        'The student cannot access admin-only content management controls.',
      ],
    },
    {
      id: 'dashboard-persistence',
      title: 'Dashboard persistence',
      actor: 'student',
      goal: 'Confirm completed student work persists across refresh and sign-in boundaries.',
      actions: [
        'Answer the published smoke question or complete a short session that includes it.',
        'Open the Dashboard and record the visible attempt or session update.',
        'Refresh the page.',
        'Sign out and sign back in as the throwaway student, then reopen the Dashboard.',
        'If available, confirm the same attempt/session is still associated with the student in Supabase.',
      ],
      evidence: [
        'Attempt or session completion timestamp.',
        'Dashboard metric or recent-session row before refresh.',
        'Dashboard metric or recent-session row after sign-out and sign-in.',
      ],
      passCriteria: [
        'The dashboard updates after the smoke attempt or session.',
        'The same dashboard state survives refresh.',
        'The same dashboard state survives sign-out and sign-in for the same student.',
        'The progress state is scoped to the throwaway student and not visible under the admin account.',
      ],
    },
    {
      id: 'image-smoke',
      title: 'Image smoke',
      actor: 'admin',
      goal: 'Confirm cloud image upload, student rendering, and post-archive access behavior.',
      actions: [
        'Upload a tiny original PNG/JPEG/WebP/GIF image to the smoke question, and add meaningful alt text.',
        'Save the image-bearing question as a draft, refresh the admin page, and confirm the image expectation survives reload.',
        'Publish the question and confirm the image renders for the admin preview.',
        'Sign in as the throwaway student and confirm the image renders in Practice.',
        'Archive the question and confirm the student can no longer load the archived question image through the app.',
        'Record whether the stored reference is cloud-backed, not a browser-local `local-image:<id>` reference.',
      ],
      evidence: [
        'Image filename and MIME type.',
        'Image alt text.',
        'Cloud media reference prefix or storage-path note with secrets redacted.',
        'Admin preview screenshot or note.',
        'Student rendered-image screenshot or note.',
        'Post-archive screenshot or note showing the question is no longer reachable.',
      ],
      passCriteria: [
        'The upload accepts only allowed image types and size.',
        'The saved question does not depend on browser-local image references.',
        'Image alt text is present for student rendering.',
        'The image renders for admin preview after upload.',
        'The image renders for the student only while the question is published.',
        'The archived question and image are not reachable through student practice.',
      ],
      cleanup: includeCleanup
        ? [
            'Archive the image-bearing smoke question.',
            'Remove any unused duplicate smoke images from storage if the UI exposes cleanup.',
          ]
        : undefined,
    },
  ];

  return {
    title: 'Live Admin/Student Smoke Checklist',
    generatedAt,
    baseUrl,
    runLabel,
    notes: [
      'This is a manual, evidence-oriented checklist. It does not automate browser actions or mutate production data by itself.',
      'Use original throwaway smoke content only. Do not use copyrighted College Board questions, images, rubrics, or assets.',
      'Use real production Supabase admin and student smoke accounts; the local development admin is not valid for this checklist.',
    ],
    steps,
  };
}

function formatBulletList(values: string[]): string {
  return values.map((value) => `- [ ] ${value}`).join('\n');
}

function formatEvidenceList(values: string[]): string {
  return values.map((value) => `- Evidence: ${value} -> ____________________`).join('\n');
}

export function formatLiveSmokeChecklistMarkdown(checklist: LiveSmokeChecklist): string {
  const sections = checklist.steps.map((step, index) => {
    const lines = [
      `## ${index + 1}. ${step.title} (${step.id})`,
      '',
      `Actor: ${step.actor}`,
      '',
      `Goal: ${step.goal}`,
      '',
      'Actions:',
      formatBulletList(step.actions),
      '',
      'Evidence to capture:',
      formatEvidenceList(step.evidence),
      '',
      'Pass criteria:',
      formatBulletList(step.passCriteria),
    ];

    if (step.cleanup && step.cleanup.length > 0) {
      lines.push('', 'Cleanup:', formatBulletList(step.cleanup));
    }

    lines.push('', 'Result: PASS / FAIL / BLOCKED', 'Notes: ____________________');

    return lines.join('\n');
  });

  return [
    `# ${checklist.title}`,
    '',
    `Run: ${checklist.runLabel}`,
    `Target: ${checklist.baseUrl}`,
    `Generated: ${checklist.generatedAt}`,
    '',
    'Notes:',
    ...checklist.notes.map((note) => `- ${note}`),
    '',
    ...sections,
  ].join('\n');
}

export function formatLiveSmokeChecklistJson(checklist: LiveSmokeChecklist): string {
  return `${JSON.stringify(checklist, null, 2)}\n`;
}

export function parseLiveSmokeCliArgs(args: string[]): LiveSmokeCliConfig {
  const config: LiveSmokeCliConfig = {
    format: 'markdown',
    options: {},
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--help' || arg === '-h') {
      config.help = true;
      continue;
    }

    if (arg === '--json') {
      config.format = 'json';
      continue;
    }

    if (arg === '--markdown') {
      config.format = 'markdown';
      continue;
    }

    if (arg === '--no-cleanup') {
      config.options.includeCleanup = false;
      continue;
    }

    if (arg === '--base-url') {
      const value = args[index + 1];

      if (!value) {
        throw new Error('--base-url requires a value.');
      }

      config.options.baseUrl = value;
      index += 1;
      continue;
    }

    if (arg.startsWith('--base-url=')) {
      config.options.baseUrl = arg.slice('--base-url='.length);
      continue;
    }

    if (arg === '--run-label') {
      const value = args[index + 1];

      if (!value) {
        throw new Error('--run-label requires a value.');
      }

      config.options.runLabel = value;
      index += 1;
      continue;
    }

    if (arg.startsWith('--run-label=')) {
      config.options.runLabel = arg.slice('--run-label='.length);
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return config;
}

export function formatLiveSmokeHelp(): string {
  return [
    'Usage: npm run smoke:live-checklist -- [options]',
    '',
    'Options:',
    '  --base-url <url>      Production site URL to print in the checklist.',
    '  --run-label <label>   Human-readable run label.',
    '  --json                Print checklist JSON instead of Markdown.',
    '  --markdown            Print Markdown checklist output. This is the default.',
    '  --no-cleanup          Omit cleanup prompts from checklist steps.',
    '  -h, --help            Show this help text.',
  ].join('\n');
}

const isCliEntryPoint = () =>
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === currentFile;

function main() {
  const cliConfig = parseLiveSmokeCliArgs(process.argv.slice(2));

  if (cliConfig.help) {
    console.log(formatLiveSmokeHelp());
    return;
  }

  const checklist = createLiveSmokeChecklist(cliConfig.options);
  const output =
    cliConfig.format === 'json'
      ? formatLiveSmokeChecklistJson(checklist)
      : formatLiveSmokeChecklistMarkdown(checklist);

  console.log(output);
}

if (isCliEntryPoint()) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
