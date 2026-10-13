import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { startCloud } from './services/cloud';

// MSP-45: connect to the shared database (does nothing until Firebase is set up).
startCloud();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
