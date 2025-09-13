import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import { investorAPI, enhancedReportsAPI } from "../services/api"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Heart,
  AlertTriangle,
  BarChart3,
  PieChart,
  Calendar,
  Download,
  Eye,
  Activity,
  Users,
  Target
} from "lucide-react"
import { Doughnut, Line, Bar } from 'react-chartjs-2'

const InvestorDashboard = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [dashboardData, setDashboardData] = useState({
    portfolio: null,
    kpis: null,
    allocatedAnimals: [],
    healthCoverage: 0,
    mortalityRate: 0,
    totalInvestment: 0,
    expectedReturns: 0
  })

  // Only investors can access this dashboard
  const canAccess = user?.role === "Investor"

  useEffect(() => {
    if (canAccess) {
      fetchDashboardData()
    }
  }, [canAccess])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      if (navigator.onLine) {
        try {
          const dashboardResponse = await investorAPI.getMyDashboard()
          setDashboardData(dashboardResponse.data)
        } catch (apiError) {
          console.error('API Error:', apiError)
          setError("Failed to load dashboard data. Please try again.")
        }
      } else {
        setError("Dashboard requires internet connection.")
      }

      setError("")
    } catch (error) {
      console.error("Failed to fetch investor dashboard:", error)
      setError("Failed to load dashboard data. Please check your connection.")
    } finally {
      setLoading(false)
    }
  }

  if (!canAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">This dashboard is only available to investors.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Investor Dashboard</h1>
          <p className="text-gray-600 mt-2">Monitor your livestock investment portfolio</p>
        </div>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-xl flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl shadow-sm border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Total Investment</p>
              <p className="text-2xl font-bold text-green-900">
                ₦{dashboardData.totalInvestment?.toLocaleString() || '0'}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl shadow-sm border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">Portfolio Animals</p>
              <p className="text-2xl font-bold text-blue-900">{dashboardData.allocatedAnimals?.length || 0}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-xl shadow-sm border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700">Health Coverage</p>
              <p className="text-2xl font-bold text-purple-900">{dashboardData.healthCoverage?.toFixed(1) || '0'}%</p>
            </div>
            <Heart className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-xl shadow-sm border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700">Mortality Rate</p>
              <p className="text-2xl font-bold text-orange-900">{dashboardData.mortalityRate?.toFixed(2) || '0'}%</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Portfolio Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Portfolio Summary
          </h2>
          <p className="text-gray-600 mt-1">Overview of your livestock investments</p>
        </div>

        <div className="p-6">
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Portfolio Data Loading</h3>
            <p className="text-gray-600">
              Your investment portfolio data will be displayed here once the backend endpoints are fully configured.
            </p>
          </div>
        </div>
      </div>

      {/* Investment Summary */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Target className="w-5 h-5 mr-2" />
          Investment Summary
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-4 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-1">Initial Investment</p>
            <p className="text-xl font-bold text-gray-900">₦{dashboardData.totalInvestment?.toLocaleString() || '0'}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-1">Expected Return</p>
            <p className="text-xl font-bold text-green-600">{dashboardData.expectedReturns || 0}%</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-1">Portfolio Animals</p>
            <p className="text-xl font-bold text-gray-900">{dashboardData.allocatedAnimals?.length || 0}</p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> This dashboard provides real-time insights into your livestock investment portfolio. 
            All data is updated regularly to reflect the current status of your allocated animals and investment performance.
          </p>
        </div>
      </div>
    </div>
  )
}

export default InvestorDashboard