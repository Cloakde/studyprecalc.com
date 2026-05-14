import {
  Download,
  FileUp,
  Image as ImageIcon,
  PenLine,
  Plus,
  Save,
  Trash2,
  Video,
  XCircle,
} from 'lucide-react';
import { type ChangeEvent, type RefObject, useEffect, useMemo, useRef, useState } from 'react';

import {
  createLocalImageReference,
  isLocalImageReference,
  saveLocalImageFile,
} from '../../data/localImageStore';
import {
  createLocalVideoReference,
  isLocalVideoReference,
  saveLocalVideoFile,
} from '../../data/localVideoStore';
import { QuestionSchema, QuestionSetSchema } from '../../data/schemas/questionSchema';
import type {
  CalculatorPolicy,
  Difficulty,
  FrqQuestion,
  McqChoice,
  McqQuestion,
  Question,
  QuestionAsset,
  QuestionSection,
} from '../../domain/questions/types';
import { MathText } from './MathText';
import { QuestionAssetGallery } from './QuestionAssetGallery';

type ContentManagerProps = {
  customQuestions: Question[];
  seedQuestionIds: Set<string>;
  onSaveQuestion: (question: Question) => void;
  onDeleteQuestion: (questionId: string) => void;
  onImportQuestions: (questions: Question[]) => { imported: number; skipped: number };
};

type ChoiceDraft = {
  id: McqChoice['id'];
  text: string;
  explanation: string;
};

type RubricDraft = {
  id: string;
  description: string;
  points: string;
};

type FrqPartDraft = {
  id: string;
  prompt: string;
  sampleResponse: string;
  expectedWork: string;
  rubric: RubricDraft[];
};

type AssetDraft = {
  id: string;
  type: QuestionAsset['type'];
  path: string;
  alt: string;
  caption: string;
};

type QuestionDraft = {
  id: string;
  type: 'mcq' | 'frq';
  unit: string;
  topic: string;
  skill: string;
  difficulty: Difficulty;
  calculator: CalculatorPolicy;
  section: QuestionSection;
  tags: string;
  prompt: string;
  questionAssets: AssetDraft[];
  explanationSummary: string;
  explanationSteps: string;
  commonMistakes: string;
  solutionAssets: AssetDraft[];
  videoUrl: string;
  videoThumbnailPath: string;
  videoTranscriptPath: string;
  videoDurationSeconds: string;
  choices: ChoiceDraft[];
  correctChoiceId: McqChoice['id'];
  frqParts: FrqPartDraft[];
};

const defaultChoices: ChoiceDraft[] = [
  { id: 'A', text: '', explanation: '' },
  { id: 'B', text: '', explanation: '' },
  { id: 'C', text: '', explanation: '' },
  { id: 'D', text: '', explanation: '' },
];

const defaultFrqPart: FrqPartDraft = {
  id: 'a',
  prompt: '',
  sampleResponse: '',
  expectedWork: '',
  rubric: [
    {
      id: 'criterion-1',
      description: '',
      points: '1',
    },
  ],
};

const maxLocalVideoFileSizeBytes = 250 * 1024 * 1024;
const maxLocalImageFileSizeBytes = 20 * 1024 * 1024;

