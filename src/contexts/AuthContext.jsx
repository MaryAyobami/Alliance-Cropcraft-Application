"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

const decodeJwt = (token) => {
  try {
    const base64 = token.split('.')[1]
    const json = JSON.parse(atob(base64))
    return json
  } catch {
    return null
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expiryTimer, setExpiryTimer] = useState(null)

  const clearTimer = () => {
    if (expiryTimer) {
      clearTimeout(expiryTimer)
    }
  }

  const scheduleAutoLogout = useCallback((token) => {
    clearTimer()
    const payload = decodeJwt(token)
    if (!payload || !payload.exp) return
    const msUntilExpiry = payload.exp * 1000 - Date.now()
    if (msUntilExpiry <= 0) {
      logout()
      return
    }
    const timer = setTimeout(() => {
      logout()
    }, msUntilExpiry)
    setExpiryTimer(timer)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem("token")
    const userData = localStorage.getItem("user")

    if (token && userData) {
      setUser(JSON.parse(userData))
      scheduleAutoLogout(token)
    }
    setLoading(false)
    return () => clearTimer()
  }, [scheduleAutoLogout])

  const login = (token, userData) => {
    localStorage.setItem("token", token)
    localStorage.setItem("user", JSON.stringify(userData))
    setUser(userData)
    scheduleAutoLogout(token)
  }

  const logout = useCallback(() => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setUser(null)
  }, [])

  const value = {
    user,
    login,
    logout,
    loading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
