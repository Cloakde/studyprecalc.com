import { ChevronLeft, ChevronRight, Eye, EyeOff, ListChecks, Shuffle, Video } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';

import type { Attempt } from '../../domain/attempts/types';
import type { FrqQuestion, McqChoice, McqQuestion, Question } from '../../domain/questions/types';
import { CalculatorPanel } from './CalculatorPanel';
import { FrqPractice } from './FrqPractice';
import { MathText } from './MathText';
import { McqPractice } from './McqPractice';
import { QuestionAssetGallery } from './QuestionAssetGallery';
import { QuestionMeta } from './QuestionMeta';
import { VideoExplanation } from './VideoExplanation';

type QuestionPracticeProps = {
  questions: Question[];
  questionSetVersion: string;
  attemptsByQuestionId?: Map<string, Attempt[]>;
  onSaveMcqAttempt?: (
    question: McqQuestion,
    selectedChoiceId: McqChoice['id'],
    startedAt: Date,
  ) => void;
  onSaveFrqAttempt?: (
    question: FrqQuestion,
    partResponses: Record<string, string>,
    earnedPointsByCriterion: Record<string, boolean>,
    startedAt: Date,
    attemptId?: string,
    submittedAt?: Date,
  ) => Attempt | undefined;
};

export function QuestionPractice({
  questions,
  questionSetVersion,
  attemptsByQuestionId,
  onSaveMcqAttempt,
  onSaveFrqAttempt,
}: QuestionPracticeProps) {
  const questionListId = useId();
  const solutionPanelId = useId();
  const solutionBodyId = useId();
  const videoPanelId = useId();
  const filterStatusId = useId();
  const solutionBodyRef = useRef<HTMLDivElement | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    questions[0]?.id ?? null,
  );
  const [typeFilter, setTypeFilter] = useState<'all' | Question['type']>('all');
  const [unitFilter, setUnitFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | Question['difficulty']>('all');
  const [calculatorFilter, setCalculatorFilter] = useState<'all' | Question['calculator']>('all');
  const [searchText, setSearchText] = useState('');

  const counts = useMemo(() => {
    return questions.reduce(
      (result, question) => ({
        mcq: result.mcq + (question.type === 'mcq' ? 1 : 0),
        frq: result.frq + (question.type === 'frq' ? 1 : 0),
      }),
      { mcq: 0, frq: 0 },
    );
  }, [questions]);

  const filterOptions = useMemo(() => {
    return {
      units: [...new Set(questions.map((question) => question.unit))].sort(),
      difficulties: [...new Set(questions.map((question) => question.difficulty))].sort(),
      calculators: [...new Set(questions.map((question) => question.calculator))].sort(),
    };
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return questions.filter((question) => {
      const matchesType = typeFilter === 'all' || question.type === typeFilter;
      const matchesUnit = unitFilter === 'all' || question.unit === unitFilter;
      const matchesDifficulty =
        difficultyFilter === 'all' || question.difficulty === difficultyFilter;
      const matchesCalculator =
        calculatorFilter === 'all' || question.calculator === calculatorFilter;

      const searchableText = [
        question.id,
        question.unit,
        question.topic,
        question.skill,
        question.section,
        question.tags.join(' '),
      ]
        .join(' ')
        .toLowerCase();

      const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);

      return matchesType && matchesUnit && matchesDifficulty && matchesCalculator && matchesSearch;
    });
  }, [calculatorFilter, difficultyFilter, questions, searchText, typeFilter, unitFilter]);

  const currentIndex = filteredQuestions.findIndex(
    (question) => question.id === selectedQuestionId,
  );
  const currentQuestion =
    currentIndex >= 0 ? filteredQuestions[currentIndex] : filteredQuestions[0];
  const [revealedExplanationQuestionId, setRevealedExplanationQuestionId] = useState<string | null>(
    null,
  );
  const [visibleVideoQuestionId, setVisibleVideoQuestionId] = useState<string | null>(null);
  const isExplanationVisible = currentQuestion
    ? revealedExplanationQuestionId === currentQuestion.id
    : false;
  const isVideoVisible = currentQuestion ? visibleVideoQuestionId === currentQuestion.id : false;
  const isCurrentFrq = currentQuestion?.type === 'frq';
  const explanationHeading = isCurrentFrq ? 'Full Explanation' : 'Explanation';
  const showExplanationLabel = isCurrentFrq ? 'Show Full Explanation' : 'Show Answer Explanation';
  const hideExplanationLabel = isCurrentFrq ? 'Hide Full Explanation' : 'Hide Answer Explanation';

  useEffect(() => {
    if (!currentQuestion) {
      setSelectedQuestionId(null);
      return;
    }

    if (currentQuestion.id !== selectedQuestionId) {
      setSelectedQuestionId(currentQuestion.id);
    }
  }, [currentQuestion, selectedQuestionId]);

  useEffect(() => {
    setRevealedExplanationQuestionId(null);
    setVisibleVideoQuestionId(null);
  }, [currentQuestion?.id]);

  useEffect(() => {
    if (isExplanationVisible) {
      solutionBodyRef.current?.focus();
    }
  }, [isExplanationVisible]);

  function goToQuestion(index: number) {
    const question = filteredQuestions[Math.min(Math.max(index, 0), filteredQuestions.length - 1)];

    if (question) {
      setSelectedQuestionId(question.id);
    }
  }

  function focusQuestionButton(index: number) {
    const nextIndex = Math.min(Math.max(index, 0), filteredQuestions.length - 1);

    window.requestAnimationFrame(() => {
      document.getElementById(`${questionListId}-${nextIndex}`)?.focus();
    });
  }

  function handleQuestionListKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (filteredQuestions.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      goToQuestion(index + 1);
      focusQuestionButton(index + 1);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      goToQuestion(index - 1);
      focusQuestionButton(index - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      goToQuestion(0);
      focusQuestionButton(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      goToQuestion(filteredQuestions.length - 1);
      focusQuestionButton(filteredQuestions.length - 1);
    }
  }

  function resetFilters() {
    setTypeFilter('all');
    setUnitFilter('all');
    setDifficultyFilter('all');
    setCalculatorFilter('all');
    setSearchText('');
  }

  function chooseRandomQuestion() {
    if (filteredQuestions.length === 0) {
      return;
    }

    const randomIndex = Math.floor(Math.random() * filteredQuestions.length);
    setSelectedQuestionId(filteredQuestions[randomIndex].id);
  }

  if (questions.length === 0) {
    return (
      <main className="empty-shell" aria-labelledby="practice-empty-heading">
        <h1 id="practice-empty-heading">PrecalcApp</h1>
        <p>No questions are available.</p>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div>
          <p className="eyebrow">AP Precalculus Practice</p>
          <h1>PrecalcApp</h1>
        </div>
        <div className="summary-strip" aria-label="Question bank summary">
          <span>{questions.length} questions</span>
          <span>{counts.mcq} MCQ</span>
          <span>{counts.frq} FRQ</span>
          <span>v{questionSetVersion}</span>
        </div>
      </header>

      <div className="workspace">
        <aside className="question-sidebar" aria-label="Question list">
          <div className="sidebar-heading">
            <ListChecks aria-hidden="true" />
            <h2>Question Bank</h2>
          </div>
          <div className="filter-panel" aria-describedby={filterStatusId}>
            <label>
              Search
              <input
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="topic, skill, tag"
                value={searchText}
              />
            </label>
            <label>
              Type
              <select
                onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}
                value={typeFilter}
              >
                <option value="all">All</option>
                <option value="mcq">MCQ</option>
                <option value="frq">FRQ</option>
              </select>
            </label>
            <label>
              Unit
              <select onChange={(event) => setUnitFilter(event.target.value)} value={unitFilter}>
                <option value="all">All units</option>
                {filterOptions.units.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Difficulty
              <select
                onChange={(event) =>
                  setDifficultyFilter(event.target.value as typeof difficultyFilter)
                }
                value={difficultyFilter}
              >
                <option value="all">All</option>
                {filterOptions.difficulties.map((difficulty) => (
                  <option key={difficulty} value={difficulty}>
                    {difficulty}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Calculator
              <select
                onChange={(event) =>
                  setCalculatorFilter(event.target.value as typeof calculatorFilter)
                }
                value={calculatorFilter}
              >
                <option value="all">All</option>
                {filterOptions.calculators.map((calculator) => (
                  <option key={calculator} value={calculator}>
                    {calculator === 'graphing' ? 'Graphing' : 'None'}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="ghost-button"
              disabled={filteredQuestions.length === 0}
              onClick={chooseRandomQuestion}
              type="button"
            >
              <Shuffle aria-hidden="true" />
              Random
            </button>
            <p className="visually-hidden" id={filterStatusId} aria-live="polite">
              {filteredQuestions.length} question{filteredQuestions.length === 1 ? '' : 's'} match
              the current filters.
            </p>
          </div>
          <div className="question-list" role="group" aria-label="Filtered questions">
            {filteredQuestions.length === 0 ? (
              <div className="empty-list-copy" role="status">
                <p>No questions match these filters.</p>
                <button className="ghost-button" onClick={resetFilters} type="button">
                  Reset filters
                </button>
              </div>
            ) : null}
            {filteredQuestions.map((question, index) => {
              const questionAttempts = attemptsByQuestionId?.get(question.id) ?? [];
              const latestAttempt = questionAttempts[0];

              return (
                <button
                  className="question-list__item"
                  data-active={question.id === currentQuestion?.id}
                  aria-current={question.id === currentQuestion?.id ? 'true' : undefined}
                  id={`${questionListId}-${index}`}
                  key={question.id}
                  onClick={() => setSelectedQuestionId(question.id)}
                  onKeyDown={(event) => handleQuestionListKeyDown(event, index)}
                  type="button"
                >
                  <span>{index + 1}</span>
                  <strong>{question.type.toUpperCase()}</strong>
                  <small>
                    {question.topic}
                    {latestAttempt
                      ? ` - ${latestAttempt.score}/${latestAttempt.maxScore} latest`
                      : ''}
                    {questionAttempts.length > 0 ? ` - ${questionAttempts.length} attempt(s)` : ''}
                  </small>
                </button>
              );
            })}
          </div>
        </aside>

        {currentQuestion ? (
          <>
            <main className="question-main">
              <section className="question-header">
                <div>
                  <p className="eyebrow">
                    Question {currentIndex + 1} of {filteredQuestions.length}
                  </p>
                  <h2>{currentQuestion.skill}</h2>
                </div>
                <QuestionMeta question={currentQuestion} />
              </section>

              <section className="prompt-panel">
                <MathText block text={currentQuestion.prompt} />
                <QuestionAssetGallery
                  ariaLabel="Question images and graphs"
                  assets={currentQuestion.assets}
                />
              </section>

              {currentQuestion.type === 'mcq' ? (
                <McqPractice
                  key={currentQuestion.id}
                  onSubmitAttempt={(selectedChoiceId, startedAt) =>
                    onSaveMcqAttempt?.(currentQuestion, selectedChoiceId, startedAt)
                  }
                  question={currentQuestion}
                />
              ) : (
                <FrqPractice
                  key={currentQuestion.id}
                  onSubmitAttempt={(
                    partResponses,
                    earnedPointsByCriterion,
                    startedAt,
                    attemptId,
                    submittedAt,
                  ) =>
                    onSaveFrqAttempt?.(
                      currentQuestion,
                      partResponses,
                      earnedPointsByCriterion,
                      startedAt,
                      attemptId,
                      submittedAt,
                    )
                  }
                  question={currentQuestion}
                />
              )}

              <section className="solution-panel" id={solutionPanelId}>
                <div className="solution-panel__header">
                  <h2>{explanationHeading}</h2>
                  <button
                    className="ghost-button"
                    aria-controls={solutionBodyId}
                    aria-expanded={isExplanationVisible}
                    onClick={() => {
                      if (isExplanationVisible) {
                        setRevealedExplanationQuestionId(null);
                        setVisibleVideoQuestionId(null);
                        return;
                      }

                      setRevealedExplanationQuestionId(currentQuestion.id);
                    }}
                    type="button"
                  >
                    {isExplanationVisible ? (
                      <EyeOff aria-hidden="true" />
                    ) : (
                      <Eye aria-hidden="true" />
                    )}
                    {isExplanationVisible ? hideExplanationLabel : showExplanationLabel}
                  </button>
                </div>

                {isExplanationVisible ? (
                  <div
                    className="solution-panel__body"
                    id={solutionBodyId}
                    ref={solutionBodyRef}
                    tabIndex={-1}
                  >
                    <MathText block text={currentQuestion.explanation.summary} />
                    <ol>
                      {currentQuestion.explanation.steps.map((step) => (
                        <li key={step}>
                          <MathText text={step} />
                        </li>
                      ))}
                    </ol>
                    <QuestionAssetGallery
                      ariaLabel="Solution images and graphs"
                      assets={currentQuestion.explanation.assets}
                    />
                    {currentQuestion.explanation.video ? (
                      <>
                        <div className="solution-panel__video-actions">
                          <button
                            className="ghost-button"
                            aria-controls={videoPanelId}
                            aria-expanded={isVideoVisible}
                            onClick={() =>
                              setVisibleVideoQuestionId(isVideoVisible ? null : currentQuestion.id)
                            }
                            type="button"
                          >
                            <Video aria-hidden="true" />
                            {isVideoVisible ? 'Hide Video Explanation' : 'Open Video Explanation'}
                          </button>
                        </div>
                        {isVideoVisible ? (
                          <VideoExplanation
                            className="solution-panel__video"
                            title={`${currentQuestion.skill} video explanation`}
                            video={currentQuestion.explanation.video}
                            id={videoPanelId}
                          />
                        ) : null}
                      </>
                    ) : null}
                  </div>
                ) : (
                  <p className="solution-panel__placeholder" id={solutionBodyId}>
                    {isCurrentFrq
                      ? 'Use the FRQ self-score panel for sample responses and expected work, then reveal the full explanation when you are ready to compare your solution.'
                      : 'Reveal the answer explanation when you are ready to compare your work.'}
                  </p>
                )}
              </section>

              <nav className="question-nav" aria-label="Question navigation">
                <button
                  className="ghost-button"
                  disabled={currentIndex === 0}
                  onClick={() => goToQuestion(currentIndex - 1)}
                  type="button"
                >
                  <ChevronLeft aria-hidden="true" />
                  Previous
                </button>
                <button
                  className="primary-button"
                  disabled={currentIndex === filteredQuestions.length - 1}
                  onClick={() => goToQuestion(currentIndex + 1)}
                  type="button"
                >
                  Next
                  <ChevronRight aria-hidden="true" />
                </button>
              </nav>
            </main>

            <CalculatorPanel policy={currentQuestion.calculator} />
          </>
        ) : (
          <main className="question-main">
            <section className="prompt-panel">
              <h2>No Matching Questions</h2>
              <p>Adjust the filters to bring questions back into the practice queue.</p>
            </section>
          </main>
        )}
      </div>
    </div>
  );
}
