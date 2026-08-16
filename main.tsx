import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AppWithAuth from './src/auth/AppWithAuth.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppWithAuth />
  </StrictMode>,
);
