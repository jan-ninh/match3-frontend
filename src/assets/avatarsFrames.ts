export type AvatarKey = 'default.png' | 'avatar1.png' | 'avatar2.png' | 'avatar3.png' | 'avatar4.png' | 'avatar5.png' | 'avatar6.png';

type Frame = { x: number; y: number; w: number; h: number };

export const AVATAR_SPRITE_IMAGE = '/avatar/avatars.png'; // spritesheet
export const AVATAR_SPRITE_SIZE = { w: 1536, h: 1024 }; // meta.size

export const AVATAR_FRAMES: Record<Exclude<AvatarKey, 'default.png'>, Frame> = {
  'avatar1.png': { x: 0, y: 0, w: 512, h: 512 },
  'avatar2.png': { x: 512, y: 0, w: 512, h: 512 },
  'avatar3.png': { x: 1024, y: 0, w: 512, h: 512 },
  'avatar4.png': { x: 0, y: 512, w: 512, h: 512 },
  'avatar5.png': { x: 512, y: 512, w: 512, h: 512 },
  'avatar6.png': { x: 1024, y: 512, w: 512, h: 512 },
};

export const PICKABLE_AVATARS: Exclude<AvatarKey, 'default.png'>[] = ['avatar1.png', 'avatar2.png', 'avatar3.png', 'avatar4.png', 'avatar5.png', 'avatar6.png'];
