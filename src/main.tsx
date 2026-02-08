import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import './index.css';
import App from '@/app/App';
import { AuthProvider } from './context/AuthContext';
import { PowerProvider } from './context/PowerContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PowerProvider>
          <App />
        </PowerProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
