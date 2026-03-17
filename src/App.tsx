// import { useState } from 'react'
import { useRenderer } from './hooks/useRenderer'
import './App.css'
import { useRef } from 'react'

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderRef = useRenderer(canvasRef);

  return (<>
    <h2>rhino 3dm model demo:</h2>
    <canvas ref={canvasRef} />
    <i>(if you don't see a cool animal head logo, its not working.)</i>
  </>)
}

export default App
