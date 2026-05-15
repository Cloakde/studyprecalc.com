import {
  ArrowRight,
  BookOpenCheck,
  Calculator,
  CheckCircle2,
  Eye,
  Gauge,
  Layers3,
  ListChecks,
  type LucideIcon,
  RotateCcw,
  BarChart3,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';

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

type UnitKind = 'poly' | 'exp' | 'trig' | 'param';

type UnitCard = {
  num: string;
  title: string;
  topics: string;
  kind: UnitKind;
};

const units: UnitCard[] = [
  {
    num: '1',
    title: 'Polynomial & Rational Functions',
    topics: 'End behavior · zeros · asymptotes',
    kind: 'poly',
  },
  {
    num: '2',
    title: 'Exponential & Logarithmic Functions',
    topics: 'Growth · decay · log rules',
    kind: 'exp',
  },
  {
    num: '3',
    title: 'Trigonometric & Polar Functions',
    topics: 'Sinusoids · identities · polar coords',
    kind: 'trig',
  },
  {
    num: '4',
    title: 'Functions, Vectors & Matrices',
    topics: 'Parametric · vector motion · matrices',
    kind: 'param',
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

/* ──────────────────────────────────────────────────────────────
 * Plotted-curve helpers — produce real SVG paths from f(x) over a
 * coordinate range. Used by the hero background and unit cards so
 * the visuals are the same math families students will practice.
 * ────────────────────────────────────────────────────────────── */
type PlotRange = {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  w: number;
  h: number;
};

function plotPath(fn: (x: number) => number, range: PlotRange, step = 0.1): string {
  const { xMin, xMax, yMin, yMax, w, h } = range;
  const sx = (x: number) => ((x - xMin) / (xMax - xMin)) * w;
  const sy = (y: number) => h - ((y - yMin) / (yMax - yMin)) * h;
  let d = '';
  let pen = false;
  for (let x = xMin; x <= xMax + 1e-9; x += step) {
    const y = fn(x);
    if (!Number.isFinite(y) || y < yMin - 50 || y > yMax + 50) {
      pen = false;
      continue;
    }
    d += `${pen ? ' L ' : ' M '}${sx(x).toFixed(2)} ${sy(y).toFixed(2)}`;
    pen = true;
  }
  return d.trim();
}

function HeroBackground() {
  const { W, H, ox, oy, parab, sin, log } = useMemo(() => {
    const width = 1440;
    const height = 800;
    const range: PlotRange = {
      xMin: -18,
      xMax: 18,
      yMin: -10,
      yMax: 10,
      w: width,
      h: height,
    };

    return {
      W: width,
      H: height,
      ox: ((0 - range.xMin) / (range.xMax - range.xMin)) * width,
      oy: height - ((0 - range.yMin) / (range.yMax - range.yMin)) * height,
      parab: plotPath((x) => 0.12 * (x + 4) * (x + 4) - 6, range, 0.1),
      sin: plotPath((x) => 3 * Math.sin(x * 0.7), range, 0.08),
      log: plotPath((x) => Math.log(x + 6) * 2.4 - 1, range, 0.05),
    };
  }, []);

  return (
    <div className="home-hero__bg" aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="hero-grid-minor" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(15,118,110,0.07)" strokeWidth="1" />
          </pattern>
          <pattern id="hero-grid-major" width="120" height="120" patternUnits="userSpaceOnUse">
            <path
              d="M 120 0 L 0 0 0 120"
              fill="none"
              stroke="rgba(15,118,110,0.12)"
              strokeWidth="1"
            />
          </pattern>
          <radialGradient id="hero-fade" cx="50%" cy="40%" r="70%">
            <stop offset="0" stopColor="white" stopOpacity="0" />
            <stop offset="0.7" stopColor="white" stopOpacity="0.3" />
            <stop offset="1" stopColor="#f5f7fb" stopOpacity="1" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-grid-minor)" />
        <rect width="100%" height="100%" fill="url(#hero-grid-major)" />
        <line x1="0" y1={oy} x2={W} y2={oy} stroke="rgba(23,32,51,0.18)" strokeWidth="1.2" />
        <line x1={ox} y1="0" x2={ox} y2={H} stroke="rgba(23,32,51,0.18)" strokeWidth="1.2" />
        <path
          d={parab}
          fill="none"
          stroke="#0f766e"
          strokeOpacity="0.55"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d={sin}
          fill="none"
          stroke="#f97316"
          strokeOpacity="0.45"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d={log}
          fill="none"
          stroke="#2563eb"
          strokeOpacity="0.4"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <rect width="100%" height="100%" fill="url(#hero-fade)" />
      </svg>
    </div>
  );
}

function UnitPlot({ kind }: { kind: UnitKind }) {
  const W = 160;
  const H = 110;
  const range: PlotRange = { xMin: -5, xMax: 5, yMin: -5, yMax: 5, w: W, h: H };
  let d = '';
  let color = '#0f766e';
  if (kind === 'poly') {
    d = plotPath((x) => 0.18 * x * x * x - 0.8 * x, range);
    color = '#0f766e';
  } else if (kind === 'exp') {
    d = plotPath((x) => Math.pow(1.55, x) - 2, range);
    color = '#f97316';
  } else if (kind === 'trig') {
    d = plotPath((x) => 2.5 * Math.sin(x * 1.1), range);
    color = '#2563eb';
  } else {
    // Lissajous (3:2) — represents Unit 4 parametric / vector motion.
    const sx = (x: number) => ((x - range.xMin) / (range.xMax - range.xMin)) * W;
    const sy = (y: number) => H - ((y - range.yMin) / (range.yMax - range.yMin)) * H;
    const parts: string[] = [];
    for (let t = 0; t <= Math.PI * 2 + 0.01; t += 0.04) {
      const x = 3 * Math.sin(3 * t + Math.PI / 2);
      const y = 2.6 * Math.sin(2 * t);
      parts.push(`${parts.length ? 'L' : 'M'} ${sx(x).toFixed(2)} ${sy(y).toFixed(2)}`);
    }
    d = parts.join(' ');
    color = '#0f766e';
  }
  const ox = ((0 - range.xMin) / (range.xMax - range.xMin)) * W;
  const oy = H - ((0 - range.yMin) / (range.yMax - range.yMin)) * H;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <defs>
        <pattern id={`unit-grid-${kind}`} width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M 16 0 L 0 0 0 16" fill="none" stroke="rgba(15,118,110,0.13)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#unit-grid-${kind})`} />
      <line x1="0" y1={oy} x2={W} y2={oy} stroke="rgba(23,32,51,0.25)" strokeWidth="1" />
      <line x1={ox} y1="0" x2={ox} y2={H} stroke="rgba(23,32,51,0.25)" strokeWidth="1" />
      <path d={d} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Live AP-styled question preview shown on the hero right side. */
function HeroQuestionPreview() {
  return (
    <aside className="home-hero__qpanel" aria-label="Sample question preview">
      <div className="home-hero__qpanel-head">
        <div>
          <p className="eyebrow">Unit 1 · Polynomials</p>
          <h3>End behavior</h3>
        </div>
        <span className="home-hero__qpanel-chip">
          <span className="home-hero__qpanel-dot" aria-hidden="true" />
          Live preview
        </span>
      </div>
      <div className="home-hero__qpanel-body">
        <div className="home-hero__qpanel-prompt">
          <span className="home-hero__qpanel-num">1</span>
          <span>
            As <em>x</em> → ∞, what is the end behavior of <em>g</em>(<em>x</em>) = −2<em>x</em>
            <sup>4</sup> + 7<em>x</em>?
          </span>
        </div>
      </div>
      <ol className="home-hero__qpanel-choices">
        {[
          { id: 'A', text: 'g(x) → ∞' },
          { id: 'B', text: 'g(x) → −∞', correct: true },
          { id: 'C', text: 'g(x) → 0' },
          { id: 'D', text: 'g(x) oscillates' },
        ].map((c) => (
          <li
            className="home-hero__qpanel-choice"
            data-correct={c.correct ? 'true' : 'false'}
            key={c.id}
          >
            <span className="home-hero__qpanel-letter">{c.id}</span>
            <span className="home-hero__qpanel-text">{c.text}</span>
            {c.correct ? <span className="home-hero__qpanel-badge">✓ Correct</span> : null}
          </li>
        ))}
      </ol>
      <div className="home-hero__qpanel-foot">
        <span>
          Calculator: <strong>Not allowed</strong>
        </span>
        <span>
          Skill: <strong>Read end behavior</strong>
        </span>
      </div>
    </aside>
  );
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
          <a href="#features">Why us</a>
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
        <HeroBackground />
        <div className="home-hero__copy">
          <p className="eyebrow home-hero__eyebrow">AP Precalculus practice · invite-only</p>
          <h1 className="home-hero__title">
            Practice AP Precalculus skills, with the work shown.
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
        </div>

        <HeroQuestionPreview />
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
              <div className="home-unit__plot" aria-hidden="true">
                <UnitPlot kind={unit.kind} />
              </div>
              <span className="home-unit__num">
                <span className="home-unit__badge">{unit.num.padStart(2, '0')}</span>
                Unit {unit.num}
              </span>
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
