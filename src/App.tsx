import React from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import Layout from "./components/Layout"
import ProtectedRoute from "./components/ProtectedRoute"
import Login from "./pages/auth/Login"
import Accueil from "./pages/Accueil"
import Dashboard from "./pages/Dashboard"
import Sensibilisation from "./pages/Sensibilisation"
import Projets from "./pages/Projets"
import Marketplace from "./pages/Marketplace"
import DashboardClient from "./pages/client/DashboardClient"
import MesActifs from "./pages/client/MesActifs"
import NouvelActif from "./pages/client/NouvelActif"
import FicheActif from "./pages/client/FicheActif"
import MonProfil from "./pages/client/MonProfil"
import Onboarding from "./pages/client/Onboarding"
import ClientCampagnes from "./pages/client/MesCampagnes"
import ClientDemandes from "./pages/client/Demandes"
import DashboardMetier from "./pages/metier/DashboardMetier"
import Portefeuille from "./pages/metier/Portefeuille"
import FicheBien from "./pages/metier/FicheBien"
import Campagnes from "./pages/metier/Campagnes"
import Missions from "./pages/metier/Missions"
import Messagerie from "./pages/metier/Messagerie"
import Financement from "./pages/metier/Financement"
import Reporting from "./pages/metier/Reporting"
import Administration from "./pages/metier/Administration"
import GED from "./pages/metier/GED"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Accueil />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="sensibilisation" element={<Sensibilisation />} />
          <Route path="projets" element={<Projets />} />
          <Route path="marketplace" element={<Marketplace />} />
          <Route path="client" element={<ProtectedRoute><DashboardClient /></ProtectedRoute>} />
          <Route path="client/actifs" element={<ProtectedRoute><MesActifs /></ProtectedRoute>} />
          <Route path="client/actifs/nouveau" element={<ProtectedRoute><NouvelActif /></ProtectedRoute>} />
          <Route path="client/actifs/:id" element={<ProtectedRoute><FicheActif /></ProtectedRoute>} />
          <Route path="client/profil" element={<ProtectedRoute><MonProfil /></ProtectedRoute>} />
          <Route path="client/campagnes" element={<ProtectedRoute><ClientCampagnes /></ProtectedRoute>} />
          <Route path="client/demandes" element={<ProtectedRoute><ClientDemandes /></ProtectedRoute>} />
          <Route path="metier" element={<ProtectedRoute><DashboardMetier /></ProtectedRoute>} />
          <Route path="metier/portefeuille" element={<ProtectedRoute><Portefeuille /></ProtectedRoute>} />
          <Route path="metier/portefeuille/:id" element={<ProtectedRoute><FicheBien /></ProtectedRoute>} />
          <Route path="metier/campagnes" element={<ProtectedRoute><Campagnes /></ProtectedRoute>} />
          <Route path="metier/missions" element={<ProtectedRoute><Missions /></ProtectedRoute>} />
          <Route path="metier/messagerie" element={<ProtectedRoute><Messagerie /></ProtectedRoute>} />
          <Route path="metier/financement" element={<ProtectedRoute><Financement /></ProtectedRoute>} />
          <Route path="metier/reporting" element={<ProtectedRoute><Reporting /></ProtectedRoute>} />
          <Route path="metier/ged" element={<ProtectedRoute><GED /></ProtectedRoute>} />
          <Route path="metier/admin" element={<ProtectedRoute><Administration /></ProtectedRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}