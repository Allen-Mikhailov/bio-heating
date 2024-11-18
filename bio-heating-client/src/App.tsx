// import { useState } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import './App.css'

import HomePage from './pages/HomePage'
import Prototypes from './pages/Prototypes.tsx'
import Prototype2 from './pages/Prototype2.tsx'
import Prototype3 from './pages/Prototype3.tsx'
import Prototype4 from './pages/Prototype4.tsx'
import Prototype5 from './pages/Prototype5.tsx';

function App() {
  // const [count, setCount] = useState(0)

  return (
    <BrowserRouter>
      <LocalizationProvider adapterLocale={AdapterDayjs}>
      <Routes>
          <Route path="/" element={<HomePage/>} />
          <Route path="/prototypes" element={<Prototypes/>} />
          <Route path="/prototype2" element={<Prototype2/>} />
          <Route path="/prototype3" element={<Prototype3/>} />
          <Route path="/prototype4" element={<Prototype4/>} />
          <Route path="/prototype5" element={<Prototype5/>} />
          </Routes>
          <div><Link to={"/prototypes"}>Prototypes</Link></div>
      </LocalizationProvider>
    </BrowserRouter>
  )
}

export default App
