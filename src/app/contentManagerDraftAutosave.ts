export type ContentManagerDraftAutosaveStorage = Pick<
  Storage,
  'getItem' | 'removeItem' | 'setItem'
>;

export type ContentManagerDraftAutosavePreviewMode = 'student' | 'answer';

export type ContentManagerDraftAutosaveEnvelope<TDraft> = {
  version: 1;
  savedAt: string;
  draft: TDraft;
  selectedQuestionId: string | null;
  previewMode: ContentManagerDraftAutosavePreviewMode;
  lastSavedFingerprint: string;
};

type SaveContentManagerDraftAutosaveInput<TDraft> = {
  storage: ContentManagerDraftAutosaveStorage;
  key?: string;
  draft: TDraft;
  selectedQuestionId: string | null;
  previewMode: ContentManagerDraftAutosavePreviewMode;
  lastSavedFingerprint: string;
  now?: () => Date;
};

export const contentManagerDraftAutosaveStorageKey = 'precalcapp.adminQuestionDraftAutosave.v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPreviewMode(value: unknown): value is ContentManagerDraftAutosavePreviewMode {
  return value === 'student' || value === 'answer';
}

export function getContentManagerDraftAutosaveStorage(): ContentManagerDraftAutosaveStorage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function createContentManagerDraftFingerprint<TDraft>(input: {
  draft: TDraft;
  selectedQuestionId: string | null;
}): string {
  return JSON.stringify({
    draft: input.draft,
    selectedQuestionId: input.selectedQuestionId,
  });
}

export function hasContentManagerDraftUnsavedChanges<TDraft>(
  input: {
    draft: TDraft;
    selectedQuestionId: string | null;
  },
  lastSavedFingerprint: string,
): boolean {
  return createContentManagerDraftFingerprint(input) !== lastSavedFingerprint;
}

export function parseContentManagerDraftAutosave<TDraft>(
  rawValue: string | null,
  isDraft: (value: unknown) => value is TDraft,
): ContentManagerDraftAutosaveEnvelope<TDraft> | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (!isRecord(parsed) || parsed.version !== 1 || !isDraft(parsed.draft)) {
      return null;
    }

    if (
      typeof parsed.savedAt !== 'string' ||
      (parsed.selectedQuestionId !== null && typeof parsed.selectedQuestionId !== 'string') ||
      !isPreviewMode(parsed.previewMode) ||
      typeof parsed.lastSavedFingerprint !== 'string'
    ) {
      return null;
    }

    return {
      version: 1,
      savedAt: parsed.savedAt,
      draft: parsed.draft,
      selectedQuestionId: parsed.selectedQuestionId,
      previewMode: parsed.previewMode,
      lastSavedFingerprint: parsed.lastSavedFingerprint,
    };
  } catch {
    return null;
  }
}

export function loadContentManagerDraftAutosave<TDraft>(
  storage: ContentManagerDraftAutosaveStorage,
  isDraft: (value: unknown) => value is TDraft,
  key = contentManagerDraftAutosaveStorageKey,
): ContentManagerDraftAutosaveEnvelope<TDraft> | null {
  try {
    return parseContentManagerDraftAutosave(storage.getItem(key), isDraft);
  } catch {
    return null;
  }
}

export function saveContentManagerDraftAutosave<TDraft>({
  storage,
  key = contentManagerDraftAutosaveStorageKey,
  draft,
  selectedQuestionId,
  previewMode,
  lastSavedFingerprint,
  now = () => new Date(),
}: SaveContentManagerDraftAutosaveInput<TDraft>): { ok: true; savedAt: string } | { ok: false } {
  const savedAt = now().toISOString();
  const envelope: ContentManagerDraftAutosaveEnvelope<TDraft> = {
    version: 1,
    savedAt,
    draft,
    selectedQuestionId,
    previewMode,
    lastSavedFingerprint,
  };

  try {
    storage.setItem(key, JSON.stringify(envelope));
    return { ok: true, savedAt };
  } catch {
    return { ok: false };
  }
}

export function clearContentManagerDraftAutosave(
  storage: ContentManagerDraftAutosaveStorage,
  key = contentManagerDraftAutosaveStorageKey,
): boolean {
  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
