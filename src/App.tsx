import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Semana from './pages/Semana'
import Mes from './pages/Mes'
import Ganhos from './pages/Ganhos'
import Gastos from './pages/Gastos'
import DespesasFixas from './pages/DespesasFixas'
import Manutencoes from './pages/Manutencoes'
import Metas from './pages/Metas'
import Historico from './pages/Historico'
import Privacidade from './pages/Privacidade'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/privacidade" element={<Privacidade />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/ganhos" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/semana" element={<Semana />} />
          <Route path="/mes" element={<Mes />} />
          <Route path="/ganhos" element={<Ganhos />} />
          <Route path="/gastos" element={<Gastos />} />
          <Route path="/despesas-fixas" element={<DespesasFixas />} />
          <Route path="/manutencoes" element={<Manutencoes />} />
          <Route path="/metas" element={<Metas />} />
          <Route path="/historico" element={<Historico />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/ganhos" replace />} />
    </Routes>
  )
}
