import { Captions, Clock3, ExternalLink, Film, PlayCircle, ShieldAlert } from 'lucide-react';
import { useId, type ReactNode } from 'react';

import { getLocalVideoId, useLocalVideoObjectUrl } from '../../data/localVideoStore';
import type { VideoExplanation as VideoExplanationData } from '../../domain/questions/types';
import './VideoExplanation.css';

type VideoExplanationProps = {
  video: VideoExplanationData;
  title?: string;
  className?: string;
};

type VideoRenderModel =
  | {
      kind: 'youtube' | 'vimeo';
      embedUrl: string;
      originalHref: string;
      providerLabel: string;
    }
  | {
      kind: 'file';
      originalHref: string;
      providerLabel: string;
      videoType: string;
    }
  | {
      kind: 'external';
      originalHref: string;
      providerLabel: string;
    }
  | {
      kind: 'local';
      providerLabel: string;
    }
  | {
      kind: 'unsafe';
      providerLabel: string;
    };

const videoFileTypes: Record<string, string> = {
  mp4: 'video/mp4',
  ogg: 'video/ogg',
  ogv: 'video/ogg',
  webm: 'video/webm',
};

function parseSafeHttpUrl(rawUrl: string): URL | null {
  try {
    const url = new URL(rawUrl.trim());

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

function hostWithoutWww(url: URL): string {
  return url.hostname.toLowerCase().replace(/^www\./, '');
}

function safePathSegment(value: string | undefined): string | null {
  if (!value || !/^[a-zA-Z0-9_-]{6,64}$/.test(value)) {
    return null;
  }

  return value;
}

function getYouTubeId(url: URL): string | null {
  const host = hostWithoutWww(url);
  const segments = url.pathname.split('/').filter(Boolean);

  if (host === 'youtu.be') {
    return safePathSegment(segments[0]);
  }

  if (host !== 'youtube.com' && host !== 'youtube-nocookie.com' && host !== 'm.youtube.com') {
    return null;
  }

  if (url.pathname === '/watch') {
    return safePathSegment(url.searchParams.get('v') ?? undefined);
  }

  if (segments[0] === 'embed' || segments[0] === 'shorts' || segments[0] === 'live') {
    return safePathSegment(segments[1]);
  }

  return null;
}

function getVimeoId(url: URL): string | null {
  const host = hostWithoutWww(url);

  if (host !== 'vimeo.com' && host !== 'player.vimeo.com') {
    return null;
  }

  const id = url.pathname
    .split('/')
    .filter(Boolean)
    .find((segment) => /^\d{4,}$/.test(segment));

  return id ?? null;
}

function getVideoFileType(url: URL): string | null {
  const extension = url.pathname.split('.').pop()?.toLowerCase();

  if (!extension) {
    return null;
  }

  return videoFileTypes[extension] ?? null;
}

function getRenderModel(rawUrl: string): VideoRenderModel {
  const localVideoId = getLocalVideoId(rawUrl);

  if (localVideoId) {
    return {
      kind: 'local',
      providerLabel: 'Uploaded video',
    };
  }

  const url = parseSafeHttpUrl(rawUrl);

  if (!url) {
    return {
      kind: 'unsafe',
      providerLabel: 'Unavailable',
    };
  }

  const youtubeId = getYouTubeId(url);
  if (youtubeId) {
    return {
      kind: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}`,
      originalHref: url.href,
      providerLabel: 'YouTube',
    };
  }

  const vimeoId = getVimeoId(url);
  if (vimeoId) {
    return {
      kind: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${encodeURIComponent(vimeoId)}`,
      originalHref: url.href,
      providerLabel: 'Vimeo',
    };
  }

  const videoType = getVideoFileType(url);
  if (videoType) {
    return {
      kind: 'file',
      originalHref: url.href,
      providerLabel: 'Video file',
      videoType,
    };
  }

  return {
    kind: 'external',
    originalHref: url.href,
    providerLabel: 'External video',
  };
}

function getSafeResourcePath(path: string | undefined): string | null {
  const trimmed = path?.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed, 'https://precalc.local');

    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return trimmed;
    }
  } catch {
    return null;
  }

  return null;
}

