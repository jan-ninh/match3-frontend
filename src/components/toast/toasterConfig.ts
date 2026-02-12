import type { DefaultToastOptions } from 'react-hot-toast';

export const CYBER_TOAST_OPTIONS: DefaultToastOptions = {
  duration: 1000,
  style: {
    background: 'rgba(2, 6, 23, 0.65)',
    color: 'rgba(255,255,255,0.88)',
    border: '1px solid rgba(165, 243, 252, 0.10)',
    boxShadow: '0 0 24px rgba(34,211,238,0.10), 0 0 40px rgba(236,72,153,0.06)',
    borderRadius: '16px',
    padding: '12px 14px',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  },
  success: {
    style: {
      border: '1px solid rgba(80, 255, 170, 0.28)',
      boxShadow: '0 0 22px rgba(80,255,170,0.16), 0 0 40px rgba(34,211,238,0.10)',
    },
    iconTheme: { primary: '#50ffaa', secondary: '#0a0f14' },
  },
  error: {
    style: {
      border: '1px solid rgba(255, 80, 140, 0.32)',
      boxShadow: '0 0 22px rgba(255,80,140,0.18), 0 0 40px rgba(236,72,153,0.10)',
    },
    iconTheme: { primary: '#ff508c', secondary: '#0a0f14' },
  },
};
