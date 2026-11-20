import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { initMitra } from './lib/mitra-auth'
import LoginPage from './pages/LoginPage'
import Layout from './components/Layout'
import { ToastProvider } from './components/ToastContext'
import InicioPage from './pages/InicioPage'
import AdegaPage from './pages/AdegaPage'
import NovoVinhoPage from './pages/NovoVinhoPage'
import VinhoPage from './pages/VinhoPage'
import AlertasPage from './pages/AlertasPage'
import FontesPage from './pages/FontesPage'
import SommelierPage from './pages/SommelierPage'
import ConfiguracoesPage from './pages/ConfiguracoesPage'

function App() {
  const [configured, setConfigured] = useState(initMitra)

  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<LoginPage onLogin={() => setConfigured(true)} />} />
        <Route element={configured ? <Layout /> : <Navigate to="/login" replace />}>
          <Route path="/" element={<InicioPage />} />
          <Route path="/adega" element={<AdegaPage />} />
          <Route path="/vinho/novo" element={<NovoVinhoPage />} />
          <Route path="/vinho/:id" element={<VinhoPage />} />
          <Route path="/sommelier" element={<SommelierPage />} />
          <Route path="/alertas" element={<AlertasPage />} />
          <Route path="/fontes" element={<FontesPage />} />
          <Route path="/configuracoes" element={<ConfiguracoesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ToastProvider>
  )
}

export default App
