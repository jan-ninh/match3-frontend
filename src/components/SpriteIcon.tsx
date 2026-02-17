// src/components/SpriteIcon.tsx
import { useEffect, useRef, useState } from 'react';

type Props = {
  name: string;
  spriteJsonUrl?: string;
  spriteImageUrl?: string;
  width?: number;
  height?: number;
  className?: string;
  alt?: string;
};

let cachedJson: any = null;
let jsonPromise: Promise<any> | null = null;

const findFrame = (frames: Record<string, any>, name: string) =>
  frames[name] ||
  frames[`${name}.png`] ||
  frames[`${name}.jpg`] ||
  frames[Object.keys(frames).find((k) => k.endsWith(name) || k.endsWith(`${name}.png`)) || ''];

export default function SpriteIcon({
  name,
  spriteJsonUrl = '/icons/Navbar-icons.json',
  spriteImageUrl = '/icons/Navbar-icons.png',
  width = 48,
  height = 48,
  className = '',
  alt = '',
}: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        // JSON (cached)
        if (!cachedJson) {
          if (!jsonPromise) {
            jsonPromise = fetch(spriteJsonUrl)
              .then((r) => r.json())
              .then((j) => (cachedJson = j));
          }
          await jsonPromise;
        }

        const frames = cachedJson.frames ?? cachedJson;
        const item = findFrame(frames, name);

        if (!item?.frame) {
          console.warn('Sprite frame not found for', name);
          if (alive.current) setSrc(null);
          return;
        }

        const { x, y, w, h } = item.frame;

        // Load spritesheet
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = spriteImageUrl;
        await new Promise((res, rej) => {
          img.onload = () => res(true);
          img.onerror = rej;
        });

        // Render
        const dpr = window.devicePixelRatio || 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);

        const scale = Math.min(width / w, height / h);
        const drawW = w * scale;
        const drawH = h * scale;
        const offsetX = (width - drawW) / 2;
        const offsetY = (height - drawH) / 2;

        ctx.drawImage(img, x, y, w, h, offsetX, offsetY, drawW, drawH);

        if (alive.current) setSrc(canvas.toDataURL('image/png'));
      } catch (e) {
        console.error(e);
        if (alive.current) setSrc(null);
      }
    })();
  }, [name, spriteJsonUrl, spriteImageUrl, width, height]);

  if (!src) return <div style={{ width, height }} className={className} aria-hidden />;
  return <img src={src} width={width} height={height} className={`${className} object-contain`} alt={alt} />;
}
