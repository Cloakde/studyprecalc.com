import {
  clearContentManagerDraftAutosave,
  createContentManagerDraftFingerprint,
  hasContentManagerDraftUnsavedChanges,
  loadContentManagerDraftAutosave,
  parseContentManagerDraftAutosave,
  saveContentManagerDraftAutosave,
  type ContentManagerDraftAutosaveStorage,
} from '../../src/app/contentManagerDraftAutosave';

type TestDraft = {
  id: string;
  prompt: string;
};

function createMemoryStorage(): ContentManagerDraftAutosaveStorage {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

function isTestDraft(value: unknown): value is TestDraft {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'prompt' in value &&
    typeof value.id === 'string' &&
    typeof value.prompt === 'string'
  );
}

describe('Content Manager draft autosave helpers', () => {
  it('saves and reloads an in-progress draft envelope from browser storage', () => {
    const storage = createMemoryStorage();
    const draft: TestDraft = {
      id: 'draft-1',
      prompt: 'Find the horizontal asymptote.',
    };
    const lastSavedFingerprint = createContentManagerDraftFingerprint({
      draft: { ...draft, prompt: '' },
      selectedQuestionId: null,
    });

    const result = saveContentManagerDraftAutosave({
      storage,
      key: 'test-autosave',
      draft,
      selectedQuestionId: null,
      previewMode: 'student',
      lastSavedFingerprint,
      now: () => new Date('2026-05-15T12:00:00.000Z'),
    });

    expect(result).toEqual({
      ok: true,
      savedAt: '2026-05-15T12:00:00.000Z',
    });
    expect(loadContentManagerDraftAutosave(storage, isTestDraft, 'test-autosave')).toEqual({
      version: 1,
      savedAt: '2026-05-15T12:00:00.000Z',
      draft,
      selectedQuestionId: null,
      previewMode: 'student',
      lastSavedFingerprint,
    });
  });

  it('rejects malformed or wrong-shape autosave payloads', () => {
    expect(parseContentManagerDraftAutosave('{bad json', isTestDraft)).toBeNull();
    expect(
      parseContentManagerDraftAutosave(
        JSON.stringify({
          version: 1,
          savedAt: '2026-05-15T12:00:00.000Z',
          draft: { id: 7, prompt: 'Bad ID type' },
          selectedQuestionId: null,
          previewMode: 'student',
          lastSavedFingerprint: 'fingerprint',
        }),
        isTestDraft,
      ),
    ).toBeNull();
  });

  it('fingerprints the draft content separately from the autosave timestamp', () => {
    const savedDraft = {
      draft: {
        id: 'limits-1',
        prompt: 'Original prompt.',
      },
      selectedQuestionId: 'limits-1',
    };
    const savedFingerprint = createContentManagerDraftFingerprint(savedDraft);

    expect(hasContentManagerDraftUnsavedChanges(savedDraft, savedFingerprint)).toBe(false);
    expect(
      hasContentManagerDraftUnsavedChanges(
        {
          ...savedDraft,
          draft: {
            ...savedDraft.draft,
            prompt: 'Updated prompt.',
          },
        },
        savedFingerprint,
      ),
    ).toBe(true);
  });

  it('clears stale autosaves from storage', () => {
    const storage = createMemoryStorage();

    saveContentManagerDraftAutosave({
      storage,
      key: 'test-autosave',
      draft: {
        id: 'draft-1',
        prompt: 'Temporary prompt.',
      },
      selectedQuestionId: null,
      previewMode: 'answer',
      lastSavedFingerprint: 'fingerprint',
    });

    expect(clearContentManagerDraftAutosave(storage, 'test-autosave')).toBe(true);
    expect(loadContentManagerDraftAutosave(storage, isTestDraft, 'test-autosave')).toBeNull();
  });
});
