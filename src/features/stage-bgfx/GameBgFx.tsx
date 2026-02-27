import './gameBgFx.css';

export function GameBgFx() {
  return (
    <div className="match3-bgfx" aria-hidden="true">
      {/* Depth / atmosphere */}
      <div className="match3-bgfx__layer match3-bgfx__fog match3-bgfx__mask-safe" />
      <div className="match3-bgfx__layer match3-bgfx__particles match3-bgfx__mask-safe" />

      {/* Subtle top sway ("cable sway" vibe) */}
      <div className="match3-bgfx__layer match3-bgfx__topSway match3-bgfx__mask-safe" />

      {/* Side bloom heat (neon heat shimmer) */}
      <div className="match3-bgfx__layer match3-bgfx__neonHeat match3-bgfx__mask-safe" />

      {/* Road / wet reflection shimmer */}
      <div className="match3-bgfx__layer match3-bgfx__roadShimmer match3-bgfx__mask-safe" />

      {/* Platform LED strips (breathing + slow sweep) */}
      <div className="match3-bgfx__layer match3-bgfx__platformLeds match3-bgfx__mask-safe" />

      {/* Ultra-subtle vignette breathing (center stays calm) */}
      <div className="match3-bgfx__layer match3-bgfx__vignette" />
    </div>
  );
}
