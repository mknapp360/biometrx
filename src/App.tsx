import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { PreferencesProvider } from './hooks/usePreferences'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AddReading from './pages/AddReading'
import History from './pages/History'
import Insights from './pages/Insights'
import BloodPanels from './pages/BloodPanels'
import Profile from './pages/Profile'
import WeightDrivers from './pages/WeightDrivers'

export default function App() {
  return (
    <AuthProvider>
      <PreferencesProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/add" element={<AddReading />} />
              <Route path="/history" element={<History />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/bloods" element={<BloodPanels />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/weight-drivers" element={<WeightDrivers />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </PreferencesProvider>
    </AuthProvider>
  )
}
