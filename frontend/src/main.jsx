import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import './index.css';
import App from './App.jsx';
import { queryClient } from './config/queryClient';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster position="top-right" richColors duration={7000} />
    </QueryClientProvider>
  </StrictMode>,
);
