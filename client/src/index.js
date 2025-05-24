import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import './index.css';
import App from './App';
import './styles/Landing.css';

function BodyClassController() {
  const location = useLocation();
  React.useEffect(() => {
    if (location.pathname === '/') {
      document.body.classList.add('landing-page-body');
    } else {
      document.body.classList.remove('landing-page-body');
    }
  }, [location.pathname]);
  return null;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <BodyClassController />
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

