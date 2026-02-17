import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import './index.css';
import App from '@/app/App';
import { AuthProvider } from './context/AuthContext';
import { PowerProvider } from './context/PowerProvider';
import { CyberToaster } from '@/components';
import { AudioProvider } from './context/AudioContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AudioProvider>
        <AuthProvider>
          <PowerProvider>
            <App />
            <CyberToaster position="bottom-center" />
          </PowerProvider>
        </AuthProvider>
      </AudioProvider>
    </BrowserRouter>
  </StrictMode>,
);
