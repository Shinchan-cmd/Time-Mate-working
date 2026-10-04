import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

export const TIME_MATE_BUILD_VERSION = '2026.10.04-black-neon-v3';

// Expose safe diagnostic build identifier on window object for deployment verification
if (typeof window !== 'undefined') {
  (window as any).__TIME_MATE_BUILD_VERSION__ = TIME_MATE_BUILD_VERSION;
}

createRoot(document.getElementById('root')!).render(<App />);
