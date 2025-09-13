"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { authAPI } from "../services/api"
import { initOfflineSync, cacheData } from "../services/offlineSync"

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Check if token is expired
  const isTokenExpired = useCallback((token) => {
    if (!token) return true
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const currentTime = Date.now() / 1000
      return payload.exp < currentTime
    } catch (error) {
      return true
    }
  }, [])

  // Automatic logout function
  const forceLogout = useCallback(() => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setUser(null)
    // Optionally show a notification
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
  }, [])

  // Check token validity on mount and periodically
  useEffect(() => {
    const token = localStorage.getItem("token")
    const userData = localStorage.getItem("user")

    if (token && userData) {
      if (isTokenExpired(token)) {
        forceLogout()
      } else {
        setUser(JSON.parse(userData))
      }
    }
    setLoading(false)

    // Set up interval to check token expiration every minute
    const tokenCheckInterval = setInterval(() => {
      const currentToken = localStorage.getItem("token")
      if (currentToken && isTokenExpired(currentToken)) {
        forceLogout()
      }
    }, 60000) // Check every minute

    return () => clearInterval(tokenCheckInterval)
  }, [isTokenExpired, forceLogout])

  const login = async (token, userData) => {
    localStorage.setItem("token", token)
    localStorage.setItem("user", JSON.stringify(userData))
    setUser(userData)
    
    // Initialize offline sync system on login
    try {
      await initOfflineSync()
      // Cache user data for offline access
      await cacheData.users(userData)
      console.log('[AuthContext] Offline sync initialized')
    } catch (error) {
      console.error('[AuthContext] Failed to initialize offline sync:', error)
    }
  }

  const logout = (force = false) => {
    if (force) {
      forceLogout()
      return
    }

    // Show confirmation dialog
    const confirmed = window.confirm("Are you sure you want to log out?")
    if (confirmed) {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      setUser(null)
    }
  }

  // Email verification functions
  const sendEmailVerification = async (email) => {
    try {
      const response = await authAPI.sendEmailVerification(email)
      return response.data
    } catch (error) {
      throw error
    }
  }

  const verifyEmail = async (token) => {
    try {
      const response = await authAPI.verifyEmail(token)
      return response.data
    } catch (error) {
      throw error
    }
  }

  // Password reset functions
  const forgotPassword = async (email) => {
    try {
      const response = await authAPI.forgotPassword(email)
      return response.data
    } catch (error) {
      throw error
    }
  }

  const resetPassword = async (token, newPassword) => {
    try {
      const response = await authAPI.resetPassword(token, newPassword)
      return response.data
    } catch (error) {
      throw error
    }
  }

  const value = {
    user,
    login,
    logout,
    loading,
    sendEmailVerification,
    verifyEmail,
    forgotPassword,
    resetPassword,
    forceLogout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
