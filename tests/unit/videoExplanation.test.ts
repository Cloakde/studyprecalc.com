import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { VideoExplanation } from '../../src/app/components/VideoExplanation';
import type { VideoExplanation as VideoExplanationData } from '../../src/domain/questions/types';

function renderVideo(video: VideoExplanationData, title = 'Worked solution'): string {
  return renderToStaticMarkup(createElement(VideoExplanation, { video, title }));
}

describe('VideoExplanation', () => {
  it('renders a YouTube URL as a privacy-enhanced embed', () => {
    const markup = renderVideo({
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      durationSeconds: 65,
      transcriptPath: '/transcripts/test-video.txt',
    });

    expect(markup).toContain('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(markup).toContain('title="Worked solution video player"');
    expect(markup).toContain('Duration');
    expect(markup).toContain('1:05');
    expect(markup).toContain('Open transcript');
  });

  it('renders a Vimeo URL as an embed', () => {
    const markup = renderVideo({
      url: 'https://vimeo.com/123456789',
    });

    expect(markup).toContain('https://player.vimeo.com/video/123456789');
    expect(markup).toContain('Vimeo');
  });

  it('renders direct video files with native controls and poster metadata', () => {
    const markup = renderVideo({
      url: 'https://cdn.example.test/precalc/explanation.webm',
      thumbnailPath: '/images/explanation-thumb.jpg',
    });

    expect(markup).toContain('<video');
    expect(markup).toContain('controls=""');
    expect(markup).toContain('poster="/images/explanation-thumb.jpg"');
    expect(markup).toContain('type="video/webm"');
  });

  it('recognizes local uploaded video references', () => {
    const markup = renderVideo({
      url: 'local-video:video-123_abc',
    });

    expect(markup).toContain('Uploaded video');
    expect(markup).toContain('Loading uploaded video');
    expect(markup).not.toContain('Open original video');
  });

  it('falls back to a safe external link with a thumbnail for unsupported providers', () => {
    const markup = renderVideo({
      url: 'https://videos.example.test/precalc/unit-1',
      thumbnailPath: 'assets/video/unit-1.png',
      durationSeconds: 732,
    });

    expect(markup).toContain('href="https://videos.example.test/precalc/unit-1"');
    expect(markup).toContain('src="assets/video/unit-1.png"');
    expect(markup).toContain('Open video explanation');
    expect(markup).toContain('12:12');
    expect(markup).not.toContain('<iframe');
  });

  it('does not render unsafe video or transcript links', () => {
    const markup = renderVideo({
      url: 'javascript:alert(1)',
      transcriptPath: 'javascript:alert(2)',
    });

    expect(markup).toContain('could not be opened safely');
    expect(markup).toContain('Transcript');
    expect(markup).toContain('Unavailable');
    expect(markup).not.toContain('href="javascript:');
    expect(markup).not.toContain('<iframe');
  });
});
