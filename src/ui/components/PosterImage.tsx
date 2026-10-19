import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';

type PosterImageProps = Omit<JSX.IntrinsicElements['img'], 'src' | 'onError'> & {
  src: string | null | undefined;
  /** Shown when there is no src or the image fails to load (offline, 404, blocked CDN). */
  fallback: ComponentChildren;
};

/** Poster <img> that falls back to a placeholder instead of the browser's broken-image glyph. */
export function PosterImage({ src, fallback, ...imgProps }: PosterImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) return <>{fallback}</>;
  return <img {...imgProps} src={src} onError={() => setFailed(true)} />;
}
