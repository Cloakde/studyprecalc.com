import { contentManagerDestructiveActionSafety } from '../../src/app/components/ContentManager';

const {
  getArchiveQuestionConfirmationMessage,
  getPermanentDeleteQuestionConfirmationPhrase,
  getPermanentDeleteQuestionPrompt,
  isPermanentDeleteQuestionConfirmation,
} = contentManagerDestructiveActionSafety;

describe('ContentManager destructive action safety', () => {
  const target = {
    id: 'limits-graph-1',
    label: 'Analyze endpoint behavior',
    workflowState: 'published',
  } as const;

  it('distinguishes archive from permanent delete in confirmation copy', () => {
    const archiveMessage = getArchiveQuestionConfirmationMessage(target);
    const deletePrompt = getPermanentDeleteQuestionPrompt(target);

    expect(archiveMessage).toContain('Archive "Analyze endpoint behavior"');
    expect(archiveMessage).toContain('hides the question from students');
    expect(archiveMessage).toContain('keeps it in Manage Content');
    expect(archiveMessage).toContain('restored, or republished later');
    expect(archiveMessage).toContain('Use permanent delete only');

    expect(deletePrompt).toContain('Permanently delete "Analyze endpoint behavior"');
    expect(deletePrompt).toContain('permanently removes the question record');
    expect(deletePrompt).toContain('cannot be undone');
    expect(deletePrompt).toContain('Archive from Students');
    expect(deletePrompt).toContain('Type DELETE limits-graph-1');
  });

  it('requires the exact typed phrase before permanent delete proceeds', () => {
    expect(getPermanentDeleteQuestionConfirmationPhrase(target.id)).toBe('DELETE limits-graph-1');
    expect(isPermanentDeleteQuestionConfirmation('DELETE limits-graph-1', target.id)).toBe(true);
    expect(isPermanentDeleteQuestionConfirmation(' DELETE limits-graph-1 ', target.id)).toBe(false);
    expect(isPermanentDeleteQuestionConfirmation('delete limits-graph-1', target.id)).toBe(false);
    expect(isPermanentDeleteQuestionConfirmation('DELETE', target.id)).toBe(false);
    expect(isPermanentDeleteQuestionConfirmation(null, target.id)).toBe(false);
  });
});
