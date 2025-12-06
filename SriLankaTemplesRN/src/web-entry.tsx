import React from 'react';
import ReactDOM from 'react-dom/client';

// Lazy load App to avoid react-native module issues at import time
const App = React.lazy(() => import('../App'));

const WebAppWrapper = () => {
  return (
    <React.Suspense
      fallback={
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: '#f5f5f5',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          <p style={{ fontSize: 18, color: '#666' }}>Loading Sri Lanka Hindu Temples...</p>
        </div>
      }
    >
      <App />
    </React.Suspense>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <WebAppWrapper />
  </React.StrictMode>
);

