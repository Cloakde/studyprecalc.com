import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Calculator,
  CheckCircle2,
  Clock3,
  Eye,
  Gauge,
  Layers3,
  ListChecks,
  type LucideIcon,
  RotateCcw,
  Target,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';

type HomeProps = {
  onGetStarted: () => void;
  onSignIn: () => void;
};

type SampleDifficulty = 'Easy' | 'Medium' | 'Hard';

type SampleChoice = { id: 'A' | 'B' | 'C' | 'D'; text: string };

type SampleQuestion = {
  unit: string;
  topic: string;
  skill: string;
  calculator: string;
  prompt: string;
  choices: SampleChoice[];
  correct: SampleChoice['id'];
  hint: { right: string; wrong: string };
};

const samples: Record<SampleDifficulty, SampleQuestion> = {
  Easy: {
    unit: 'Unit 1 — Polynomial & Rational Functions',
    topic: 'End behavior',
    skill: 'Read end behavior',
    calculator: 'Not allowed',
    prompt: 'As x → ∞, what is the end behavior of g(x) = −2x⁴ + 7x?',
    choices: [
      { id: 'A', text: 'g(x) → ∞' },
      { id: 'B', text: 'g(x) → −∞' },
      { id: 'C', text: 'g(x) → 0' },
      { id: 'D', text: 'g(x) oscillates' },
    ],
    correct: 'B',
    hint: {
      right: 'Nice — the leading term −2x⁴ has even degree and a negative coefficient.',
      wrong: 'Check the leading term: even degree, negative coefficient.',
    },
  },
  Medium: {
    unit: 'Unit 1 — Polynomial & Rational Functions',
    topic: 'Polynomial roots',
    skill: 'Identify zeros',
    calculator: 'Not allowed',
    prompt: 'The polynomial f(x) = (x − 2)(x + 3)(x − 5) has zeros at which set of values?',
    choices: [
      { id: 'A', text: '{ −5, −3, 2 }' },
      { id: 'B', text: '{ −3, 2, 5 }' },
      { id: 'C', text: '{ −2, 3, 5 }' },
      { id: 'D', text: '{ 2, 3, 5 }' },
    ],
    correct: 'B',
    hint: {
      right: 'Nice — set every factor to zero and solve.',
      wrong: 'Set each factor of the polynomial to zero and solve.',
    },
  },
  Hard: {
    unit: 'Unit 2 — Exponential & Logarithmic Functions',
    topic: 'Exponential decay',
    skill: 'Half-life',
    calculator: 'Allowed',
    prompt:
      'A substance decays with half-life 12 years. What fraction of the original amount remains after 36 years?',
    choices: [
      { id: 'A', text: '1/3' },
      { id: 'B', text: '1/6' },
      { id: 'C', text: '1/8' },
      { id: 'D', text: '1/12' },
    ],
    correct: 'C',
    hint: {
      right: 'Yes — 36 ÷ 12 = 3 half-lives, so (1/2)³ = 1/8.',
      wrong: 'Count the half-lives: 36 ÷ 12 = 3, then halve three times.',
    },
  },
};

type Feature = { icon: LucideIcon; title: string; body: string };

const features: Feature[] = [
  {
    icon: ListChecks,
    title: 'Multiple choice & free response',
    body: 'Build practice sets for AP-style MCQs and FRQs, including explanations and structured rubrics when authored.',
  },
  {
    icon: BookOpenCheck,
    title: 'Solution-first authoring',
    body: 'Questions can include worked solutions, images, and optional video links so review stays connected to the prompt.',
  },
  {
    icon: Calculator,
    title: 'Built-in Desmos calculator',
    body: 'The graphing calculator panel sits beside the question for any prompt where it is allowed.',
  },
  {
    icon: BarChart3,
    title: 'Progress dashboard',
    body: 'Saved attempts and sessions roll up into a dashboard once students start working through assigned content.',
  },
];

type UnitCard = { num: string; title: string; topics: string };

