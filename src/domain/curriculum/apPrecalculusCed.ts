export const apPrecalculusCedMetadata = {
  courseTitle: 'AP Precalculus',
  version: 'fall-2023',
  sourceLabel: 'AP Precalculus Course and Exam Description, Fall 2023',
} as const;

export const apPrecalculusUnitIds = ['unit-1', 'unit-2', 'unit-3', 'unit-4'] as const;

export type ApPrecalculusUnitId = (typeof apPrecalculusUnitIds)[number];
export type ApPrecalculusUnitNumber = 1 | 2 | 3 | 4;

export type ApPrecalculusCedUnit = {
  id: ApPrecalculusUnitId;
  number: ApPrecalculusUnitNumber;
  title: string;
  assessedOnApExam: boolean;
  aliases: readonly string[];
};

export const apPrecalculusUnits: readonly ApPrecalculusCedUnit[] = Object.freeze([
  {
    id: 'unit-1',
    number: 1,
    title: 'Polynomial and Rational Functions',
    assessedOnApExam: true,
    aliases: ['u1', 'unit 1', 'unit-1', 'polynomial & rational functions'],
  },
  {
    id: 'unit-2',
    number: 2,
    title: 'Exponential and Logarithmic Functions',
    assessedOnApExam: true,
    aliases: ['u2', 'unit 2', 'unit-2', 'exponential & logarithmic functions'],
  },
  {
    id: 'unit-3',
    number: 3,
    title: 'Trigonometric and Polar Functions',
    assessedOnApExam: true,
    aliases: ['u3', 'unit 3', 'unit-3', 'trigonometric & polar functions'],
  },
  {
    id: 'unit-4',
    number: 4,
    title: 'Functions Involving Parameters, Vectors, and Matrices',
    assessedOnApExam: false,
    aliases: [
      'u4',
      'unit 4',
      'unit-4',
      'functions involving parameters vectors and matrices',
      'parameters vectors and matrices',
    ],
  },
]);

type TopicSeedInput = {
  code: string;
  title: string;
  unitId: ApPrecalculusUnitId;
  aliases?: readonly string[];
};

