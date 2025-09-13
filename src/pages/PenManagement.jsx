import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import PenManagement from "../components/PenManagement"

const PenManagementPage = () => {
  const { user } = useAuth()

  // Check if user has access to pen management
  const hasAccess = ["Admin", "Farm Manager", "Supervisor"].includes(user?.role)

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔒</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access pen management.</p>
        </div>
      </div>
    )
  }

  return <PenManagement />
}

export default PenManagementPage