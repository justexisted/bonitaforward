import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './global-spacing-fix.css'
import App from './App.tsx'

// Import test utility in development mode (makes it available on window)
// Import synchronously so it's available immediately when app loads
if (import.meta.env.DEV) {
  import('./utils/testQueryUtility')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