function createAssetId(prefix = 'asset'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createBlankDraft(): QuestionDraft {
  return {
    id: `user-${Date.now()}`,
    type: 'mcq',
    unit: '',
    topic: '',
    skill: '',
    difficulty: 'intro',
    calculator: 'none',
    section: 'practice',
    tags: '',
    prompt: '',
    questionAssets: [],
    explanationSummary: '',
    explanationSteps: '',
    commonMistakes: '',
    solutionAssets: [],
    videoUrl: '',
    videoThumbnailPath: '',
    videoTranscriptPath: '',
    videoDurationSeconds: '',
    choices: defaultChoices.map((choice) => ({ ...choice })),
    correctChoiceId: 'A',
    frqParts: [
      { ...defaultFrqPart, rubric: defaultFrqPart.rubric.map((criterion) => ({ ...criterion })) },
    ],
  };
}

function linesToList(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function listToLines(value: string[] | undefined): string {
  return value?.join('\n') ?? '';
}

function isSupportedVideoFile(file: File): boolean {
  return file.type.startsWith('video/') || /\.(m4v|mov|mp4|ogg|ogv|webm)$/i.test(file.name);
}

function isSupportedImageFile(file: File): boolean {
  return file.type.startsWith('image/') || /\.(gif|jpeg|jpg|png|svg|webp)$/i.test(file.name);
}

function filenameToAltText(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim();
}

function assetToDraft(asset: QuestionAsset): AssetDraft {
  return {
    id: asset.id,
    type: asset.type,
    path: asset.path,
    alt: asset.alt,
    caption: asset.caption ?? '',
  };
}

function draftAssetsToAssets(drafts: AssetDraft[]): QuestionAsset[] | undefined {
  const assets = drafts
    .map((asset) => ({
      id: asset.id.trim(),
      type: asset.type,
      path: asset.path.trim(),
      alt: asset.alt.trim(),
      caption: asset.caption.trim() || undefined,
    }))
    .filter((asset) => asset.id && asset.path && asset.alt);

  return assets.length > 0 ? assets : undefined;
}

function questionHasLocalMedia(question: Question): boolean {
  const questionAssetHasLocalMedia =
    question.assets?.some((asset) => isLocalImageReference(asset.path)) ?? false;
  const solutionAssetHasLocalMedia =
    question.explanation.assets?.some((asset) => isLocalImageReference(asset.path)) ?? false;
  const videoHasLocalMedia = isLocalVideoReference(question.explanation.video?.url);

  return questionAssetHasLocalMedia || solutionAssetHasLocalMedia || videoHasLocalMedia;
}

function questionToDraft(question: Question): QuestionDraft {
  const video = question.explanation.video;

  return {
    id: question.id,
    type: question.type,
    unit: question.unit,
    topic: question.topic,
    skill: question.skill,
    difficulty: question.difficulty,
    calculator: question.calculator,
    section: question.section,
    tags: question.tags.join(', '),
    prompt: question.prompt,
    questionAssets: question.assets?.map(assetToDraft) ?? [],
    explanationSummary: question.explanation.summary,
    explanationSteps: listToLines(question.explanation.steps),
    commonMistakes: listToLines(question.explanation.commonMistakes),
    solutionAssets: question.explanation.assets?.map(assetToDraft) ?? [],
    videoUrl: video?.url ?? '',
    videoThumbnailPath: video?.thumbnailPath ?? '',
    videoTranscriptPath: video?.transcriptPath ?? '',
    videoDurationSeconds: video?.durationSeconds ? String(video.durationSeconds) : '',
    choices:
      question.type === 'mcq'
        ? question.choices.map((choice) => ({ ...choice }))
        : defaultChoices.map((choice) => ({ ...choice })),
    correctChoiceId: question.type === 'mcq' ? question.correctChoiceId : 'A',
    frqParts:
      question.type === 'frq'
        ? question.parts.map((part) => ({
            id: part.id,
            prompt: part.prompt,
            sampleResponse: part.sampleResponse,
            expectedWork: listToLines(part.expectedWork),
            rubric: part.rubric.map((criterion) => ({
              id: criterion.id,
              description: criterion.description,
              points: String(criterion.points),
            })),
          }))
        : [
            {
              ...defaultFrqPart,
              rubric: defaultFrqPart.rubric.map((criterion) => ({ ...criterion })),
            },
          ],
  };
}

function draftToQuestion(draft: QuestionDraft): Question {
  const explanation = {
    summary: draft.explanationSummary.trim(),
    steps: linesToList(draft.explanationSteps),
    commonMistakes: linesToList(draft.commonMistakes),
    assets: draftAssetsToAssets(draft.solutionAssets),
    video: draft.videoUrl.trim()
      ? {
          url: draft.videoUrl.trim(),
          thumbnailPath: draft.videoThumbnailPath.trim() || undefined,
          transcriptPath: draft.videoTranscriptPath.trim() || undefined,
          durationSeconds: draft.videoDurationSeconds.trim()
            ? Number(draft.videoDurationSeconds.trim())
            : undefined,
        }
      : undefined,
  };

  const baseQuestion = {
    id: draft.id.trim(),
    unit: draft.unit.trim(),
    topic: draft.topic.trim(),
    skill: draft.skill.trim(),
    difficulty: draft.difficulty,
    calculator: draft.calculator,
    section: draft.section,
    tags: draft.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    prompt: draft.prompt.trim(),
    assets: draftAssetsToAssets(draft.questionAssets),
    explanation,
  };

  if (draft.type === 'mcq') {
    return {
      ...baseQuestion,
      type: 'mcq',
      choices: draft.choices.map((choice) => ({
        id: choice.id,
        text: choice.text.trim(),
        explanation: choice.explanation.trim(),
      })),
      correctChoiceId: draft.correctChoiceId,
    } satisfies McqQuestion;
  }

  return {
    ...baseQuestion,
    type: 'frq',
    parts: draft.frqParts.map((part) => ({
      id: part.id.trim(),
      prompt: part.prompt.trim(),
      sampleResponse: part.sampleResponse.trim(),
      expectedWork: linesToList(part.expectedWork),
      rubric: part.rubric.map((criterion) => ({
        id: criterion.id.trim(),
        description: criterion.description.trim(),
        points: Number(criterion.points),
      })),
    })),
  } satisfies FrqQuestion;
}

function formatValidationError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Question could not be saved.';
}

export function ContentManager({
  customQuestions,
  seedQuestionIds,
  onSaveQuestion,
  onDeleteQuestion,
  onImportQuestions,
}: ContentManagerProps) {
  const [draft, setDraft] = useState<QuestionDraft>(() => createBlankDraft());
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [uploadingImageTarget, setUploadingImageTarget] = useState<'question' | 'solution' | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);
  const questionImageInputRef = useRef<HTMLInputElement | null>(null);
  const solutionImageInputRef = useRef<HTMLInputElement | null>(null);
  const activeDraftIdRef = useRef(draft.id);

  const selectedQuestion = useMemo(
    () => customQuestions.find((question) => question.id === selectedQuestionId) ?? null,
    [customQuestions, selectedQuestionId],
  );

  useEffect(() => {
    activeDraftIdRef.current = draft.id;
  }, [draft.id]);

  function updateDraft<Field extends keyof QuestionDraft>(
    field: Field,
    value: QuestionDraft[Field],
  ) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function startNewQuestion(type: 'mcq' | 'frq' = 'mcq') {
    setDraft({
      ...createBlankDraft(),
      type,
    });
    setSelectedQuestionId(null);
    setNotice('');
    setError('');
  }

  function saveQuestion() {
    setNotice('');
    setError('');

    if (seedQuestionIds.has(draft.id.trim())) {
      setError('That ID belongs to a built-in question. Use a different ID.');
      return;
    }

    if (
      customQuestions.some((question) => question.id === draft.id.trim()) &&
      selectedQuestionId !== draft.id.trim()
    ) {
      setError('That ID already belongs to another authored question. Use a different ID.');
      return;
    }

    if (linesToList(draft.commonMistakes).length === 0) {
      setError('Add at least one common mistake before saving.');
      return;
    }

    if (draft.videoUrl.trim() && !draft.videoTranscriptPath.trim()) {
      setError('Add a transcript path for the video explanation before saving.');
      return;
    }

    try {
      const question = draftToQuestion(draft);
      const parsed = QuestionSchema.parse(question);

      onSaveQuestion(parsed);
      setSelectedQuestionId(parsed.id);
      setDraft(questionToDraft(parsed));
      setNotice('Question saved.');
    } catch (saveError) {
      setError(formatValidationError(saveError));
    }
  }

  function deleteQuestion(questionId: string) {
    onDeleteQuestion(questionId);

    if (selectedQuestionId === questionId) {
      startNewQuestion();
    }

    setNotice('Question deleted.');
  }

  function exportQuestions() {
    const localMediaCount = customQuestions.filter(questionHasLocalMedia).length;

    if (
      localMediaCount > 0 &&
      !window.confirm(
        `${localMediaCount} question(s) reference uploaded local media. Exported JSON will not include those image or video files. Continue export?`,
      )
    ) {
      return;
    }

    const data = JSON.stringify(
      {
        version: 'local',
        questions: customQuestions,
      },
      null,
      2,
    );
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'precalcapp-question-pack.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importQuestions(event: ChangeEvent<HTMLInputElement>) {
    setNotice('');
    setError('');

    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = QuestionSetSchema.parse(JSON.parse(text) as unknown);
      const result = onImportQuestions(parsed.questions);
      setNotice(
        `Imported ${result.imported} questions. Skipped ${result.skipped} built-in ID conflicts.`,
      );
    } catch (importError) {
      setError(formatValidationError(importError));
    } finally {
      event.target.value = '';
    }
  }

  async function uploadVideoFile(event: ChangeEvent<HTMLInputElement>) {
    setNotice('');
    setError('');

    const file = event.target.files?.[0];
    const draftIdAtUploadStart = draft.id;

    if (!file) {
      return;
    }

    try {
      if (!isSupportedVideoFile(file)) {
        setError('Choose a video file such as MP4, WebM, MOV, or OGG.');
        return;
      }

      if (file.size > maxLocalVideoFileSizeBytes) {
        const maxMegabytes = Math.round(maxLocalVideoFileSizeBytes / (1024 * 1024));
        setError(`Choose a video file smaller than ${maxMegabytes} MB.`);
        return;
      }

      setIsUploadingVideo(true);
      const record = await saveLocalVideoFile(file);

      if (activeDraftIdRef.current !== draftIdAtUploadStart) {
        setError(
          'Video upload finished after you changed drafts. Upload it again on the target question.',
        );
        return;
      }

      setDraft((current) => ({
        ...current,
        videoUrl: createLocalVideoReference(record.id),
      }));
      setNotice(`Uploaded ${record.name}. Save the question to attach it.`);
    } catch (uploadError) {
      setError(formatValidationError(uploadError));
    } finally {
      setIsUploadingVideo(false);
      event.target.value = '';
    }
  }

  function getAssetDraftField(
    target: 'question' | 'solution',
  ): 'questionAssets' | 'solutionAssets' {
    return target === 'question' ? 'questionAssets' : 'solutionAssets';
  }

  function addBlankAsset(target: 'question' | 'solution') {
    const field = getAssetDraftField(target);

    updateDraft(field, [
      ...draft[field],
      {
        id: createAssetId(target),
        type: 'image',
        path: '',
        alt: '',
        caption: '',
      },
    ]);
  }

  function updateAssetDraft<Field extends keyof AssetDraft>(
    target: 'question' | 'solution',
    index: number,
    field: Field,
    value: AssetDraft[Field],
  ) {
    const draftField = getAssetDraftField(target);
    const assets = [...draft[draftField]];
    assets[index] = {
      ...assets[index],
      [field]: value,
    };
    updateDraft(draftField, assets);
  }

  function removeAsset(target: 'question' | 'solution', index: number) {
    const field = getAssetDraftField(target);
    updateDraft(
      field,
      draft[field].filter((_, assetIndex) => assetIndex !== index),
    );
  }

  async function uploadImageFile(
    event: ChangeEvent<HTMLInputElement>,
    target: 'question' | 'solution',
  ) {
    setNotice('');
    setError('');

    const file = event.target.files?.[0];
    const draftIdAtUploadStart = draft.id;

    if (!file) {
      return;
    }

    try {
      if (!isSupportedImageFile(file)) {
        setError('Choose an image file such as PNG, JPG, SVG, GIF, or WebP.');
        return;
      }

      if (file.size > maxLocalImageFileSizeBytes) {
        const maxMegabytes = Math.round(maxLocalImageFileSizeBytes / (1024 * 1024));
        setError(`Choose an image file smaller than ${maxMegabytes} MB.`);
        return;
      }

      setUploadingImageTarget(target);
      const record = await saveLocalImageFile(file);
      const field = getAssetDraftField(target);
      const altText = filenameToAltText(record.name) || 'Uploaded image';

      if (activeDraftIdRef.current !== draftIdAtUploadStart) {
        setError(
          'Image upload finished after you changed drafts. Upload it again on the target question.',
        );
        return;
      }

      setDraft((current) => ({
        ...current,
        [field]: [
          ...current[field],
          {
            id: createAssetId(target),
            type: 'image',
            path: createLocalImageReference(record.id),
            alt: altText,
            caption: altText,
          },
        ],
      }));
      setNotice(`Uploaded ${record.name}. Save the question to attach it.`);
    } catch (uploadError) {
      setError(formatValidationError(uploadError));
    } finally {
      setUploadingImageTarget(null);
      event.target.value = '';
    }
  }

  function renderAssetEditor(
    target: 'question' | 'solution',
    title: string,
    description: string,
    inputRef: RefObject<HTMLInputElement | null>,
  ) {
    const field = getAssetDraftField(target);
    const assets = draft[field];
    const isUploading = uploadingImageTarget === target;

    return (
      <section className="editor-section">
        <div className="section-heading-row">
          <div>
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
          <ImageIcon aria-hidden="true" />
        </div>
        <div className="asset-editor-actions">
          <button className="ghost-button" onClick={() => addBlankAsset(target)} type="button">
            <Plus aria-hidden="true" />
            Add Image URL
          </button>
          <button
            className="ghost-button"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            <ImageIcon aria-hidden="true" />
            {isUploading ? 'Uploading...' : 'Upload Image File'}
          </button>
          <input
            accept="image/*,.gif,.jpeg,.jpg,.png,.svg,.webp"
            className="visually-hidden"
            onChange={(event) => uploadImageFile(event, target)}
            ref={inputRef}
            type="file"
          />
        </div>
        {assets.length === 0 ? <p className="empty-list-copy">No images attached.</p> : null}
        {assets.map((asset, index) => (
          <div className="asset-editor-row" key={`${asset.id}-${index}`}>
            <div className="form-grid form-grid--two">
              <label>
                Type
                <select
                  onChange={(event) =>
                    updateAssetDraft(
                      target,
                      index,
                      'type',
                      event.target.value as QuestionAsset['type'],
                    )
                  }
                  value={asset.type}
                >
                  <option value="image">Image</option>
                  <option value="graph">Graph</option>
                  <option value="table">Table</option>
                </select>
              </label>
              <label>
                Path
                <input
                  onChange={(event) => updateAssetDraft(target, index, 'path', event.target.value)}
                  value={asset.path}
                />
              </label>
              <label>
                Alt text
                <input
                  onChange={(event) => updateAssetDraft(target, index, 'alt', event.target.value)}
                  value={asset.alt}
                />
              </label>
              <label>
                Caption
                <input
                  onChange={(event) =>
                    updateAssetDraft(target, index, 'caption', event.target.value)
                  }
                  value={asset.caption}
                />
              </label>
            </div>
            {isLocalImageReference(asset.path) ? (
              <p className="asset-editor-note">
                Uploaded image is stored in this browser. Exported JSON keeps the image reference,
                not the image file.
              </p>
            ) : null}
            <button
              className="danger-button"
              onClick={() => removeAsset(target, index)}
              type="button"
            >
              <Trash2 aria-hidden="true" />
              Remove Image
            </button>
          </div>
        ))}
      </section>
    );
  }

  return (
    <main className="manager-shell">
      <header className="manager-header">
        <div>
          <p className="eyebrow">Content Manager</p>
          <h1>No-code Question Authoring</h1>
        </div>
        <div className="manager-actions">
          <button className="ghost-button" onClick={() => startNewQuestion('mcq')} type="button">
            <Plus aria-hidden="true" />
            MCQ
          </button>
          <button className="ghost-button" onClick={() => startNewQuestion('frq')} type="button">
            <Plus aria-hidden="true" />
            FRQ
          </button>
          <button
            className="ghost-button"
            disabled={customQuestions.length === 0}
            onClick={exportQuestions}
            type="button"
          >
            <Download aria-hidden="true" />
            Export
          </button>
          <button
            className="ghost-button"
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            <FileUp aria-hidden="true" />
            Import
          </button>
          <input
            accept="application/json"
            className="visually-hidden"
            onChange={importQuestions}
            ref={fileInputRef}
            type="file"
          />
        </div>
      </header>

      <div className="manager-layout">
        <aside className="managed-list" aria-label="Authored questions">
          <h2>Authored Questions</h2>
          {customQuestions.length === 0 ? <p>No authored questions yet.</p> : null}
          <div className="managed-list__items">
            {customQuestions.map((question) => (
              <button
                className="managed-list__item"
                data-active={question.id === selectedQuestionId}
                key={question.id}
                onClick={() => {
                  setSelectedQuestionId(question.id);
                  setDraft(questionToDraft(question));
                  setNotice('');
                  setError('');
                }}
                type="button"
              >
                <strong>{question.skill || question.id}</strong>
                <span>{question.type.toUpperCase()}</span>
                <small>{question.topic}</small>
              </button>
            ))}
          </div>
        </aside>

        <section className="editor-panel">
          <div className="editor-toolbar">
            <div>
              <p className="eyebrow">{selectedQuestion ? 'Editing' : 'New Question'}</p>
              <h2>{draft.type === 'mcq' ? 'Multiple Choice' : 'Free Response'}</h2>
            </div>
            <div className="action-row">
              <button className="primary-button" onClick={saveQuestion} type="button">
                <Save aria-hidden="true" />
                Save
              </button>
              {selectedQuestion ? (
                <button
                  className="danger-button"
                  onClick={() => deleteQuestion(selectedQuestion.id)}
                  type="button"
                >
                  <Trash2 aria-hidden="true" />
                  Delete
                </button>
              ) : null}
            </div>
          </div>

          {notice ? <div className="form-notice">{notice}</div> : null}
          {error ? (
            <div className="form-error">
              <XCircle aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="form-grid form-grid--four">
            <label>
              Type
              <select
                onChange={(event) =>
                  updateDraft('type', event.target.value as QuestionDraft['type'])
                }
                value={draft.type}
              >
                <option value="mcq">Multiple choice</option>
                <option value="frq">Free response</option>
              </select>
            </label>
            <label>
              ID
              <input onChange={(event) => updateDraft('id', event.target.value)} value={draft.id} />
            </label>
            <label>
              Difficulty
              <select
                onChange={(event) => updateDraft('difficulty', event.target.value as Difficulty)}
                value={draft.difficulty}
              >
                <option value="intro">Intro</option>
                <option value="medium">Medium</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
            <label>
              Calculator
              <select
                onChange={(event) =>
                  updateDraft('calculator', event.target.value as CalculatorPolicy)
                }
                value={draft.calculator}
              >
                <option value="none">No calculator</option>
                <option value="graphing">Graphing calculator</option>
              </select>
            </label>
          </div>

          <div className="form-grid form-grid--two">
            <label>
              Unit
              <input
                onChange={(event) => updateDraft('unit', event.target.value)}
                value={draft.unit}
              />
            </label>
            <label>
              Topic
              <input
                onChange={(event) => updateDraft('topic', event.target.value)}
                value={draft.topic}
              />
            </label>
            <label>
              Skill
              <input
                onChange={(event) => updateDraft('skill', event.target.value)}
                value={draft.skill}
              />
            </label>
            <label>
              Section
              <select
                onChange={(event) => updateDraft('section', event.target.value as QuestionSection)}
                value={draft.section}
              >
                <option value="practice">Practice</option>
                <option value="mcq-a">MCQ A</option>
                <option value="mcq-b">MCQ B</option>
                <option value="frq-a">FRQ A</option>
                <option value="frq-b">FRQ B</option>
              </select>
            </label>
          </div>

          <label>
            Tags
            <input
              onChange={(event) => updateDraft('tags', event.target.value)}
              placeholder="functions, modeling, calculator"
              value={draft.tags}
            />
          </label>

          <label>
            Prompt
            <textarea
              onChange={(event) => updateDraft('prompt', event.target.value)}
              rows={5}
              value={draft.prompt}
            />
          </label>

          {renderAssetEditor(
            'question',
            'Question Images',
            'Attach graphs, residual plots, tables, or diagrams that students need before answering.',
            questionImageInputRef,
          )}

          {draft.type === 'mcq' ? (
            <section className="editor-section">
              <h3>Choices</h3>
              <div className="choice-editor-grid">
                {draft.choices.map((choice, index) => (
                  <div className="choice-editor" key={choice.id}>
                    <label>
                      Choice {choice.id}
                      <textarea
                        onChange={(event) => {
                          const choices = [...draft.choices];
                          choices[index] = { ...choice, text: event.target.value };
                          updateDraft('choices', choices);
                        }}
                        rows={2}
                        value={choice.text}
                      />
                    </label>
                    <label>
                      Choice {choice.id} explanation
                      <textarea
                        onChange={(event) => {
                          const choices = [...draft.choices];
                          choices[index] = { ...choice, explanation: event.target.value };
                          updateDraft('choices', choices);
                        }}
                        rows={3}
                        value={choice.explanation}
                      />
                    </label>
                  </div>
                ))}
              </div>
              <label>
                Correct Choice
                <select
                  onChange={(event) =>
                    updateDraft('correctChoiceId', event.target.value as McqChoice['id'])
                  }
                  value={draft.correctChoiceId}
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </label>
            </section>
          ) : (
            <section className="editor-section">
              <div className="section-heading-row">
                <h3>FRQ Parts</h3>
                <button
                  className="ghost-button"
                  onClick={() =>
                    updateDraft('frqParts', [
                      ...draft.frqParts,
                      {
                        ...defaultFrqPart,
                        id: String.fromCharCode(97 + draft.frqParts.length),
                        rubric: defaultFrqPart.rubric.map((criterion) => ({
                          ...criterion,
                          id: `criterion-${draft.frqParts.length + 1}`,
                        })),
                      },
                    ])
                  }
                  type="button"
                >
                  <Plus aria-hidden="true" />
                  Part
                </button>
              </div>
              {draft.frqParts.map((part, partIndex) => (
                <div className="frq-editor-part" key={`${part.id}-${partIndex}`}>
                  <div className="form-grid form-grid--two">
                    <label>
                      Part ID
                      <input
                        onChange={(event) => {
                          const frqParts = [...draft.frqParts];
                          frqParts[partIndex] = { ...part, id: event.target.value };
                          updateDraft('frqParts', frqParts);
                        }}
                        value={part.id}
                      />
                    </label>
                    <button
                      className="ghost-button"
                      disabled={draft.frqParts.length === 1}
                      onClick={() =>
                        updateDraft(
                          'frqParts',
                          draft.frqParts.filter((_, index) => index !== partIndex),
                        )
                      }
                      type="button"
                    >
                      <Trash2 aria-hidden="true" />
                      Remove
                    </button>
                  </div>
                  <label>
                    Part prompt
                    <textarea
                      onChange={(event) => {
                        const frqParts = [...draft.frqParts];
                        frqParts[partIndex] = { ...part, prompt: event.target.value };
                        updateDraft('frqParts', frqParts);
                      }}
                      rows={3}
                      value={part.prompt}
                    />
                  </label>
                  <label>
                    Sample response
                    <textarea
                      onChange={(event) => {
                        const frqParts = [...draft.frqParts];
                        frqParts[partIndex] = { ...part, sampleResponse: event.target.value };
                        updateDraft('frqParts', frqParts);
                      }}
                      rows={4}
                      value={part.sampleResponse}
                    />
                  </label>
                  <label>
                    Expected work
                    <textarea
                      onChange={(event) => {
                        const frqParts = [...draft.frqParts];
                        frqParts[partIndex] = { ...part, expectedWork: event.target.value };
                        updateDraft('frqParts', frqParts);
                      }}
                      rows={3}
                      value={part.expectedWork}
                    />
                  </label>
                  <div className="section-heading-row">
                    <h4>Rubric</h4>
                    <button
                      className="ghost-button"
                      onClick={() => {
                        const frqParts = [...draft.frqParts];
                        const nextRubric = [
                          ...part.rubric,
                          {
                            id: `${part.id || 'part'}-criterion-${part.rubric.length + 1}`,
                            description: '',
                            points: '1',
                          },
                        ];
                        frqParts[partIndex] = { ...part, rubric: nextRubric };
                        updateDraft('frqParts', frqParts);
                      }}
                      type="button"
                    >
                      <Plus aria-hidden="true" />
                      Criterion
                    </button>
                  </div>
                  {part.rubric.map((criterion, criterionIndex) => (
                    <div className="rubric-editor-row" key={`${criterion.id}-${criterionIndex}`}>
                      <label>
                        Criterion ID
                        <input
                          onChange={(event) => {
                            const frqParts = [...draft.frqParts];
                            const rubric = [...part.rubric];
                            rubric[criterionIndex] = { ...criterion, id: event.target.value };
                            frqParts[partIndex] = { ...part, rubric };
                            updateDraft('frqParts', frqParts);
                          }}
                          value={criterion.id}
                        />
                      </label>
                      <label>
                        Points
                        <input
                          min="1"
                          onChange={(event) => {
                            const frqParts = [...draft.frqParts];
                            const rubric = [...part.rubric];
                            rubric[criterionIndex] = { ...criterion, points: event.target.value };
                            frqParts[partIndex] = { ...part, rubric };
                            updateDraft('frqParts', frqParts);
                          }}
                          type="number"
                          value={criterion.points}
                        />
                      </label>
                      <label>
                        Description
                        <textarea
                          onChange={(event) => {
                            const frqParts = [...draft.frqParts];
                            const rubric = [...part.rubric];
                            rubric[criterionIndex] = {
                              ...criterion,
                              description: event.target.value,
                            };
                            frqParts[partIndex] = { ...part, rubric };
                            updateDraft('frqParts', frqParts);
                          }}
                          rows={2}
                          value={criterion.description}
                        />
                      </label>
                    </div>
                  ))}
                </div>
              ))}
            </section>
          )}

          <section className="editor-section">
            <h3>Solution</h3>
            <label>
              Explanation summary
              <textarea
                onChange={(event) => updateDraft('explanationSummary', event.target.value)}
                rows={3}
                value={draft.explanationSummary}
              />
            </label>
            <label>
              Solution steps
              <textarea
                onChange={(event) => updateDraft('explanationSteps', event.target.value)}
                rows={5}
                value={draft.explanationSteps}
              />
            </label>
            <label>
              Common mistakes
              <textarea
                onChange={(event) => updateDraft('commonMistakes', event.target.value)}
                rows={3}
                value={draft.commonMistakes}
              />
            </label>
          </section>

          {renderAssetEditor(
            'solution',
            'Solution Images',
            'Attach worked-solution graphs, annotated plots, or diagrams that appear after the explanation is revealed.',
            solutionImageInputRef,
          )}

          <section className="editor-section">
            <div className="section-heading-row">
              <h3>Video</h3>
              <Video aria-hidden="true" />
            </div>
            <div className="video-upload-panel">
              <div className="action-row">
                <button
                  className="ghost-button"
                  disabled={isUploadingVideo}
                  onClick={() => videoFileInputRef.current?.click()}
                  type="button"
                >
                  <Video aria-hidden="true" />
                  {isUploadingVideo ? 'Uploading...' : 'Upload Video File'}
                </button>
                {draft.videoUrl ? (
                  <button
                    className="ghost-button"
                    onClick={() => {
                      updateDraft('videoUrl', '');
                      updateDraft('videoThumbnailPath', '');
                      updateDraft('videoTranscriptPath', '');
                      updateDraft('videoDurationSeconds', '');
                    }}
                    type="button"
                  >
                    Clear Video
                  </button>
                ) : null}
              </div>
              <input
                accept="video/*,.m4v,.mov,.mp4,.ogg,.ogv,.webm"
                className="visually-hidden"
                onChange={uploadVideoFile}
                ref={videoFileInputRef}
                type="file"
              />
              {isLocalVideoReference(draft.videoUrl) ? (
                <p>
                  Uploaded video is stored in this browser and plays inside the app. Exported JSON
                  keeps the video reference, not the video file.
                </p>
              ) : (
                <p>Use a YouTube/Vimeo URL or upload a local video file for in-app playback.</p>
              )}
            </div>
            <div className="form-grid form-grid--two">
              <label>
                Video URL
                <input
                  onChange={(event) => updateDraft('videoUrl', event.target.value)}
                  value={draft.videoUrl}
                />
              </label>
              <label>
                Duration seconds
                <input
                  min="1"
                  onChange={(event) => updateDraft('videoDurationSeconds', event.target.value)}
                  type="number"
                  value={draft.videoDurationSeconds}
                />
              </label>
              <label>
                Thumbnail path
                <input
                  onChange={(event) => updateDraft('videoThumbnailPath', event.target.value)}
                  value={draft.videoThumbnailPath}
                />
              </label>
              <label>
                Transcript path
                <input
                  onChange={(event) => updateDraft('videoTranscriptPath', event.target.value)}
                  value={draft.videoTranscriptPath}
                />
              </label>
            </div>
          </section>
        </section>

        <aside className="preview-panel" aria-label="Question preview">
          <div className="section-heading-row">
            <h2>Preview</h2>
            <PenLine aria-hidden="true" />
          </div>
          <MathText block text={draft.prompt || 'Question prompt preview'} />
          <QuestionAssetGallery
            ariaLabel="Question image preview"
            assets={draftAssetsToAssets(draft.questionAssets)}
          />
          <div className="preview-card">
            <h3>Solution Summary</h3>
            <MathText block text={draft.explanationSummary || 'Solution summary preview'} />
            <QuestionAssetGallery
              ariaLabel="Solution image preview"
              assets={draftAssetsToAssets(draft.solutionAssets)}
            />
          </div>
        </aside>
      </div>
    </main>
  );
}
