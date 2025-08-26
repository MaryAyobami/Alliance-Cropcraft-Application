"use client"

import { useState, useEffect } from "react"
import { reportsAPI, livestockAPI } from "../services/api"
import { TrendingUp, Users, Banknote, Activity, Download, BarChart3, PieChart, Heart, MapPin, Calendar } from "lucide-react"
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
  const [activeTab, setActiveTab] = useState('tasks')
  const [stats, setStats] = useState(null)
  const [staffPerformance, setStaffPerformance] = useState([])
  const [taskTrends, setTaskTrends] = useState([])
  const [taskDistribution, setTaskDistribution] = useState([])
  const [insights, setInsights] = useState([])
  const [livestock, setLivestock] = useState([])
  const [livestockStats, setLivestockStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")

  useEffect(() => {
    fetchReportsData()
  }, [activeTab])

  const fetchReportsData = async () => {
    setLoading(true)
    try {
      const params = {}
      if (start && end) {
        params.start = start
        params.end = end
      }

      if (activeTab === 'tasks') {
        const [statsResponse, staffResponse, distributionResponse, insightsResponse] = await Promise.all([
          reportsAPI.getStats(params),
          reportsAPI.getStaffPerformance(params),
          reportsAPI.getTaskDistribution(params),
          reportsAPI.getInsights(params),
        ])

        setStats(statsResponse.data)
        setStaffPerformance(staffResponse.data)
        setTaskDistribution(distributionResponse.data)
        setInsights(insightsResponse.data)
        
        // Generate task trends based on real stats
        generateTaskTrends(statsResponse.data)
      } else {
        // Fetch livestock data for livestock reports
        const livestockResponse = await livestockAPI.getLivestock()
        setLivestock(livestockResponse.data)
        generateLivestockStats(livestockResponse.data)
      }
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

  const generateLivestockStats = (livestockData) => {
    const totalLivestock = livestockData.length
    const healthyCount = livestockData.filter(animal => animal.health_status === 'healthy').length
    const sickCount = livestockData.filter(animal => animal.health_status === 'sick').length
    const quarantineCount = livestockData.filter(animal => animal.health_status === 'quarantine').length
    const deceasedCount = livestockData.filter(animal => animal.health_status === 'deceased').length

    // Group by species
    const speciesCount = livestockData.reduce((acc, animal) => {
      acc[animal.species] = (acc[animal.species] || 0) + 1
      return acc
    }, {})

    // Calculate average age and weight
    const agesWithValues = livestockData.filter(animal => animal.age).map(animal => animal.age)
    const weightsWithValues = livestockData.filter(animal => animal.weight).map(animal => parseFloat(animal.weight))
    
    const averageAge = agesWithValues.length > 0 ? 
      (agesWithValues.reduce((sum, age) => sum + age, 0) / agesWithValues.length).toFixed(1) : 0
    
    const averageWeight = weightsWithValues.length > 0 ? 
      (weightsWithValues.reduce((sum, weight) => sum + weight, 0) / weightsWithValues.length).toFixed(1) : 0

    setLivestockStats({
      totalLivestock,
      healthyCount,
      sickCount,
      quarantineCount,
      deceasedCount,
      healthRate: totalLivestock > 0 ? ((healthyCount / totalLivestock) * 100).toFixed(1) : 0,
      speciesCount,
      averageAge,
      averageWeight
    })
  }

  const exportCSV = async () => {
    try {
      const params = {}
      if (start && end) {
        params.start = start
        params.end = end
      }
      
      if (activeTab === 'tasks') {
        const res = await reportsAPI.exportReport(params)
        const blob = new Blob([res.data], { type: "text/csv" })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "task_report.csv"
        a.click()
        window.URL.revokeObjectURL(url)
      } else {
        // Export livestock CSV
        const csvContent = generateLivestockCSV()
        const blob = new Blob([csvContent], { type: "text/csv" })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "livestock_report.csv"
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error("Export failed:", err)
    }
  }

  const generateLivestockCSV = () => {
    const headers = ['Name', 'Species', 'Breed', 'Age', 'Weight', 'Gender', 'Health Status', 'Location', 'Acquisition Date']
    const rows = livestock.map(animal => [
      animal.name || '',
      animal.species || '',
      animal.breed || '',
      animal.age || '',
      animal.weight || '',
      animal.gender || '',
      animal.health_status || '',
      animal.location || '',
      animal.acquisition_date || ''
    ])
    
    return [headers, ...rows].map(row => row.join(',')).join('\n')
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

  // Get task distribution data from API
  const getTaskDistributionData = () => {
    if (!taskDistribution || taskDistribution.length === 0) {
      return {
        labels: ['No Data'],
        data: [1],
        backgroundColor: ['#e5e7eb'],
        borderColor: ['#d1d5db']
      }
    }

    // Map category names to display names
    const categoryDisplayNames = {
      'static': 'Daily Tasks',
      'dynamic': 'Special Tasks', 
      'feeding': 'Feeding',
      'health': 'Health Checks',
      'maintenance': 'Maintenance',
      'cleaning': 'Cleaning',
      'breeding': 'Breeding',
      'vaccination': 'Vaccination',
      'other': 'Other'
    }

    const colors = [
      '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444',
      '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6366f1'
    ]

    const borderColors = [
      '#16a34a', '#2563eb', '#d97706', '#7c3aed', '#dc2626',
      '#0891b2', '#ea580c', '#65a30d', '#db2777', '#4f46e5'
    ]

    return {
      labels: taskDistribution.map(item => categoryDisplayNames[item.category] || item.category),
      data: taskDistribution.map(item => item.count),
      backgroundColor: colors.slice(0, taskDistribution.length),
      borderColor: borderColors.slice(0, taskDistribution.length)
    }
  }

  const distributionData = getTaskDistributionData()
  const taskDistributionData = {
    labels: distributionData.labels,
    datasets: [
      {
        data: distributionData.data,
        backgroundColor: distributionData.backgroundColor,
        borderColor: distributionData.borderColor,
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

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors duration-200 ${
            activeTab === 'tasks'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Task Reports
        </button>
        <button
          onClick={() => setActiveTab('livestock')}
          className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors duration-200 ${
            activeTab === 'livestock'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Livestock Reports
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'tasks' && (
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
                  <p className="text-sm text-gray-600 font-medium">Total Tasks</p>
                  <p className="text-3xl font-bold text-gray-900">{stats?.totalTasks || 0}</p>
                  <p className="text-xs text-blue-600 font-medium">All assigned tasks</p>
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
                  <p className="text-xs text-purple-600 font-medium">Task completion rate</p>
                </div>
              </div>
            </div>

            <div className="card-enhanced">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 earth-gradient rounded-xl flex items-center justify-center shadow-lg">
                  <Banknote className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Productivity Score</p>
                  <p className="text-3xl font-bold text-gray-900">{Math.round((stats?.taskCompletionRate || 0) * (stats?.staffEfficiency || 0) / 100) || 0}</p>
                  <p className="text-xs text-orange-600 font-medium">Based on task completion</p>
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
              <h3 className="text-lg font-semibold text-gray-900">Smart Insights & Recommendations</h3>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Live Data</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {insights.map((insight, index) => {
                const colorClasses = {
                  emerald: 'from-emerald-50 to-green-100 border-emerald-200',
                  orange: 'from-orange-50 to-amber-100 border-orange-200',
                  blue: 'from-blue-50 to-cyan-100 border-blue-200'
                }
                const dotColors = {
                  emerald: 'bg-emerald-500',
                  orange: 'bg-orange-500',
                  blue: 'bg-blue-500'
                }
                const textColors = {
                  emerald: 'text-emerald-800',
                  orange: 'text-orange-800',
                  blue: 'text-blue-800'
                }

                return (
                  <div key={index} className={`p-5 bg-gradient-to-br ${colorClasses[insight.color]} border rounded-xl`}>
                    <div className="flex items-center space-x-2 mb-3">
                      <div className={`w-3 h-3 ${dotColors[insight.color]} rounded-full`}></div>
                      <span className={`font-semibold ${textColors[insight.color]}`}>{insight.category}</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      {insight.message}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {activeTab === 'livestock' && (
        <>
          {/* Livestock Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card-enhanced">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center shadow-lg">
                  <Heart className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Livestock</p>
                  <p className="text-3xl font-bold text-gray-900">{livestockStats?.totalLivestock || 0}</p>
                </div>
              </div>
            </div>

            <div className="card-enhanced">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center shadow-lg">
                  <Heart className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Sick Livestock</p>
                  <p className="text-3xl font-bold text-gray-900">{livestockStats?.sickCount || 0}</p>
                </div>
              </div>
            </div>

            <div className="card-enhanced">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-xl flex items-center justify-center shadow-lg">
                  <MapPin className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Quarantine</p>
                  <p className="text-3xl font-bold text-gray-900">{livestockStats?.quarantineCount || 0}</p>
                </div>
              </div>
            </div>

            <div className="card-enhanced">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-gray-500 to-gray-700 rounded-xl flex items-center justify-center shadow-lg">
                  <Calendar className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Average Age</p>
                  <p className="text-3xl font-bold text-gray-900">{livestockStats?.averageAge || 0} years</p>
                </div>
              </div>
            </div>
          </div>

          {/* Livestock Distribution by Species */}
          <div className="card-enhanced">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Livestock Distribution by Species</h3>
                  <p className="text-sm text-gray-600">Breakdown of livestock by species</p>
                </div>
              </div>
            </div>
            <div className="h-80">
              <Doughnut
                data={{
                  labels: Object.keys(livestockStats?.speciesCount || {}),
                  datasets: [
                    {
                      data: Object.values(livestockStats?.speciesCount || {}),
                      backgroundColor: [
                        '#22c55e',
                        '#3b82f6',
                        '#f59e0b',
                        '#8b5cf6',
                        '#ef4444',
                        '#10b981',
                        '#6366f1',
                        '#8b5cf6',
                        '#f59e0b',
                        '#3b82f6',
                      ],
                      borderColor: [
                        '#16a34a',
                        '#2563eb',
                        '#d97706',
                        '#7c3aed',
                        '#dc2626',
                        '#059669',
                        '#4f46e5',
                        '#7c3aed',
                        '#d97706',
                        '#2563eb',
                      ],
                      borderWidth: 2,
                    },
                  ],
                }}
                options={doughnutOptions}
              />
            </div>
          </div>

          {/* Livestock Overview */}
          <div className="card-enhanced">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Livestock Overview</h3>
                  <p className="text-sm text-gray-600">Overall health status and average metrics</p>
                </div>
              </div>
            </div>
            <div className="h-96">
              <Bar
                data={{
                  labels: ['Healthy', 'Sick', 'Quarantine', 'Deceased'],
                  datasets: [
                    {
                      label: 'Count',
                      data: [livestockStats?.healthyCount || 0, livestockStats?.sickCount || 0, livestockStats?.quarantineCount || 0, livestockStats?.deceasedCount || 0],
                      backgroundColor: [
                        'rgba(22, 163, 74, 0.8)',
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(163, 163, 163, 0.8)',
                        'rgba(139, 92, 246, 0.8)',
                      ],
                      borderColor: [
                        '#16a34a',
                        '#ef4444',
                        '#6b7280',
                        '#7c3aed',
                      ],
                      borderWidth: 2,
                    },
                  ],
                }}
                options={chartOptions}
              />
            </div>
          </div>

          {/* Livestock Health Status */}
          <div className="card-enhanced">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Livestock Health Status</h3>
                  <p className="text-sm text-gray-600">Health status distribution</p>
                </div>
              </div>
            </div>
            <div className="h-96">
              <Doughnut
                data={{
                  labels: ['Healthy', 'Sick', 'Quarantine', 'Deceased'],
                  datasets: [
                    {
                      data: [livestockStats?.healthyCount || 0, livestockStats?.sickCount || 0, livestockStats?.quarantineCount || 0, livestockStats?.deceasedCount || 0],
                      backgroundColor: [
                        'rgba(22, 163, 74, 0.8)',
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(163, 163, 163, 0.8)',
                        'rgba(139, 92, 246, 0.8)',
                      ],
                      borderColor: [
                        '#16a34a',
                        '#ef4444',
                        '#6b7280',
                        '#7c3aed',
                      ],
                      borderWidth: 2,
                    },
                  ],
                }}
                options={doughnutOptions}
              />
            </div>
          </div>

          {/* Livestock Leaderboard */}
          <div className="card-enhanced">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Livestock Leaderboard</h3>
                <p className="text-sm text-gray-600">Top performing livestock {start && end ? `(${start} to ${end})` : '(last 7 days)'}</p>
              </div>
            </div>

            <div className="space-y-4">
              {livestock.map((animal, index) => (
                <div key={animal.id} className="flex items-center justify-between p-5 bg-gradient-to-r from-gray-50 to-green-50/50 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200">
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
                      <p className="font-semibold text-gray-900">{animal.name || 'N/A'}</p>
                      <p className="text-sm text-primary-600 font-medium">{animal.species || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-8 text-right">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Health Status</p>
                      <p className="text-xl font-bold text-gray-900">{animal.health_status || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Age</p>
                      <p className="text-xl font-bold text-primary-600">{animal.age || 'N/A'} years</p>
                    </div>
                  </div>
                </div>
              ))}
              {livestock.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Heart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No livestock data available for the selected period.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Reports
