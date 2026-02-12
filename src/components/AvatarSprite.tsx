import type { CSSProperties } from 'react';
import { AVATAR_FRAMES, AVATAR_SPRITE_IMAGE, AVATAR_SPRITE_SIZE } from '@/assets/avatarsFrames';
import { Avatar } from '@/components';
type Props = {
  name?: string; // avatar1.png, avatar2.png, default.png etc
  size?: number;
  className?: string;
};

export default function AvatarSprite({ name = 'default.png', size = 72, className = '' }: Props) {
  //if avatar is default.png or invalid, we will show a gray circle with default.png in the center as fallback
  const frameData = AVATAR_FRAMES[name as keyof typeof AVATAR_FRAMES];

  if (!frameData) {
    // fallback for default or invalid avatar
    return (
      <div style={{ width: size, height: size }} className={`rounded-full bg-gray-400 flex items-center justify-center ${className}`}>
        <img src="/avatar/default.png" alt="default avatar" style={{ width: size, height: size, objectFit: 'cover', borderRadius: '50%' }} />
      </div>
    );
  }

  const f = frameData;
  if (!frameData) {
    return <Avatar size={size} />;
  }
  const scale = size / f.w;

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
