"use client"

import { useState, useEffect } from "react"
import { reportsAPI } from "../services/api"
import { TrendingUp, Users, DollarSign, Activity, Download, BarChart3, PieChart, Cow, CheckCircle, AlertCircle, XCircle } from "lucide-react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement,
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement
)

const Reports = () => {
  const [stats, setStats] = useState(null)
  const [staffPerformance, setStaffPerformance] = useState([])
  const [taskTrends, setTaskTrends] = useState([])
  const [livestockStats, setLivestockStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")
  const [activeTab, setActiveTab] = useState("tasks")

  useEffect(() => {
    fetchReportsData()
  }, [])

  const fetchReportsData = async () => {
    setLoading(true)
    try {
      const params = {}
      if (start && end) {
        params.start = start
        params.end = end
      }
      const [statsResponse, staffResponse] = await Promise.all([
        reportsAPI.getStats(params),
        reportsAPI.getStaffPerformance(params),
      ])

      setStats(statsResponse.data)
      setStaffPerformance(staffResponse.data)
      
      // Generate mock trend data based on real stats
      generateTaskTrends(statsResponse.data)
      generateLivestockStats()
    } catch (error) {
      console.error("Error fetching reports data:", error)
    } finally {
      setLoading(false)
    }
  }

  const generateTaskTrends = (stats) => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const baseRate = stats?.taskCompletionRate || 75
    const trends = days.map((day, index) => ({
      day,
      completion: Math.max(30, Math.min(100, baseRate + (Math.random() - 0.5) * 20))
    }))
    setTaskTrends(trends)
  }

  const generateLivestockStats = () => {
    // Mock livestock statistics
    const stats = {
      totalLivestock: 156,
      healthyCount: 142,
      sickCount: 8,
      injuredCount: 3,
      underTreatmentCount: 3,
      typeDistribution: {
        'Cattle': 45,
        'Sheep': 38,
        'Goat': 32,
        'Chicken': 25,
        'Pig': 16
      },
      healthTrends: [
        { month: 'Jan', healthy: 95, sick: 3, injured: 2 },
        { month: 'Feb', healthy: 93, sick: 4, injured: 3 },
        { month: 'Mar', healthy: 91, sick: 5, injured: 4 },
        { month: 'Apr', healthy: 89, sick: 6, injured: 3 },
        { month: 'May', healthy: 87, sick: 7, injured: 4 },
        { month: 'Jun', healthy: 85, sick: 8, injured: 3 }
      ]
    }
    setLivestockStats(stats)
  }

  const exportCSV = async () => {
    try {
      const params = {}
      if (start && end) {
        params.start = start
        params.end = end
      }
      const res = await reportsAPI.exportReport(params)
      const blob = new Blob([res.data], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "report.csv"
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Export failed:", err)
    }
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            family: 'Poppins',
            size: 12,
          }
        }
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          font: {
            family: 'Inter',
          }
        }
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            family: 'Inter',
          }
        }
      }
    }
  }

  const taskTrendData = {
    labels: taskTrends.map(t => t.day),
    datasets: [
      {
        label: 'Task Completion %',
        data: taskTrends.map(t => t.completion),
        borderColor: '#16a34a',
        backgroundColor: 'rgba(22, 163, 74, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#16a34a',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
      },
    ],
  }

  const taskDistributionData = {
    labels: ['Feeding', 'Health Checks', 'Maintenance', 'Cleaning', 'Other'],
    datasets: [
      {
        data: [35, 25, 20, 15, 5],
        backgroundColor: [
          '#22c55e',
          '#3b82f6',
          '#f59e0b',
          '#8b5cf6',
          '#ef4444',
        ],
        borderColor: [
          '#16a34a',
          '#2563eb',
          '#d97706',
          '#7c3aed',
          '#dc2626',
        ],
        borderWidth: 2,
      },
    ],
  }

  const staffPerformanceChartData = {
    labels: staffPerformance.slice(0, 5).map(staff => staff.full_name.split(' ')[0]),
    datasets: [
      {
        label: 'Tasks Completed',
        data: staffPerformance.slice(0, 5).map(staff => staff.tasks_completed || 0),
        backgroundColor: 'rgba(22, 163, 74, 0.8)',
        borderColor: '#16a34a',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
      {
        label: 'Efficiency %',
        data: staffPerformance.slice(0, 5).map(staff => staff.efficiency || 0),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: '#3b82f6',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          font: {
            family: 'Inter',
            size: 11,
          }
        }
      },
    },
    cutout: '60%',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
          <p className="text-gray-600">Comprehensive insights into farm operations and performance</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input 
            type="date" 
            className="input-field !py-2 text-sm w-auto" 
            value={start} 
            onChange={(e) => setStart(e.target.value)} 
          />
          <input 
            type="date" 
            className="input-field !py-2 text-sm w-auto" 
            value={end} 
            onChange={(e) => setEnd(e.target.value)} 
          />
          <button onClick={fetchReportsData} className="btn-secondary text-sm">
            Apply Filters
          </button>
          <button onClick={exportCSV} className="btn-primary text-sm flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("tasks")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "tasks"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Task Reports
          </button>
          <button
            onClick={() => setActiveTab("livestock")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "livestock"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Livestock Reports
          </button>
        </nav>
      </div>

      {/* Task Reports Content */}
      {activeTab === "tasks" && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-enhanced">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 farm-gradient rounded-xl flex items-center justify-center shadow-lg">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Task Completion Rate</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.taskCompletionRate || 0}%</p>
              <p className="text-xs text-green-600 font-medium">+5.2% vs last week</p>
            </div>
          </div>
        </div>

        <div className="card-enhanced">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 sky-gradient rounded-xl flex items-center justify-center shadow-lg">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Active Livestock</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.activeLivestock || 0}</p>
              <p className="text-xs text-blue-600 font-medium">+2.1% vs last period</p>
            </div>
          </div>
        </div>

        <div className="card-enhanced">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Staff Efficiency</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.staffEfficiency || 0}%</p>
              <p className="text-xs text-purple-600 font-medium">+3.8% vs last period</p>
            </div>
          </div>
        </div>

        <div className="card-enhanced">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 earth-gradient rounded-xl flex items-center justify-center shadow-lg">
              <DollarSign className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Monthly Revenue</p>
              <p className="text-3xl font-bold text-gray-900">${stats?.monthlyRevenue || 0}k</p>
              <p className="text-xs text-orange-600 font-medium">+8.4% vs last period</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Task Completion Trend */}
        <div className="card-enhanced">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 farm-gradient rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Task Completion Trend</h3>
                <p className="text-sm text-gray-600">Daily completion rates over time</p>
              </div>
            </div>
          </div>
          <div className="h-80">
            <Line data={taskTrendData} options={chartOptions} />
          </div>
        </div>

        {/* Task Distribution */}
        <div className="card-enhanced">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 sky-gradient rounded-lg flex items-center justify-center">
                <PieChart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Task Distribution</h3>
                <p className="text-sm text-gray-600">Breakdown by task category</p>
              </div>
            </div>
          </div>
          <div className="h-80">
            <Doughnut data={taskDistributionData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      {/* Staff Performance Chart */}
      <div className="card-enhanced">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Staff Performance Overview</h3>
              <p className="text-sm text-gray-600">Tasks completed vs efficiency comparison</p>
            </div>
          </div>
        </div>
        <div className="h-96">
          <Bar data={staffPerformanceChartData} options={chartOptions} />
        </div>
      </div>

      {/* Staff Performance Leaderboard */}
      <div className="card-enhanced">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Staff Performance Leaderboard</h3>
            <p className="text-sm text-gray-600">Top performing team members {start && end ? `(${start} to ${end})` : '(last 7 days)'}</p>
          </div>
        </div>

        <div className="space-y-4">
          {staffPerformance.map((staff, index) => (
            <div key={staff.id} className="flex items-center justify-between p-5 bg-gradient-to-r from-gray-50 to-green-50/50 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200">
              <div className="flex items-center space-x-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-lg ${
                    index === 0
                      ? "bg-gradient-to-br from-yellow-400 to-yellow-600"
                      : index === 1
                        ? "bg-gradient-to-br from-gray-400 to-gray-600"
                        : index === 2
                          ? "bg-gradient-to-br from-orange-400 to-orange-600"
                          : "bg-gradient-to-br from-gray-300 to-gray-500"
                  }`}
                >
                  #{index + 1}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{staff.full_name}</p>
                  <p className="text-sm text-primary-600 font-medium">{staff.role}</p>
                </div>
              </div>

              <div className="flex items-center space-x-8 text-right">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Tasks Completed</p>
                  <p className="text-xl font-bold text-gray-900">{staff.tasks_completed || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Efficiency</p>
                  <p className="text-xl font-bold text-primary-600">{staff.efficiency || 0}%</p>
                </div>
              </div>
            </div>
          ))}
          {staffPerformance.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No staff performance data available for the selected period.</p>
            </div>
          )}
        </div>
      </div>

      {/* AI Insights */}
      <div className="card-enhanced">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 farm-gradient rounded-xl flex items-center justify-center shadow-lg">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">AI Insights & Recommendations</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 bg-gradient-to-br from-emerald-50 to-green-100 border border-emerald-200 rounded-xl">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
              <span className="font-semibold text-emerald-800">Performance Highlight</span>
            </div>
            <p className="text-sm text-gray-700">
              Task completion rate has improved by 5.2% this week. {staffPerformance[0]?.full_name || 'Top performer'} leads with {staffPerformance[0]?.efficiency || 96}% efficiency.
            </p>
          </div>

          <div className="p-5 bg-gradient-to-br from-orange-50 to-amber-100 border border-orange-200 rounded-xl">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="font-semibold text-orange-800">Attention Required</span>
            </div>
            <p className="text-sm text-gray-700">
              Livestock health checks are behind schedule. Consider reassigning veterinary tasks to optimize workflow.
            </p>
          </div>

          <div className="p-5 bg-gradient-to-br from-blue-50 to-cyan-100 border border-blue-200 rounded-xl">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="font-semibold text-blue-800">Optimization Tip</span>
            </div>
            <p className="text-sm text-gray-700">
              Morning feeding tasks show highest completion rates. Schedule critical tasks for 6-9 AM for optimal results.
            </p>
          </div>
        </div>
      </div>
        </>
      )}

      {/* Livestock Reports Content */}
      {activeTab === "livestock" && livestockStats && (
        <>
          {/* Livestock Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card-enhanced">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 farm-gradient rounded-xl flex items-center justify-center shadow-lg">
                  <Cow className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Livestock</p>
                  <p className="text-2xl font-bold text-gray-900">{livestockStats.totalLivestock}</p>
                </div>
              </div>
            </div>

            <div className="card-enhanced">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Healthy</p>
                  <p className="text-2xl font-bold text-gray-900">{livestockStats.healthyCount}</p>
                </div>
              </div>
            </div>

            <div className="card-enhanced">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                  <AlertCircle className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Sick</p>
                  <p className="text-2xl font-bold text-gray-900">{livestockStats.sickCount}</p>
                </div>
              </div>
            </div>

            <div className="card-enhanced">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                  <XCircle className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Under Treatment</p>
                  <p className="text-2xl font-bold text-gray-900">{livestockStats.underTreatmentCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Livestock Type Distribution */}
          <div className="card-enhanced">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <PieChart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Livestock Type Distribution</h3>
                  <p className="text-sm text-gray-600">Breakdown by animal type</p>
                </div>
              </div>
            </div>
            <div className="h-80">
              <Doughnut 
                data={{
                  labels: Object.keys(livestockStats.typeDistribution),
                  datasets: [{
                    data: Object.values(livestockStats.typeDistribution),
                    backgroundColor: [
                      '#22c55e',
                      '#3b82f6',
                      '#f59e0b',
                      '#8b5cf6',
                      '#ef4444',
                    ],
                    borderColor: [
                      '#16a34a',
                      '#2563eb',
                      '#d97706',
                      '#7c3aed',
                      '#dc2626',
                    ],
                    borderWidth: 2,
                  }]
                }} 
                options={doughnutOptions} 
              />
            </div>
          </div>

          {/* Health Trends Chart */}
          <div className="card-enhanced">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Health Trends</h3>
                  <p className="text-sm text-gray-600">Monthly health status overview</p>
                </div>
              </div>
            </div>
            <div className="h-96">
              <Line 
                data={{
                  labels: livestockStats.healthTrends.map(t => t.month),
                  datasets: [
                    {
                      label: 'Healthy',
                      data: livestockStats.healthTrends.map(t => t.healthy),
                      borderColor: '#22c55e',
                      backgroundColor: 'rgba(34, 197, 94, 0.1)',
                      fill: true,
                      tension: 0.4,
                    },
                    {
                      label: 'Sick',
                      data: livestockStats.healthTrends.map(t => t.sick),
                      borderColor: '#ef4444',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      fill: true,
                      tension: 0.4,
                    },
                    {
                      label: 'Injured',
                      data: livestockStats.healthTrends.map(t => t.injured),
                      borderColor: '#f59e0b',
                      backgroundColor: 'rgba(245, 158, 11, 0.1)',
                      fill: true,
                      tension: 0.4,
                    }
                  ]
                }} 
                options={chartOptions} 
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Reports
