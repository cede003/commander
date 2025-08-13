import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import WorkflowModal from './components/WorkflowModal.tsx'
import './index.css'

// Check if we're in modal mode based on URL hash
const isModal = window.location.hash === '#/modal';

const root = document.getElementById('root')!
const RootComponent = isModal ? <WorkflowModal /> : <App />
const app = import.meta.env.DEV ? (
  RootComponent
) : (
  <React.StrictMode>{RootComponent}</React.StrictMode>
)

ReactDOM.createRoot(root).render(app)