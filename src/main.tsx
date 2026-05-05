import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { loadWasm } from './wasm/index'

// Load WASM module before mounting. The app renders immediately using JS
// fallbacks; WASM silently replaces them once the module resolves.
loadWasm().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
