// import { useState } from 'react'
import { useRenderer } from './hooks/useRenderer'
import './App.css'
import { useRef } from 'react'

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderRef = useRenderer(canvasRef);

  return (
    <canvas ref={canvasRef} />

  )
}

export default App
