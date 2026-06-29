import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
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
import WorkoutHistory from './pages/WorkoutHistory'
import OAuthAuthorize from './pages/OAuthAuthorize'

export default function App() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      try {
        StatusBar.setBackgroundColor({ color: '#0a100a' })
        StatusBar.setStyle({ style: Style.Dark })
      } catch { /* ignore */ }
      try {
        SplashScreen.hide()
      } catch { /* ignore */ }
    }
  }, [])

  return (
    <AuthProvider>
      <PreferencesProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/oauth/authorize" element={<OAuthAuthorize />} />
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
              <Route path="/workouts" element={<WorkoutHistory />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </PreferencesProvider>
    </AuthProvider>
  )
}
