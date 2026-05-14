import { ImageOff } from 'lucide-react';
import { useEffect, useState } from 'react';

import { isLocalImageReference, useLocalImageObjectUrl } from '../../data/localImageStore';
import {
  createSupabaseSignedImageUrl,
  isSupabaseImageReference,
} from '../../data/supabase/mediaStore';
import type { QuestionAsset } from '../../domain/questions/types';

type QuestionAssetGalleryProps = {
  assets: QuestionAsset[] | undefined;
  ariaLabel: string;
  className?: string;
};

type QuestionAssetItemProps = {
  asset: QuestionAsset;
};

type CloudImageState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  url: string | null;
  error: string | null;
};

function classNames(...values: Array<string | undefined>): string {
  return values.filter(Boolean).join(' ');
}

function getSafeAssetPath(path: string): string | null {
  const trimmed = path.trim();

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

function formatAssetType(type: QuestionAsset['type']): string {
  if (type === 'graph') {
    return 'Graph';
  }

  if (type === 'table') {
    return 'Table';
  }

  return 'Image';
}

function useSupabaseImageSignedUrl(reference: string): CloudImageState {
  const isCloudImage = isSupabaseImageReference(reference);
  const [state, setState] = useState<CloudImageState>({
    status: 'idle',
    url: null,
    error: null,
  });

  useEffect(() => {
    if (!isCloudImage) {
      setState({ status: 'idle', url: null, error: null });
      return;
    }

    let isActive = true;

    setState({ status: 'loading', url: null, error: null });

    void createSupabaseSignedImageUrl({ reference })
      .then((url) => {
        if (isActive) {
          setState({ status: 'ready', url, error: null });
        }
      })
      .catch((error) => {
        if (isActive) {
          setState({
            status: 'error',
            url: null,
            error: error instanceof Error ? error.message : 'Unable to load cloud image.',
          });
        }
      });

    return () => {
      isActive = false;
    };
  }, [isCloudImage, reference]);

  return state;
}

function QuestionAssetItem({ asset }: QuestionAssetItemProps) {
  const localImage = useLocalImageObjectUrl(asset.path);
  const cloudImage = useSupabaseImageSignedUrl(asset.path);
  const isLocalImage = isLocalImageReference(asset.path);
  const isCloudImage = isSupabaseImageReference(asset.path);
  const source = isLocalImage
    ? localImage.objectUrl
    : isCloudImage
      ? cloudImage.url
      : getSafeAssetPath(asset.path);
  const isLoadingLocalImage = isLocalImage && localImage.status === 'loading';
  const isLoadingCloudImage = isCloudImage && cloudImage.status === 'loading';
  const hasLocalImageError =
    isLocalImage && (localImage.status === 'missing' || localImage.status === 'error');
  const hasCloudImageError = isCloudImage && cloudImage.status === 'error';
  const hasImage = Boolean(source) && !hasLocalImageError && !hasCloudImageError;
  const imageError = localImage.error ?? cloudImage.error ?? 'This image could not be displayed.';

  return (
    <figure className="asset-card">
      <div className="asset-card__media">
        {hasImage ? (
          <img alt={asset.alt} loading="lazy" src={source ?? undefined} />
        ) : (
          <div
            className="asset-card__notice"
            role={isLoadingLocalImage || isLoadingCloudImage ? 'status' : 'note'}
          >
            <ImageOff aria-hidden="true" />
            <span>
              {isLoadingLocalImage || isLoadingCloudImage ? 'Loading image...' : imageError}
            </span>
          </div>
        )}
      </div>
      <figcaption>
        <span>{formatAssetType(asset.type)}</span>
        <strong>{asset.caption || asset.alt}</strong>
      </figcaption>
    </figure>
  );
}

export function QuestionAssetGallery({ assets, ariaLabel, className }: QuestionAssetGalleryProps) {
  if (!assets || assets.length === 0) {
    return null;
  }

  return (
    <div className={classNames('asset-gallery', className)} aria-label={ariaLabel}>
      {assets.map((asset) => (
        <QuestionAssetItem asset={asset} key={asset.id} />
      ))}
    </div>
  );
}
