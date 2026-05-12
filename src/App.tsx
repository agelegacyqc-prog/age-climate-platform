import React from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import Layout from "./components/Layout"
import ProtectedRoute from "./components/ProtectedRoute"
import Login from "./pages/auth/Login"
import Accueil from "./pages/Accueil"
import Dashboard from "./pages/Dashboard"
import Sensibilisation from "./pages/Sensibilisation"
import Projets from "./pages/Projets"
import DashboardMetier from "./pages/metier/DashboardMetier"
import Portefeuille from "./pages/metier/Portefeuille"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Accueil />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="sensibilisation" element={<Sensibilisation />} />
          <Route path="projets" element={<Projets />} />
          <Route path="metier" element={<ProtectedRoute><DashboardMetier /></ProtectedRoute>} />
          <Route path="metier/portefeuille" element={<ProtectedRoute><Portefeuille /></ProtectedRoute>} />
          <Route path="metier/campagnes" element={<ProtectedRoute><div>Campagnes</div></ProtectedRoute>} />
          <Route path="metier/financement" element={<ProtectedRoute><div>Financement</div></ProtectedRoute>} />
          <Route path="metier/reporting" element={<ProtectedRoute><div>Reporting</div></ProtectedRoute>} />
          <Route path="metier/admin" element={<ProtectedRoute><div>Administration</div></ProtectedRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
