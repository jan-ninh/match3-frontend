import type { CSSProperties } from 'react';
import { AVATAR_FRAMES, AVATAR_SPRITE_IMAGE, AVATAR_SPRITE_SIZE } from '@/assets/avatarsFrames';

type Props = {
  name: keyof typeof AVATAR_FRAMES; // avatar1..6
  size?: number; // اندازه خروجی (مثلا 72)
  className?: string;
};

export default function AvatarSprite({ name, size = 72, className = '' }: Props) {
  const f = AVATAR_FRAMES[name];
  const scale = size / f.w; // چون فریم‌ها 512x512 هستند

  const style: CSSProperties = {
    width: size,
    height: size,
    backgroundImage: `url(${AVATAR_SPRITE_IMAGE})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${AVATAR_SPRITE_SIZE.w * scale}px ${AVATAR_SPRITE_SIZE.h * scale}px`,
    backgroundPosition: `${-f.x * scale}px ${-f.y * scale}px`,
    borderRadius: 9999,
  };

  return <div aria-label={name} style={style} className={className} />;
}