function formatDuration(totalSeconds: number | undefined): string | null {
  if (!totalSeconds || totalSeconds <= 0 || !Number.isFinite(totalSeconds)) {
    return null;
  }

  const roundedSeconds = Math.round(totalSeconds);
  const hours = Math.floor(roundedSeconds / 3600);
  const minutes = Math.floor((roundedSeconds % 3600) / 60);
  const seconds = roundedSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function classNames(...values: Array<string | undefined>): string {
  return values.filter(Boolean).join(' ');
}

function renderExternalPreview(
  href: string,
  thumbnailPath: string | null,
  label: string,
): ReactNode {
  return (
    <a
      className="video-explanation__external"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {thumbnailPath ? (
        <img alt="" className="video-explanation__thumbnail" src={thumbnailPath} />
      ) : (
        <span className="video-explanation__placeholder" aria-hidden="true">
          <PlayCircle />
        </span>
      )}
      <span className="video-explanation__external-copy">
        <PlayCircle aria-hidden="true" />
        <span>{label}</span>
        <ExternalLink aria-hidden="true" />
      </span>
    </a>
  );
}

export function VideoExplanation({
  video,
  title = 'Video explanation',
  className,
}: VideoExplanationProps) {
  const headingId = useId();
  const model = getRenderModel(video.url);
  const localVideo = useLocalVideoObjectUrl(video.url);
  const duration = formatDuration(video.durationSeconds);
  const thumbnailPath = getSafeResourcePath(video.thumbnailPath);
  const transcriptPath = getSafeResourcePath(video.transcriptPath);
  const hasMetadata = Boolean(
    duration || transcriptPath || video.transcriptPath || localVideo.record?.name,
  );

  let media: ReactNode;

  if (model.kind === 'youtube' || model.kind === 'vimeo') {
    media = (
      <div className="video-explanation__frame">
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-same-origin allow-scripts allow-presentation allow-popups"
          src={model.embedUrl}
          title={`${title} video player`}
        />
      </div>
    );
  } else if (model.kind === 'file') {
    media = (
      <video
        className="video-explanation__video"
        controls
        playsInline
        poster={thumbnailPath ?? undefined}
        preload="metadata"
      >
        <source src={model.originalHref} type={model.videoType} />
        <a href={model.originalHref} rel="noopener noreferrer" target="_blank">
          Open video explanation
        </a>
      </video>
    );
  } else if (model.kind === 'local') {
    if (localVideo.status === 'ready' && localVideo.objectUrl) {
      media = (
        <video
          className="video-explanation__video"
          controls
          playsInline
          poster={thumbnailPath ?? undefined}
          preload="metadata"
          src={localVideo.objectUrl}
        >
          Uploaded video explanations are supported by this browser.
        </video>
      );
    } else if (localVideo.status === 'missing') {
      media = (
        <div className="video-explanation__notice" role="note">
          <ShieldAlert aria-hidden="true" />
          <span>This uploaded video is not available in this browser.</span>
        </div>
      );
    } else if (localVideo.status === 'error') {
      media = (
        <div className="video-explanation__notice" role="note">
          <ShieldAlert aria-hidden="true" />
          <span>{localVideo.error ?? 'This uploaded video could not be loaded.'}</span>
        </div>
      );
    } else {
      media = (
        <div className="video-explanation__notice video-explanation__notice--neutral" role="status">
          <PlayCircle aria-hidden="true" />
          <span>Loading uploaded video...</span>
        </div>
      );
    }
  } else if (model.kind === 'external') {
    media = renderExternalPreview(model.originalHref, thumbnailPath, 'Open video explanation');
  } else {
    media = (
      <div className="video-explanation__notice" role="note">
        <ShieldAlert aria-hidden="true" />
        <span>This video link could not be opened safely.</span>
      </div>
    );
  }

  return (
    <section className={classNames('video-explanation', className)} aria-labelledby={headingId}>
      <header className="video-explanation__header">
        <div className="video-explanation__title">
          <Film aria-hidden="true" />
          <h3 id={headingId}>{title}</h3>
        </div>
        <span className="video-explanation__provider">{model.providerLabel}</span>
      </header>

      {media}

      {model.kind !== 'external' && model.kind !== 'unsafe' && model.kind !== 'local' ? (
        <a
          className="video-explanation__source-link"
          href={model.originalHref}
          rel="noopener noreferrer"
          target="_blank"
        >
          <ExternalLink aria-hidden="true" />
          Open original video
        </a>
      ) : null}

      {hasMetadata ? (
        <dl className="video-explanation__metadata" aria-label="Video metadata">
          {localVideo.record?.name ? (
            <div className="video-explanation__metadata-item">
              <Film aria-hidden="true" />
              <dt>File</dt>
              <dd>{localVideo.record.name}</dd>
            </div>
          ) : null}
          {duration ? (
            <div className="video-explanation__metadata-item">
              <Clock3 aria-hidden="true" />
              <dt>Duration</dt>
              <dd>{duration}</dd>
            </div>
          ) : null}
          {transcriptPath ? (
            <div className="video-explanation__metadata-item">
              <Captions aria-hidden="true" />
              <dt>Transcript</dt>
              <dd>
                <a href={transcriptPath} rel="noopener noreferrer" target="_blank">
                  Open transcript
                </a>
              </dd>
            </div>
          ) : null}
          {video.transcriptPath && !transcriptPath ? (
            <div className="video-explanation__metadata-item">
              <ShieldAlert aria-hidden="true" />
              <dt>Transcript</dt>
              <dd>Unavailable</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </section>
  );
}
