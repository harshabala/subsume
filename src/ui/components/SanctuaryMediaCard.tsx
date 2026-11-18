import { yearOrUnknown, yearText } from '@/shared/year';
import { ComponentChildren } from 'preact';
import { MediaItem } from '@/shared/types';
import { mediumLabel, ADD_TO_ARCHIVE_LABEL, IN_ARCHIVE_LABEL } from '@/shared/productCopy';
import { PosterImage } from './PosterImage';

export interface SanctuaryMediaCardProps {
  media: MediaItem;
  title?: string;
  synopsis?: string;
  openable?: boolean;
  onOpen?: (media: MediaItem) => void;
  onAdd?: (media: MediaItem) => void;
  added?: boolean;
  adding?: boolean;
  addLabel?: string;
  addedLabel?: string;
  /** Rendered below synopsis, outside the open button (e.g. platform chips). */
  afterSynopsis?: ComponentChildren;
  /** Extra meta row inside the open region. */
  meta?: ComponentChildren;
}

export function SanctuaryMediaCard({
  media,
  title,
  synopsis,
  openable = true,
  onOpen,
  onAdd,
  added = false,
  adding = false,
  addLabel = ADD_TO_ARCHIVE_LABEL,
  addedLabel = IN_ARCHIVE_LABEL,
  afterSynopsis,
  meta,
}: SanctuaryMediaCardProps) {
  const displayTitle = title ?? media.canonicalTitle;
  const canOpen = openable && !!onOpen;

  const poster = (
    <div className="sanctuary-card-poster">
      <PosterImage
        src={media.posterUrl}
        alt=""
        className="sanctuary-poster-img"
        loading="lazy"
        decoding="async"
        aria-hidden="true"
        fallback={
          <div className="sanctuary-poster-placeholder">
            <span className="sanctuary-placeholder-title">{displayTitle}</span>
          </div>
        }
      />
    </div>
  );

  const typeLabel = mediumLabel(media.type);

  const creatorLine = (() => {
    if (media.type === 'book') {
      const author = media.authors?.[0];
      return author ? `By ${author}` : null;
    }
    if (media.type === 'movie') {
      const director = (media.wikidataDirectorBio || '').split(',')[0].trim();
      return director ? `Directed by ${director}` : null;
    }
    if (media.type === 'tv') {
      const creator = (media.wikidataDirectorBio || '').split(',')[0].trim();
      return creator ? `Created by ${creator}` : null;
    }
    return null;
  })();

  const body = (
    <div className="sanctuary-card-content">
      <h4 className="sanctuary-card-title">{displayTitle}</h4>
      {creatorLine && <p className="sanctuary-card-creator">{creatorLine}</p>}
      {meta ?? (
        <div className="sanctuary-card-meta">
          <span
            className="sanctuary-card-badge medium-badge"
            data-medium={media.type}
          >
            {typeLabel}
          </span>
          <span data-year-unknown={yearText(media.year) ? undefined : 'true'}>{yearOrUnknown(media.year)}</span>
        </div>
      )}
      {synopsis ? <p className="sanctuary-card-synopsis">{synopsis}</p> : null}
    </div>
  );

  return (
    <article className={`sanctuary-media-card ${canOpen ? 'sanctuary-media-card--openable' : ''}`}>
      {canOpen ? (
        <button
          type="button"
          className="sanctuary-media-card-open"
          onClick={() => onOpen!(media)}
          aria-label={`View details for ${displayTitle}`}
        >
          {poster}
          {body}
        </button>
      ) : (
        <>
          {poster}
          {body}
        </>
      )}
      {afterSynopsis}
      {onAdd && (
        <div className="sanctuary-card-actions">
          <button
            type="button"
            className="sanctuary-acquire-btn"
            disabled={added || adding}
            onClick={() => onAdd(media)}
          >
            {adding ? 'Adding…' : added ? addedLabel : addLabel}
          </button>
        </div>
      )}
    </article>
  );
}