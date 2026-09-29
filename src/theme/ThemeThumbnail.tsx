import type { SkinId, OverhaulId } from "./skins";
import { SKINS, OVERHAULS } from "./skins";

interface Props {
  skin: SkinId;
  overhaul: OverhaulId;
  active?: boolean;
  onClick?: () => void;
}

/**
 * A miniature "player window" rendered entirely with the target theme's
 * actual CSS tokens (data-skin / data-overhaul re-resolve the token blocks
 * for this subtree), so thumbnails are always truthful to the real UI.
 */
export default function ThemeThumbnail({ skin, overhaul, active, onClick }: Props) {
  const skinMeta = SKINS.find((s) => s.id === skin)!;
  const overhaulMeta = OVERHAULS.find((o) => o.id === overhaul)!;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`tn ${active ? "tn-active" : ""}`}
      data-skin={skin}
      data-overhaul={overhaul}
      aria-pressed={active}
    >
      <div className="tn-window">
        <div className="tn-art">
          <div className="tn-orb" />
        </div>
        <div className="tn-meta">
          <span className="tn-title">Crescendo</span>
          <span className="tn-artist">{skinMeta.name}</span>
          <div className="tn-progress">
            <div className="tn-progress-fill" />
          </div>
          <div className="tn-controls">
            <span className="tn-dot" />
            <span className="tn-dot tn-dot-accent" />
            <span className="tn-dot" />
          </div>
        </div>
      </div>
      <span className="tn-name">{overhaulMeta.name}</span>
      <span className="tn-tag">{overhaulMeta.tagline}</span>
    </button>
  );
}
