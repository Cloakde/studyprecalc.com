import katex from 'katex';
import { Fragment, type ReactNode } from 'react';

type MathTextProps = {
  text: string;
  block?: boolean;
};

type TextSegment = {
  type: 'text' | 'math';
  value: string;
  displayMode: boolean;
};

const mathPattern = /(\$\$[\s\S]+?\$\$|\$[^$]+?\$)/g;
const katexOptions = {
  output: 'htmlAndMathml',
  strict: 'warn',
  throwOnError: false,
  trust: false,
} as const;

function parseSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(mathPattern)) {
    const matchedText = match[0];
    const startIndex = match.index ?? 0;

    if (startIndex > lastIndex) {
      segments.push({
        type: 'text',
        value: text.slice(lastIndex, startIndex),
        displayMode: false,
      });
    }

    const displayMode = matchedText.startsWith('$$');
    segments.push({
      type: 'math',
      value: displayMode ? matchedText.slice(2, -2) : matchedText.slice(1, -1),
      displayMode,
    });

    lastIndex = startIndex + matchedText.length;
  }

  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      value: text.slice(lastIndex),
      displayMode: false,
    });
  }

  return segments;
}

function renderText(value: string): ReactNode {
  const lines = value.split('\n');

  return lines.map((line, index) => (
    <Fragment key={`${line}-${index}`}>
      {index > 0 ? <br /> : null}
      {line}
    </Fragment>
  ));
}

export function MathText({ text, block = false }: MathTextProps) {
  const rendered = parseSegments(text).map((segment, index) => {
    if (segment.type === 'text') {
      return <Fragment key={index}>{renderText(segment.value)}</Fragment>;
    }

    const html = katex.renderToString(segment.value, {
      displayMode: segment.displayMode,
      ...katexOptions,
    });

    const className = segment.displayMode ? 'math-text math-text--block' : 'math-text';
    const hasMathMl = html.includes('katex-mathml');

    return (
      <span className={className} key={index}>
        <span dangerouslySetInnerHTML={{ __html: html }} />
        {hasMathMl ? null : <span className="visually-hidden">LaTeX: {segment.value}</span>}
      </span>
    );
  });

  if (block) {
    return <div className="math-copy">{rendered}</div>;
  }

  return <span className="math-copy">{rendered}</span>;
}
