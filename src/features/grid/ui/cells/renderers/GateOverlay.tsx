import { getGateSprite } from '../../tilesSpecial';
import { spriteToBgStyle } from '../sprites/spriteToBgStyle';

type Props = {
  open: boolean;
};

export function GateOverlay({ open }: Props) {
  const gateSprite = getGateSprite(open);
  const gateSpriteStyle = spriteToBgStyle(gateSprite);

  return (
    <>
      <div className="absolute inset-0 rounded-xl opacity-90" style={gateSpriteStyle} />
      <div
        className={[
          'absolute inset-2 rounded-lg border border-white/10',
          open ? 'bg-emerald-500/10 shadow-[0_0_18px_rgba(16,185,129,0.18)]' : 'bg-fuchsia-500/10 shadow-[0_0_18px_rgba(217,70,239,0.18)]',
        ].join(' ')}
      />
    </>
  );
}
