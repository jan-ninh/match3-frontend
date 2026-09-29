import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import './index.css';
import App from '@/app/App';
import { OutcomeProvider } from './context/OutcomeProvider';
import { GuestProvider } from './context/GuestProvider';
import { AuthProvider } from './context/AuthContext';
import { PowerProvider } from './context/PowerProvider';
import { CyberToaster } from '@/components';
import { AudioProvider } from './context/AudioContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AudioProvider>
        <AuthProvider>
          <OutcomeProvider>
            <GuestProvider>
              <PowerProvider>
                <App />
                <CyberToaster position="bottom-center" />
              </PowerProvider>
            </GuestProvider>
          </OutcomeProvider>
        </AuthProvider>
      </AudioProvider>
    </BrowserRouter>
  </StrictMode>,
);
