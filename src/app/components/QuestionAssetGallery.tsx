import { ImageOff } from 'lucide-react';

import { isLocalImageReference, useLocalImageObjectUrl } from '../../data/localImageStore';
import type { QuestionAsset } from '../../domain/questions/types';

type QuestionAssetGalleryProps = {
  assets: QuestionAsset[] | undefined;
  ariaLabel: string;
  className?: string;
};

type QuestionAssetItemProps = {
  asset: QuestionAsset;
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

function QuestionAssetItem({ asset }: QuestionAssetItemProps) {
  const localImage = useLocalImageObjectUrl(asset.path);
  const isLocalImage = isLocalImageReference(asset.path);
  const source = isLocalImage ? localImage.objectUrl : getSafeAssetPath(asset.path);
  const isLoadingLocalImage = isLocalImage && localImage.status === 'loading';
  const hasLocalImageError =
    isLocalImage && (localImage.status === 'missing' || localImage.status === 'error');
  const hasImage = Boolean(source) && !hasLocalImageError;

  return (
    <figure className="asset-card">
      <div className="asset-card__media">
        {hasImage ? (
          <img alt={asset.alt} loading="lazy" src={source ?? undefined} />
        ) : (
          <div className="asset-card__notice" role={isLoadingLocalImage ? 'status' : 'note'}>
            <ImageOff aria-hidden="true" />
            <span>
              {isLoadingLocalImage
                ? 'Loading image...'
                : (localImage.error ?? 'This image could not be displayed.')}
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
