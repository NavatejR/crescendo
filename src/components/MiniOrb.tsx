import OrbViz from "../visualizer/OrbViz";

/** A small live orb on the playbar, driven by the real audio spectrum. */
export default function MiniOrb() {
  return <OrbViz variant="orbs" size={30} className="mini-orb" />;
}