const topicSeeds = [
  { code: '1.1', title: 'Change in Tandem', unitId: 'unit-1' },
  { code: '1.2', title: 'Rates of Change', unitId: 'unit-1' },
  { code: '1.3', title: 'Rates of Change in Linear and Quadratic Functions', unitId: 'unit-1' },
  { code: '1.4', title: 'Polynomial Functions and Rates of Change', unitId: 'unit-1' },
  { code: '1.5', title: 'Polynomial Functions and Complex Zeros', unitId: 'unit-1' },
  { code: '1.6', title: 'Polynomial Functions and End Behavior', unitId: 'unit-1' },
  { code: '1.7', title: 'Rational Functions and End Behavior', unitId: 'unit-1' },
  { code: '1.8', title: 'Rational Functions and Zeros', unitId: 'unit-1' },
  { code: '1.9', title: 'Rational Functions and Vertical Asymptotes', unitId: 'unit-1' },
  { code: '1.10', title: 'Rational Functions and Holes', unitId: 'unit-1' },
  {
    code: '1.11',
    title: 'Equivalent Representations of Polynomial and Rational Expressions',
    unitId: 'unit-1',
  },
  { code: '1.12', title: 'Transformations of Functions', unitId: 'unit-1' },
  { code: '1.13', title: 'Function Model Selection and Assumption Articulation', unitId: 'unit-1' },
  { code: '1.14', title: 'Function Model Construction and Application', unitId: 'unit-1' },

  { code: '2.1', title: 'Change in Arithmetic and Geometric Sequences', unitId: 'unit-2' },
  { code: '2.2', title: 'Change in Linear and Exponential Functions', unitId: 'unit-2' },
  { code: '2.3', title: 'Exponential Functions', unitId: 'unit-2' },
  { code: '2.4', title: 'Exponential Function Manipulation', unitId: 'unit-2' },
  {
    code: '2.5',
    title: 'Exponential Function Context and Data Modeling',
    unitId: 'unit-2',
    aliases: ['exponential model interpretation'],
  },
  { code: '2.6', title: 'Competing Function Model Validation', unitId: 'unit-2' },
  { code: '2.7', title: 'Composition of Functions', unitId: 'unit-2' },
  { code: '2.8', title: 'Inverse Functions', unitId: 'unit-2' },
  { code: '2.9', title: 'Logarithmic Expressions', unitId: 'unit-2' },
  { code: '2.10', title: 'Inverses of Exponential Functions', unitId: 'unit-2' },
  { code: '2.11', title: 'Logarithmic Functions', unitId: 'unit-2' },
  { code: '2.12', title: 'Logarithmic Function Manipulation', unitId: 'unit-2' },
  {
    code: '2.13',
    title: 'Exponential and Logarithmic Equations and Inequalities',
    unitId: 'unit-2',
  },
  { code: '2.14', title: 'Logarithmic Function Context and Data Modeling', unitId: 'unit-2' },
  { code: '2.15', title: 'Semi-log Plots', unitId: 'unit-2' },

  { code: '3.1', title: 'Periodic Phenomena', unitId: 'unit-3' },
  { code: '3.2', title: 'Sine, Cosine, and Tangent', unitId: 'unit-3' },
  { code: '3.3', title: 'Sine and Cosine Function Values', unitId: 'unit-3' },
  { code: '3.4', title: 'Sine and Cosine Function Graphs', unitId: 'unit-3' },
  { code: '3.5', title: 'Sinusoidal Functions', unitId: 'unit-3' },
  { code: '3.6', title: 'Sinusoidal Function Transformations', unitId: 'unit-3' },
  { code: '3.7', title: 'Sinusoidal Function Context and Data Modeling', unitId: 'unit-3' },
  { code: '3.8', title: 'The Tangent Function', unitId: 'unit-3' },
  { code: '3.9', title: 'Inverse Trigonometric Functions', unitId: 'unit-3' },
  { code: '3.10', title: 'Trigonometric Equations and Inequalities', unitId: 'unit-3' },
  {
    code: '3.11',
    title: 'The Secant, Cosecant, and Cotangent Functions',
    unitId: 'unit-3',
    aliases: ['secant cosecant cotangent functions'],
  },
  {
    code: '3.12',
    title: 'Equivalent Representations of Trigonometric Functions',
    unitId: 'unit-3',
  },
  { code: '3.13', title: 'Trigonometry and Polar Coordinates', unitId: 'unit-3' },
  { code: '3.14', title: 'Polar Function Graphs', unitId: 'unit-3' },
  { code: '3.15', title: 'Rates of Change in Polar Functions', unitId: 'unit-3' },

  { code: '4.1', title: 'Parametric Functions', unitId: 'unit-4' },
  { code: '4.2', title: 'Parametric Functions Modeling Planar Motion', unitId: 'unit-4' },
  { code: '4.3', title: 'Parametric Functions and Rates of Change', unitId: 'unit-4' },
  { code: '4.4', title: 'Parametrically Defined Circles and Lines', unitId: 'unit-4' },
  { code: '4.5', title: 'Implicitly Defined Functions', unitId: 'unit-4' },
  { code: '4.6', title: 'Conic Sections', unitId: 'unit-4' },
  { code: '4.7', title: 'Parametrization of Implicitly Defined Functions', unitId: 'unit-4' },
  { code: '4.8', title: 'Vectors', unitId: 'unit-4' },
  { code: '4.9', title: 'Vector-Valued Functions', unitId: 'unit-4' },
  { code: '4.10', title: 'Matrices', unitId: 'unit-4' },
  { code: '4.11', title: 'The Inverse and Determinant of a Matrix', unitId: 'unit-4' },
  { code: '4.12', title: 'Linear Transformations and Matrices', unitId: 'unit-4' },
  { code: '4.13', title: 'Matrices as Functions', unitId: 'unit-4' },
  { code: '4.14', title: 'Matrices Modeling Contexts', unitId: 'unit-4' },
] as const satisfies readonly TopicSeedInput[];

export type ApPrecalculusTopicCode = (typeof topicSeeds)[number]['code'];

export type ApPrecalculusCedTopic = {
  code: ApPrecalculusTopicCode;
  title: string;
  unitId: ApPrecalculusUnitId;
  unitTitle: string;
  assessedOnApExam: boolean;
  aliases: readonly string[];
};

