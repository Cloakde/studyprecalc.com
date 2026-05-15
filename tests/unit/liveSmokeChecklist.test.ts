import {
  createLiveSmokeChecklist,
  formatLiveSmokeChecklistJson,
  formatLiveSmokeChecklistMarkdown,
  parseLiveSmokeCliArgs,
} from '../../scripts/live-smoke-checklist';

describe('live smoke checklist', () => {
  it('creates the required manual live-smoke steps in order', () => {
    const checklist = createLiveSmokeChecklist({
      baseUrl: 'https://example.com/app?ignored=true',
      runLabel: 'custom run',
    });

    expect(checklist.baseUrl).toBe('https://example.com/app');
    expect(checklist.runLabel).toBe('custom run');
    expect(checklist.steps.map((step) => step.id)).toEqual([
      'invite-signup',
      'email-code',
      'admin-2fa',
      'class-invite',
      'publish-archive-content',
      'student-visibility',
      'dashboard-persistence',
      'image-smoke',
    ]);
  });

  it('keeps the checklist manual and evidence-oriented', () => {
    const checklist = createLiveSmokeChecklist();
    const allActions = checklist.steps.flatMap((step) => step.actions).join(' ');
    const allEvidence = checklist.steps.flatMap((step) => step.evidence).join(' ');

    expect(checklist.notes[0]).toContain('manual');
    expect(checklist.notes[0]).toContain('does not automate browser actions');
    expect(allEvidence).toContain('Screenshot');
    expect(allActions).not.toMatch(/playwright|puppeteer|selenium/i);
    expect(checklist.steps.every((step) => step.evidence.length > 0)).toBe(true);
    expect(checklist.steps.every((step) => step.passCriteria.length > 0)).toBe(true);
  });

  it('warns against copyrighted College Board content', () => {
    const checklist = createLiveSmokeChecklist();
    const text = [
      ...checklist.notes,
      ...checklist.steps.flatMap((step) => [...step.actions, ...step.passCriteria]),
    ].join(' ');

    expect(text).toContain('Do not use copyrighted College Board questions');
    expect(text).toContain('original throwaway text');
  });

  it('formats markdown with evidence blanks and cleanup prompts', () => {
    const markdown = formatLiveSmokeChecklistMarkdown(
      createLiveSmokeChecklist({
        baseUrl: 'https://studyprecalc.test/',
      }),
    );

    expect(markdown).toContain('# Live Admin/Student Smoke Checklist');
    expect(markdown).toContain('Target: https://studyprecalc.test');
    expect(markdown).toContain('## 5. Original throwaway content publish and archive');
    expect(markdown).toContain('Evidence: Published timestamp. -> ____________________');
    expect(markdown).toContain('Cleanup:');
    expect(markdown).toContain('Result: PASS / FAIL / BLOCKED');
  });

  it('can omit cleanup prompts', () => {
    const markdown = formatLiveSmokeChecklistMarkdown(
      createLiveSmokeChecklist({
        includeCleanup: false,
      }),
    );

    expect(markdown).not.toContain('Cleanup:');
  });

  it('formats JSON output', () => {
    const json = formatLiveSmokeChecklistJson(
      createLiveSmokeChecklist({
        runLabel: 'json run',
      }),
    );

    expect(json.endsWith('\n')).toBe(true);
    expect(JSON.parse(json)).toMatchObject({
      title: 'Live Admin/Student Smoke Checklist',
      runLabel: 'json run',
    });
  });

  it('parses CLI options', () => {
    expect(
      parseLiveSmokeCliArgs([
        '--json',
        '--base-url',
        'https://example.com/',
        '--run-label=release smoke',
        '--no-cleanup',
      ]),
    ).toEqual({
      format: 'json',
      help: false,
      options: {
        baseUrl: 'https://example.com/',
        runLabel: 'release smoke',
        includeCleanup: false,
      },
    });
  });

  it('rejects invalid CLI options and invalid base URLs', () => {
    expect(() => parseLiveSmokeCliArgs(['--unknown'])).toThrow('Unknown argument: --unknown');
    expect(() => parseLiveSmokeCliArgs(['--base-url'])).toThrow('--base-url requires a value.');
    expect(() => createLiveSmokeChecklist({ baseUrl: 'not a url' })).toThrow(
      'Invalid --base-url value: not a url',
    );
  });
});
