// import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'

import HomePage from './pages/HomePage'
import Prototype2 from './pages/Prototype2.tsx'
import Prototype3 from './pages/Prototype3.tsx'
import Prototype4 from './pages/Prototype4.tsx'

function App() {
  // const [count, setCount] = useState(0)

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage/>} />
        <Route path="/prototype2" element={<Prototype2/>} />
        <Route path="/prototype3" element={<Prototype3/>} />
        <Route path="/prototype4" element={<Prototype4/>} />
        </Routes>
    </BrowserRouter>
  )
}

export default App
