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
import TaskHistory from "./pages/TaskHistory"
import TaskDetails from "./pages/TaskDetails"
import Calendar from "./pages/Calendar"
import Reports from "./pages/Reports"
import Livestock from "./pages/Livestock"
import LivestockHealth from "./pages/LivestockHealth"
import Users from "./pages/Users"
import FarmResources from "./pages/FarmResources"
import FarmMap from "./pages/FarmMap"
import PlantingTracker from "./pages/PlantingTracker"
import PWAInstallPrompt from "./components/PWAInstallPrompt"
import Settings from "./pages/Settings"
import RegistrationSuccessful from "./pages/RegistrationSuccessful"

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
            path="/verify-email"
            element={
              <PublicRoute>
                <VerifyEmail />
              </PublicRoute>
            }
          />
            <Route
            path="/registration-successful"
            element={
              <PublicRoute>
                <RegistrationSuccessful />
              </PublicRoute>
            }
          />
           <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
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
            path="/task-history"
            element={
              <ProtectedRoute>
                <Layout>
                  <TaskHistory />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/task-details/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <TaskDetails />
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
            path="/livestock"
            element={
              <ProtectedRoute>
                <Layout>
                  <Livestock />
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
            path="/users"
            element={
              <ProtectedRoute>
                <Layout>
                  <Users />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/livestock/health"
            element={
              <ProtectedRoute>
                <Layout>
                  <LivestockHealth />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/farm-resources"
            element={
              <ProtectedRoute>
                <Layout>
                  <FarmResources />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/farm-map"
            element={
              <ProtectedRoute>
                <Layout>
                  <FarmMap />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/planting-tracker"
            element={
              <ProtectedRoute>
                <Layout>
                  <PlantingTracker />
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
        </Routes>
      </Router>
      <PWAInstallPrompt />
    </AuthProvider>
  )
}

export default App