export type ApPrecalculusUnitTopicCounts = Record<ApPrecalculusUnitId, number>;

export const apPrecalculusTopicCodes: readonly ApPrecalculusTopicCode[] = Object.freeze(
  topicSeeds.map((topic) => topic.code),
);

const apPrecalculusUnitById = new Map<ApPrecalculusUnitId, ApPrecalculusCedUnit>(
  apPrecalculusUnits.map((unit) => [unit.id, unit]),
);

function requireUnit(unitId: ApPrecalculusUnitId): ApPrecalculusCedUnit {
  const unit = apPrecalculusUnitById.get(unitId);

  if (!unit) {
    throw new Error(`Unknown AP Precalculus unit: ${unitId}`);
  }

  return unit;
}

type TopicSeed = (typeof topicSeeds)[number];

function getDefaultTopicAliases(topic: TopicSeed): readonly string[] {
  const dashedCode = topic.code.replace('.', '-');

  return [
    topic.code,
    dashedCode,
    `topic ${topic.code}`,
    `topic ${dashedCode}`,
    topic.title,
    `${topic.code} ${topic.title}`,
  ];
}

function createTopic(topic: TopicSeed): ApPrecalculusCedTopic {
  const unit = requireUnit(topic.unitId);
  const aliases = 'aliases' in topic ? topic.aliases : [];

  return {
    code: topic.code,
    title: topic.title,
    unitId: unit.id,
    unitTitle: unit.title,
    assessedOnApExam: unit.assessedOnApExam,
    aliases: Object.freeze([...getDefaultTopicAliases(topic), ...aliases]),
  };
}

export const apPrecalculusTopics: readonly ApPrecalculusCedTopic[] = Object.freeze(
  topicSeeds.map(createTopic),
);

const apPrecalculusTopicCodeSet = new Set<ApPrecalculusTopicCode>(apPrecalculusTopicCodes);

const apPrecalculusTopicsByUnit = {
  'unit-1': Object.freeze(apPrecalculusTopics.filter((topic) => topic.unitId === 'unit-1')),
  'unit-2': Object.freeze(apPrecalculusTopics.filter((topic) => topic.unitId === 'unit-2')),
  'unit-3': Object.freeze(apPrecalculusTopics.filter((topic) => topic.unitId === 'unit-3')),
  'unit-4': Object.freeze(apPrecalculusTopics.filter((topic) => topic.unitId === 'unit-4')),
} satisfies Record<ApPrecalculusUnitId, readonly ApPrecalculusCedTopic[]>;

const apPrecalculusUnitTopicCounts = {
  'unit-1': apPrecalculusTopicsByUnit['unit-1'].length,
  'unit-2': apPrecalculusTopicsByUnit['unit-2'].length,
  'unit-3': apPrecalculusTopicsByUnit['unit-3'].length,
  'unit-4': apPrecalculusTopicsByUnit['unit-4'].length,
} satisfies ApPrecalculusUnitTopicCounts;

function uniqueNormalizedKeys(values: readonly string[]): string[] {
  return Array.from(
    new Set(values.map((value) => normalizeCurriculumLookup(value)).filter(Boolean)),
  );
}

function buildUnitLookup(): Map<string, ApPrecalculusCedUnit> {
  const lookup = new Map<string, ApPrecalculusCedUnit>();

  for (const unit of apPrecalculusUnits) {
    const keys = uniqueNormalizedKeys([
      unit.id,
      `unit ${unit.number}`,
      `unit-${unit.number}`,
      `u${unit.number}`,
      formatApPrecalculusUnit(unit),
      `Unit ${unit.number} ${unit.title}`,
      unit.title,
      ...unit.aliases,
    ]);

    for (const key of keys) {
      lookup.set(key, unit);
    }
  }

  return lookup;
}

function buildTopicLookup(): Map<string, ApPrecalculusCedTopic> {
  const lookup = new Map<string, ApPrecalculusCedTopic>();

  for (const topic of apPrecalculusTopics) {
    const keys = uniqueNormalizedKeys(topic.aliases);

    for (const key of keys) {
      lookup.set(key, topic);
    }
  }

  return lookup;
}

