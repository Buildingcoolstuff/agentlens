import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '../popup/App.js';
import '../index.css';

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <div className="w-full h-full max-w-4xl mx-auto p-4">
        <App />
      </div>
    </React.StrictMode>
  );
}
