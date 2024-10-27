// import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'

import HomePage from './pages/HomePage'
import Prototype2 from './pages/Prototype2'

function App() {
  // const [count, setCount] = useState(0)

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage/>} />
        <Route path="/prototype2" element={<Prototype2/>} />
          {/* <Route path="/" element={<Home/>} />
          <Route path="/userinfo" element={<Userinfo/>} />
          <Route path="/todo" element={<Todo/>} />
          <Route path="/chat/:id" element={<Chat/>} />
          <Route path="/matches" element={<ChatSelect/>} />
          <Route path="/match" element={<Match/>} /> */}
        </Routes>
    </BrowserRouter>
  )
}

export default App