const apPrecalculusUnitLookup = buildUnitLookup();
const apPrecalculusTopicLookup = buildTopicLookup();

export function normalizeCurriculumLookup(value: string): string {
  const trimmed = value.trim().toLowerCase();

  if (!trimmed) {
    return '';
  }

  const codeMatch = trimmed.match(
    /(?:^|\b)(?:topic\s*)?0?([1-4])\s*[-._\s\u2013\u2014]\s*0?([1-9]|1[0-5])(?:\b|$)/,
  );

  if (codeMatch) {
    return `${Number(codeMatch[1])}.${Number(codeMatch[2])}`;
  }

  const unitMatch =
    trimmed.match(/^unit\s*[-_\s]?\s*0?([1-4])$/) ?? trimmed.match(/^u\s*0?([1-4])$/);

  if (unitMatch) {
    return `unit ${Number(unitMatch[1])}`;
  }

  return trimmed
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeApPrecalculusUnitId(
  value: ApPrecalculusUnitId | string,
): ApPrecalculusUnitId | undefined {
  return getApPrecalculusUnit(value)?.id;
}

export function normalizeApPrecalculusTopicCode(
  value: ApPrecalculusTopicCode | string,
): ApPrecalculusTopicCode | undefined {
  const normalized = normalizeCurriculumLookup(value);

  return apPrecalculusTopicCodeSet.has(normalized as ApPrecalculusTopicCode)
    ? (normalized as ApPrecalculusTopicCode)
    : undefined;
}

export function getApPrecalculusUnit(
  value: ApPrecalculusUnitId | string,
): ApPrecalculusCedUnit | undefined {
  return apPrecalculusUnitLookup.get(normalizeCurriculumLookup(value));
}

export const findApPrecalculusUnit = getApPrecalculusUnit;

export function getApPrecalculusUnitById(
  unitId: ApPrecalculusUnitId,
): ApPrecalculusCedUnit | undefined {
  return apPrecalculusUnitById.get(unitId);
}

export function getApPrecalculusTopic(
  value: ApPrecalculusTopicCode | string,
): ApPrecalculusCedTopic | undefined {
  return apPrecalculusTopicLookup.get(normalizeCurriculumLookup(value));
}

export function findApPrecalculusTopic(
  value: ApPrecalculusTopicCode | string,
  unitId?: ApPrecalculusUnitId,
): ApPrecalculusCedTopic | undefined {
  const topic = getApPrecalculusTopic(value);

  if (!topic || !unitId) {
    return topic;
  }

  return topic.unitId === unitId ? topic : undefined;
}

export function getApPrecalculusTopicByCode(
  code: ApPrecalculusTopicCode | string,
): ApPrecalculusCedTopic | undefined {
  const normalizedCode = normalizeApPrecalculusTopicCode(code);

  return normalizedCode ? getApPrecalculusTopic(normalizedCode) : undefined;
}

export function getApPrecalculusTopicsForUnit(
  value: ApPrecalculusUnitId | string,
): readonly ApPrecalculusCedTopic[] {
  const unitId = normalizeApPrecalculusUnitId(value);

  return unitId ? apPrecalculusTopicsByUnit[unitId] : [];
}

export function getApPrecalculusUnitTopicCounts(): ApPrecalculusUnitTopicCounts {
  return { ...apPrecalculusUnitTopicCounts };
}

export function isApPrecalculusUnitAssessedOnApExam(value: ApPrecalculusUnitId | string): boolean {
  return getApPrecalculusUnit(value)?.assessedOnApExam ?? false;
}

export function isApPrecalculusTopicAssessedOnApExam(
  value: ApPrecalculusTopicCode | string,
): boolean {
  return getApPrecalculusTopic(value)?.assessedOnApExam ?? false;
}

export function formatApPrecalculusTopic(
  topic: Pick<ApPrecalculusCedTopic, 'code' | 'title'>,
): string {
  return `${topic.code} ${topic.title}`;
}

export function formatApPrecalculusUnit(
  unit: Pick<ApPrecalculusCedUnit, 'number' | 'title'>,
): string {
  return `Unit ${unit.number}: ${unit.title}`;
}

export const normalizeCurriculumLabel = normalizeCurriculumLookup;
