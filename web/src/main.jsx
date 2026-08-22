import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './theme.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';

// HashRouter: permite abrir el prototipo compilado (dist) directamente en el
// navegador (file://) sin necesidad de un servidor con reescritura de rutas.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
);
