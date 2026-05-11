import React from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import Layout from "./components/Layout"
import Accueil from "./pages/Accueil"
import Dashboard from "./pages/Dashboard"
import Sensibilisation from "./pages/Sensibilisation"
import Projets from "./pages/Projets"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Accueil />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="sensibilisation" element={<Sensibilisation />} />
          <Route path="projets" element={<Projets />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
