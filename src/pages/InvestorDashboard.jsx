import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import { investorAPI, livestockAPI, healthAPI, enhancedReportsAPI } from "../services/api"
import { getCachedData } from "../services/offlineSync"
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
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days ago
    to: new Date().toISOString().split('T')[0]
  })

  // Only investors can access this dashboard
  const canAccess = user?.role === "Investor"

  useEffect(() => {
    if (canAccess) {
      fetchDashboardData()
    }
  }, [canAccess, dateRange])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      if (navigator.onLine) {
        try {
          // Find investor record for current user
          const investorsResponse = await investorAPI.getInvestors()
          const currentInvestor = investorsResponse.data.find(inv => inv.user_id === user.id)
          
          if (!currentInvestor) {
            setError("No investor profile found. Please contact administration.")
            return
          }

          const [
            dashboardResponse,
            kpisResponse,
            allocationsResponse
          ] = await Promise.all([
            investorAPI.getInvestorDashboard(currentInvestor.id),
            investorAPI.getInvestorKPIs(currentInvestor.id, dateRange),
            investorAPI.getInvestorAllocations(currentInvestor.id)
          ])

          // Get detailed animal information
          const livestockResponse = await livestockAPI.getLivestock()
          const allocatedAnimals = livestockResponse.data.filter(animal =>
            allocationsResponse.data.some(allocation => allocation.animal_id === animal.id)
          )

          setDashboardData({
            portfolio: dashboardResponse.data,
            kpis: kpisResponse.data,
            allocatedAnimals,
            healthCoverage: kpisResponse.data.healthCoverage || 0,
            mortalityRate: kpisResponse.data.mortalityRate || 0,
            totalInvestment: currentInvestor.investment_amount || 0,
            expectedReturns: currentInvestor.expected_return_percentage || 0
          })

        } catch (apiError) {
          throw apiError
        }
      } else {
        throw new Error('Offline mode')
      }

      setError("")
    } catch (error) {
      console.error("Failed to fetch investor dashboard:", error)
      
      // Try to load some cached data
      try {
        const cachedLivestock = await getCachedData.livestock()
        setDashboardData(prev => ({
          ...prev,
          allocatedAnimals: cachedLivestock || []
        }))
        setError("Limited data available offline. Connect to internet for full dashboard.")
      } catch (cacheError) {
        setError("Failed to load dashboard data. Please check your connection.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleExportReport = async (reportType) => {
    try {
      const response = await enhancedReportsAPI.exportReport(reportType, {
        investor_id: dashboardData.portfolio?.id,
        ...dateRange
      })
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `investor-${reportType}-${dateRange.from}-${dateRange.to}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      
      alert("Report exported successfully!")
    } catch (error) {
      console.error("Failed to export report:", error)
      alert("Failed to export report. Please try again.")
    }
  }

  // Chart configurations
  const healthCoverageData = {
    labels: ['Vaccinated', 'Not Vaccinated'],
    datasets: [{
      data: [dashboardData.healthCoverage, 100 - dashboardData.healthCoverage],
      backgroundColor: ['#16a34a', '#ef4444'],
      borderWidth: 0
    }]
  }

  const speciesDistributionData = {
    labels: [...new Set(dashboardData.allocatedAnimals.map(animal => animal.species))],
    datasets: [{
      data: [...new Set(dashboardData.allocatedAnimals.map(animal => animal.species))]
        .map(species => dashboardData.allocatedAnimals.filter(animal => animal.species === species).length),
      backgroundColor: ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981'],
      borderWidth: 0
    }]
  }

  const mortalityTrendData = {
    labels: dashboardData.kpis?.mortalityTrend?.map(point => point.month) || [],
    datasets: [{
      label: 'Mortality Rate (%)',
      data: dashboardData.kpis?.mortalityTrend?.map(point => point.rate) || [],
      borderColor: '#ef4444',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      fill: true,
      tension: 0.4
    }]
  }

  const portfolioPerformanceData = {
    labels: dashboardData.kpis?.performanceHistory?.map(point => point.month) || [],
    datasets: [{
      label: 'Portfolio Value',
      data: dashboardData.kpis?.performanceHistory?.map(point => point.value) || [],
      borderColor: '#16a34a',
      backgroundColor: 'rgba(22, 163, 74, 0.1)',
      fill: true,
      tension: 0.4
    }]
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
        
        {/* Date Range Selector */}
        <div className="mt-4 sm:mt-0 flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          
          <button
            onClick={() => handleExportReport('investor')}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
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
                ₦{dashboardData.totalInvestment.toLocaleString()}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl shadow-sm border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">Portfolio Animals</p>
              <p className="text-2xl font-bold text-blue-900">{dashboardData.allocatedAnimals.length}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-xl shadow-sm border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700">Health Coverage</p>
              <p className="text-2xl font-bold text-purple-900">{dashboardData.healthCoverage.toFixed(1)}%</p>
            </div>
            <Heart className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-xl shadow-sm border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700">Mortality Rate</p>
              <p className="text-2xl font-bold text-orange-900">{dashboardData.mortalityRate.toFixed(2)}%</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Health Coverage Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Heart className="w-5 h-5 mr-2 text-green-600" />
            Health Coverage
          </h3>
          <div className="h-64 flex items-center justify-center">
            <Doughnut 
              data={healthCoverageData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom'
                  }
                }
              }} 
            />
          </div>
        </div>

        {/* Species Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <PieChart className="w-5 h-5 mr-2 text-blue-600" />
            Species Distribution
          </h3>
          <div className="h-64 flex items-center justify-center">
            <Doughnut 
              data={speciesDistributionData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom'
                  }
                }
              }} 
            />
          </div>
        </div>
      </div>

      {/* Performance Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Portfolio Performance */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
            Portfolio Performance
          </h3>
          <div className="h-64">
            <Line 
              data={portfolioPerformanceData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'Value (₦)'
                    }
                  }
                }
              }} 
            />
          </div>
        </div>

        {/* Mortality Trend */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
            Mortality Trend
          </h3>
          <div className="h-64">
            <Line 
              data={mortalityTrendData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'Mortality Rate (%)'
                    }
                  }
                }
              }} 
            />
          </div>
        </div>
      </div>

      {/* Portfolio Details */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Portfolio Animals
          </h2>
          <p className="text-gray-600 mt-1">Detailed view of your allocated animals</p>
        </div>

        <div className="p-6">
          {dashboardData.allocatedAnimals.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No animals allocated</h3>
              <p className="text-gray-600">Contact administration to allocate animals to your portfolio.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Animal</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Species</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Health Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Age</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Weight</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.allocatedAnimals.map((animal) => (
                    <tr key={animal.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{animal.name}</p>
                          <p className="text-sm text-gray-600">{animal.identification_number}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 capitalize">{animal.species}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                          animal.health_status === 'healthy' ? 'bg-green-100 text-green-800' :
                          animal.health_status === 'sick' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {animal.health_status}
                        </span>
                      </td>
                      <td className="py-3 px-4">{animal.age ? `${animal.age} years` : 'N/A'}</td>
                      <td className="py-3 px-4">{animal.weight ? `${animal.weight} kg` : 'N/A'}</td>
                      <td className="py-3 px-4">{animal.location || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
            <p className="text-xl font-bold text-gray-900">₦{dashboardData.totalInvestment.toLocaleString()}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-1">Expected Return</p>
            <p className="text-xl font-bold text-green-600">{dashboardData.expectedReturns}%</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-1">Investment Period</p>
            <p className="text-xl font-bold text-gray-900">
              {dashboardData.portfolio?.investment_date ? 
                Math.floor((Date.now() - new Date(dashboardData.portfolio.investment_date)) / (1000 * 60 * 60 * 24)) : 0
              } days
            </p>
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