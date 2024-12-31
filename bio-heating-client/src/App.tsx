// import { useState } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import './App.css'

import HomePage from './pages/HomePage'
import Prototypes from './pages/Prototypes.tsx'
import Prototype2 from './pages/Prototypes/Prototype2.tsx'
import Prototype3 from './pages/Prototypes/Prototype3.tsx'
import Prototype4 from './pages/Prototypes/Prototype4.tsx'
import Prototype5 from './pages/Prototypes/Prototype5.tsx';
import Prototype6 from './pages/Prototypes/Prototype6.tsx';
import Prototype7 from './pages/Prototypes/Prototype7.tsx';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#fb8c00',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#05070a',
      paper: '#05070a',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <BrowserRouter>
      <LocalizationProvider adapterLocale={AdapterDayjs}>
      <Routes>
          <Route path="/" element={<HomePage/>} />
          <Route path="/prototypes" element={<Prototypes/>} />
          <Route path="/prototype2" element={<Prototype2/>} />
          <Route path="/prototype3" element={<Prototype3/>} />
          <Route path="/prototype4" element={<Prototype4/>} />
          <Route path="/prototype5" element={<Prototype5/>} />
          <Route path="/prototype6" element={<Prototype6/>} />
          <Route path="/prototype7" element={<Prototype7/>} />
          </Routes>
          <div><Link to={"/prototypes"}>Prototypes</Link></div>
      </LocalizationProvider>
    </BrowserRouter>
    </ThemeProvider>
    
  )
}

export default App
