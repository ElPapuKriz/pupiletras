import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import PupiletrasMain from './PupiletrasMain'


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PupiletrasMain/>
  </StrictMode>,
)
