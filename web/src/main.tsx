import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { StoreProvider } from './lib/store'
import { LiveProvider } from './lib/live'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <StoreProvider>
        <LiveProvider>
          <App />
        </LiveProvider>
      </StoreProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
