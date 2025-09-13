import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import BreedingWorkflow from "../components/BreedingWorkflow"

const BreedingManagementPage = () => {
  const { user } = useAuth()

  // Check if user has access to breeding management
  const hasAccess = ["Admin", "Farm Manager", "Veterinary Doctor", "Supervisor"].includes(user?.role)

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔒</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access breeding management.</p>
        </div>
      </div>
    )
  }

  return <BreedingWorkflow />
}

export default BreedingManagementPage