import { useEffect, useState } from "react";

/**
 * Artwork <img> that quietly removes itself when the asset can't be loaded.
 * Covers are painted over a palette gradient (see `artBackground`), so a
 * missing or cache-cleared PNG reveals that gradient instead of the
 * webview's broken-image placeholder.
 */
export default function ArtImage({
  src,
  className,
}: {
  src?: string | null;
  className?: string;
}) {
  const [ok, setOk] = useState(true);

  // A new source deserves a fresh attempt.
  useEffect(() => {
    setOk(true);
  }, [src]);

  if (!src || !ok) return null;

  return (
    <img
      src={src}
      alt=""
      className={className}
      draggable={false}
      onError={() => setOk(false)}
    />
  );
}
