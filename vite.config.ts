import { defineConfig, loadEnv } from 'vite';
import { apiBase } from './src/api/apiBase';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(({ mode, command }) => {
  // Validate before bundling. Never echo raw settings or other environment values.
  const config = loadEnv(mode, __dirname, 'VITE_');
  apiBase(process.env.VITE_API_URL ?? config.VITE_API_URL, command === 'build');
  return {
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
    plugins: [react(), tailwindcss()],
  };
});
