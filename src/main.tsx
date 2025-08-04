import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import ModalApp from './components/ModalApp.tsx'
import './index.css'

// Check if we're in modal mode based on URL hash
const isModal = window.location.hash === '#/modal';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isModal ? <ModalApp /> : <App />}
  </React.StrictMode>,
) 