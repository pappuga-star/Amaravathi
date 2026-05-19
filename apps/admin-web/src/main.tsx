import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { NotificationProvider } from '@/components/NotificationContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import './i18n';
import './styles.css';
import { SEARCH_GC_TIME_MS, SEARCH_STALE_TIME_MS } from './search/search.constants';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: SEARCH_STALE_TIME_MS,
      gcTime: SEARCH_GC_TIME_MS,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </BrowserRouter>
      </NotificationProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
