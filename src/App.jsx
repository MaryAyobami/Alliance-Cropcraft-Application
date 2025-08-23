"use client"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "./contexts/AuthContext"
import Layout from "./components/Layout"
import Login from "./pages/Login"
import Register from "./pages/Register"
import ForgotPassword from "./pages/ForgotPassword"
import ResetPassword from "./pages/ResetPassword"
import VerifyEmail from "./pages/VerifyEmail"
import Dashboard from "./pages/Dashboard"
import Tasks from "./pages/Tasks"
import Calendar from "./pages/Calendar"
import Reports from "./pages/Reports"
import PWAInstallPrompt from "./components/PWAInstallPrompt"
import Settings from "./pages/Settings"

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return user ? children : <Navigate to="/login" />
}

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return user ? <Navigate to="/dashboard" /> : children
}

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" />
  return (user.role === "Admin" || user.role === "Admin User") ? children : <Navigate to="/dashboard" />
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
               
                  <Login />

              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <ForgotPassword />
              </PublicRoute>
            }
          />
          <Route
            path="/reset-password/:token"
            element={
              <PublicRoute>
                <ResetPassword />
              </PublicRoute>
            }
          />
          <Route
            path="/verify-email/:token"
            element={
              <PublicRoute>
                <VerifyEmail />
              </PublicRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks"
            element={
              <ProtectedRoute>
                <Layout>
                  <Tasks />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <Layout>
                  <Calendar />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <Settings/>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <Layout>
                    <Reports />
                  </Layout>
                </AdminRoute>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Router>
      <PWAInstallPrompt />
    </AuthProvider>
  )
}

export default App
