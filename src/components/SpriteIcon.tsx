// src/components/SpriteIcon.tsx
import { useEffect, useRef, useState } from 'react';

type SpriteIconProps = {
  name: string;
  spriteJsonUrl?: string;
  spriteImageUrl?: string;
  width?: number;
  height?: number;
  className?: string;
  alt?: string;
  flipX?: boolean; // ⬅️ NEW
};

let cachedJson: any = null;
let jsonPromise: Promise<any> | null = null;

export default function SpriteIcon({
  name,
  spriteJsonUrl = '/icons/Navbar-icons.json',
  spriteImageUrl = '/icons/Navbar-icons.png',
  width = 64,
  height = 64,
  className = '',
  alt = '',
  flipX = false, // ⬅️ NEW
}: SpriteIconProps) {
  const [src, setSrc] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    async function load() {
      try {
        // ---- load sprite json (cached)
        if (!cachedJson) {
          if (!jsonPromise) {
            jsonPromise = fetch(spriteJsonUrl)
              .then((r) => r.json())
              .then((j) => {
                cachedJson = j;
                return j;
              });
          }
          await jsonPromise;
        }

        const frames = cachedJson.frames || cachedJson;
        const frameKey = Object.keys(frames).find((k) => k === name || k === `${name}.png` || k === `${name}.jpg` || k.endsWith(name));

        if (!frameKey) {
          console.warn('Sprite frame not found for', name);
          return;
        }

        const frame = frames[frameKey].frame;

        // ---- load sprite image
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = spriteImageUrl;
        await new Promise((res, rej) => {
          img.onload = () => res(true);
          img.onerror = rej;
        });

        // ---- output canvas (DPR aware)
        const dpr = window.devicePixelRatio || 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, width, height);

        // ---- detect non-transparent bounds
        const tmp = document.createElement('canvas');
        tmp.width = frame.w;
        tmp.height = frame.h;

        const tctx = tmp.getContext('2d');
        if (!tctx) return;

        tctx.drawImage(img, frame.x, frame.y, frame.w, frame.h, 0, 0, frame.w, frame.h);

        const data = tctx.getImageData(0, 0, frame.w, frame.h).data;

        let minX = frame.w,
          minY = frame.h,
          maxX = 0,
          maxY = 0;

        const alphaThreshold = 10;

        for (let y = 0; y < frame.h; y++) {
          for (let x = 0; x < frame.w; x++) {
            const a = data[(y * frame.w + x) * 4 + 3];
            if (a > alphaThreshold) {
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            }
          }
        }

        let srcX = frame.x;
        let srcY = frame.y;
        let srcW = frame.w;
        let srcH = frame.h;

        if (minX <= maxX && minY <= maxY) {
          const pad = Math.min(8, Math.floor(Math.min(maxX - minX, maxY - minY) * 0.06));
          srcX += Math.max(0, minX - pad);
          srcY += Math.max(0, minY - pad);
          srcW = Math.min(frame.w, maxX - minX + 1 + pad * 2);
          srcH = Math.min(frame.h, maxY - minY + 1 + pad * 2);
        }

        // ---- scale & center
        const scale = Math.min(width / srcW, height / srcH);
        const drawW = srcW * scale;
        const drawH = srcH * scale;
        const offsetX = (width - drawW) / 2;
        const offsetY = (height - drawH) / 2;

        // ---- draw (with optional horizontal flip)
        ctx.save();

        if (flipX) {
          ctx.translate(width, 0);
          ctx.scale(-1, 1);
        }

        ctx.drawImage(img, srcX, srcY, srcW, srcH, offsetX, offsetY, drawW, drawH);

        ctx.restore();

        if (mounted.current) {
          setSrc(canvas.toDataURL('image/png'));
        }
      } catch (err) {
        console.error(err);
      }
    }

    load();
  }, [name, spriteJsonUrl, spriteImageUrl, width, height, flipX]);

  if (!src) {
    return <div style={{ width, height }} className={className} aria-hidden />;
  }

  return <img src={src} width={width} height={height} className={`${className} object-contain`} alt={alt} />;
}
