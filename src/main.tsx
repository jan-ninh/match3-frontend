import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import './index.css';
import App from '@/app/App';
import { AuthProvider } from './context/AuthContext';
import { PowerProvider } from './context/PowerContext';
import { CyberToaster } from '@/components';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PowerProvider>
          <App />
          <CyberToaster position="bottom-left" />
        </PowerProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