const units: UnitCard[] = [
  {
    num: '1',
    title: 'Polynomial & Rational Functions',
    topics: 'End behavior · zeros · asymptotes',
  },
  {
    num: '2',
    title: 'Exponential & Logarithmic Functions',
    topics: 'Growth · decay · log rules',
  },
  {
    num: '3',
    title: 'Trigonometric & Polar Functions',
    topics: 'Sinusoids · identities · polar coords',
  },
  {
    num: '4',
    title: 'Functions, Vectors & Matrices',
    topics: 'Parametric · vector motion · matrices',
  },
];

const difficulties: SampleDifficulty[] = ['Easy', 'Medium', 'Hard'];

function scrollToSample() {
  const el = document.getElementById('sample');
  if (el) {
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - 24,
      behavior: 'smooth',
    });
  }
}

export function Home({ onGetStarted, onSignIn }: HomeProps) {
  const [sampleDifficulty, setSampleDifficulty] = useState<SampleDifficulty>('Medium');
  const [sampleSelected, setSampleSelected] = useState<SampleChoice['id'] | null>(null);
  const [sampleSubmitted, setSampleSubmitted] = useState<SampleChoice['id'] | null>(null);

  const sampleQ = samples[sampleDifficulty];
  const isCorrect = sampleSubmitted !== null && sampleSubmitted === sampleQ.correct;

  function resetSample(nextDifficulty: SampleDifficulty) {
    setSampleDifficulty(nextDifficulty);
    setSampleSelected(null);
    setSampleSubmitted(null);
  }

  return (
    <div className="home">
      <header className="home-nav">
        <a className="home-brand" href="#top">
          <span className="home-brand__monogram" aria-hidden="true">
            SP
          </span>
          <span className="home-brand__word">
            Study<span style={{ color: '#0f766e' }}>Precalc</span>
          </span>
        </a>
        <nav className="home-nav__links" aria-label="Primary">
          <a href="#features">Features</a>
          <a href="#units">Units</a>
          <a href="#sample">Try it</a>
        </nav>
        <div className="home-nav__cta">
          <button className="ghost-button" type="button" onClick={onSignIn}>
            Sign in
          </button>
          <button className="primary-button" type="button" onClick={onGetStarted}>
            Get started
          </button>
        </div>
      </header>

      <section className="home-hero" id="top">
        <div className="home-hero__bg" aria-hidden="true" />
        <div className="home-hero__copy">
          <p className="eyebrow home-hero__eyebrow">AP Precalculus practice · invite-only</p>
          <h1 className="home-hero__title">
            Practice AP&nbsp;Precalculus skills, with the work shown.
          </h1>
          <p className="home-hero__sub">
            Build multiple choice and free response practice in one focused study environment. Track
            your attempts, surface weak units, and review the reasoning behind each authored
            question.
          </p>
          <div className="home-hero__ctas">
            <button className="primary-button home-cta-lg" type="button" onClick={onGetStarted}>
              Start practicing <ArrowRight aria-hidden="true" />
            </button>
            <button className="ghost-button home-cta-lg" type="button" onClick={scrollToSample}>
              <Eye aria-hidden="true" size={18} /> Try a sample question
            </button>
          </div>
          <div className="home-hero__chips">
            <span>4 AP Precalc units</span>
            <span>MCQ + FRQ</span>
            <span>Desmos built in</span>
          </div>
        </div>

        <aside className="home-hero__panel" aria-label="Study dashboard feature preview">
          <div className="home-hero__panel-head">
            <div>
              <p className="eyebrow">Student dashboard</p>
              <h3>Practice signals</h3>
            </div>
            <span className="home-hero__live">
              <span className="home-hero__live-dot" aria-hidden="true" />
              Ready
            </span>
          </div>
          <div className="home-hero__stats">
            <article className="home-stat">
              <BarChart3 aria-hidden="true" size={22} />
              <strong>Scores</strong>
              <span>Session summaries</span>
            </article>
            <article className="home-stat">
              <Target aria-hidden="true" size={22} />
              <strong>Units</strong>
              <span>Weak spots</span>
            </article>
            <article className="home-stat">
              <Clock3 aria-hidden="true" size={22} />
              <strong>Timer</strong>
              <span>Session pacing</span>
            </article>
            <article className="home-stat">
              <BookOpenCheck aria-hidden="true" size={22} />
              <strong>Review</strong>
              <span>Saved attempts</span>
            </article>
          </div>
          <div className="home-hero__sparkline">
            <div className="home-hero__sparkline-head">
              <p className="eyebrow" style={{ margin: 0 }}>
                Progress view
              </p>
              <strong>Trend</strong>
            </div>
            <svg viewBox="0 0 280 120" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#0f766e" stopOpacity="0.55" />
                  <stop offset="0.6" stopColor="#0f766e" stopOpacity="0.18" />
                  <stop offset="1" stopColor="#0f766e" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="spark-line" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0" stopColor="#14b8a6" />
                  <stop offset="0.7" stopColor="#0f766e" />
                  <stop offset="1" stopColor="#f97316" />
                </linearGradient>
                <filter id="spark-glow" x="-20%" y="-40%" width="140%" height="180%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <line
                x1="0"
                x2="280"
                y1="100"
                y2="100"
                stroke="#e5eaf1"
                strokeWidth="1"
                strokeDasharray="2 4"
              />
              <path
                d="M0,90 C30,86 50,72 70,70 C92,68 110,84 134,78 C158,72 174,46 200,38 C224,30 248,52 280,28 L280,120 L0,120 Z"
                fill="url(#spark-fill)"
              />
              <path
                d="M0,90 C30,86 50,72 70,70 C92,68 110,84 134,78 C158,72 174,46 200,38 C224,30 248,52 280,28"
                fill="none"
                stroke="url(#spark-line)"
                strokeWidth="3"
                strokeLinecap="round"
                filter="url(#spark-glow)"
              />
              <circle cx="280" cy="28" r="9" fill="#f97316" opacity="0.18" />
              <circle cx="280" cy="28" r="4" fill="#f97316" stroke="#ffffff" strokeWidth="2" />
            </svg>
          </div>
        </aside>
      </section>

      <section className="home-band" aria-label="Practice workflow features">
        <div className="home-band__inner">
          <div className="home-band__cell">
            <span className="home-band__num">Author</span>
            <span className="home-band__label">Original question banks</span>
          </div>
          <div className="home-band__cell">
            <span className="home-band__num">Units</span>
            <span className="home-band__label">Aligned to AP Precalc</span>
          </div>
          <div className="home-band__cell">
            <span className="home-band__num">MCQ</span>
            <span className="home-band__label">Plus free response support</span>
          </div>
          <div className="home-band__cell">
            <span className="home-band__num">Review</span>
            <span className="home-band__label">Explanations when authored</span>
          </div>
        </div>
      </section>

      <section className="home-features" id="features">
        <header className="home-section__head">
          <p className="eyebrow">What&rsquo;s inside</p>
          <h2>Tools for a focused practice workflow</h2>
        </header>
        <div className="home-features__grid">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article className="home-feature" key={feature.title}>
                <div className="home-feature__icon">
                  <Icon aria-hidden="true" size={22} />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="home-sample" id="sample">
        <header className="home-section__head home-sample__head">
          <div>
            <p className="eyebrow">Try it</p>
            <h2>Sample question</h2>
          </div>
          <div className="home-sample__difficulty" role="group" aria-label="Sample difficulty">
            <span className="home-sample__difficulty-label">Difficulty</span>
            {difficulties.map((label) => (
              <button
                key={label}
                aria-pressed={sampleDifficulty === label}
                data-active={sampleDifficulty === label}
                onClick={() => resetSample(label)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </header>
        <div className="home-sample__card">
          <div
            className="question-header"
            style={{
              borderRadius: 0,
              borderLeft: 0,
              borderRight: 0,
              borderTop: 0,
              borderBottom: '1px solid #e5eaf1',
            }}
          >
            <div>
              <p className="eyebrow">{sampleQ.unit}</p>
              <h2>{sampleQ.topic}</h2>
            </div>
            <dl className="meta-grid">
              <div className="meta-item">
                <Layers3 aria-hidden="true" size={18} />
                <dt>Skill</dt>
                <dd>{sampleQ.skill}</dd>
              </div>
              <div className="meta-item">
                <Gauge aria-hidden="true" size={18} />
                <dt>Difficulty</dt>
                <dd>{sampleDifficulty}</dd>
              </div>
              <div className="meta-item">
                <Calculator aria-hidden="true" size={18} />
                <dt>Calculator</dt>
                <dd>{sampleQ.calculator}</dd>
              </div>
            </dl>
          </div>
          <section className="prompt-panel" style={{ border: 0, borderRadius: 0 }}>
            <p className="eyebrow">Prompt</p>
            <div className="math-copy" style={{ fontSize: '1.05rem', fontWeight: 600 }}>
              {sampleQ.prompt}
            </div>
          </section>
          <div className="response-area" style={{ borderTop: '1px solid #e5eaf1' }}>
            <fieldset className="choice-list" disabled={sampleSubmitted !== null}>
              <legend>Choices</legend>
              {sampleQ.choices.map((choice) => {
                const checked = sampleSelected === choice.id;
                const correctRow = sampleSubmitted !== null && sampleQ.correct === choice.id;
                const wrongRow = sampleSubmitted === choice.id && !correctRow;
                return (
                  <label
                    className="choice-option"
                    key={choice.id}
                    data-checked={checked}
                    data-correct={correctRow}
                    data-incorrect={wrongRow}
                  >
                    <input
                      type="radio"
                      name="home-sample"
                      checked={checked}
                      onChange={() => setSampleSelected(choice.id)}
                    />
                    <span className="choice-option__letter">{choice.id}</span>
                    <span className="choice-option__text">{choice.text}</span>
                  </label>
                );
              })}
            </fieldset>
            <div className="action-row">
              <button
                className="primary-button"
                disabled={!sampleSelected || sampleSubmitted !== null}
                onClick={() => setSampleSubmitted(sampleSelected)}
                type="button"
              >
                Submit
              </button>
              <button
                className="ghost-button"
                disabled={sampleSubmitted === null}
                onClick={() => {
                  setSampleSelected(null);
                  setSampleSubmitted(null);
                }}
                type="button"
              >
                <RotateCcw aria-hidden="true" />
                Reset
              </button>
            </div>
            {sampleSubmitted !== null ? (
              <div className="result-banner" data-correct={isCorrect}>
                {isCorrect ? (
                  <CheckCircle2 aria-hidden="true" size={20} />
                ) : (
                  <XCircle aria-hidden="true" size={20} />
                )}
                <strong>{isCorrect ? 'Correct' : 'Incorrect'}</strong>
                <span>{isCorrect ? sampleQ.hint.right : sampleQ.hint.wrong}</span>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="home-units" id="units">
        <header className="home-section__head">
          <p className="eyebrow">Coverage</p>
          <h2>All four AP Precalc units</h2>
        </header>
        <div className="home-units__grid">
          {units.map((unit) => (
            <article className="home-unit" key={unit.num}>
              <span className="home-unit__big" aria-hidden="true">
                {unit.num.padStart(2, '0')}
              </span>
              <span className="home-unit__num">Unit {unit.num}</span>
              <strong>{unit.title}</strong>
              <small>{unit.topics}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="home-cta">
        <div>
          <p className="eyebrow">Ready when you are</p>
          <h2>Build your AP Precalc workspace.</h2>
          <p>
            Sign in with your invite code and use the practice tools your instructor has prepared.
          </p>
        </div>
        <div className="home-cta__buttons">
          <button className="primary-button" onClick={onGetStarted} type="button">
            Get started <ArrowRight aria-hidden="true" />
          </button>
          <button className="ghost-button" onClick={onSignIn} type="button">
            I already have an account
          </button>
        </div>
      </section>

      <footer className="home-footer">
        <span>Study Precalc · AP Precalculus practice</span>
        <span>Invite-only · contact your instructor for a code</span>
      </footer>
    </div>
  );
}
