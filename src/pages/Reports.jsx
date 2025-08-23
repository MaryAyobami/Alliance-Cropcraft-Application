"use client"

import { useState, useEffect, useMemo } from "react"
import { reportsAPI } from "../services/api"
import { TrendingUp, Users, DollarSign, Activity, Download } from "lucide-react"

const BarChart = ({ data }) => {
  const maxRate = Math.max(100, ...data.map(d => d.rate))
  return (
    <div className="h-64 flex items-end gap-2 p-4 bg-gradient-to-t from-primary-50 to-transparent rounded-xl">
      {data.map((d, idx) => (
        <div key={idx} className="flex-1 flex flex-col items-center">
          <div className="w-6 sm:w-8 bg-primary-600 rounded-t" style={{ height: `${(d.rate/maxRate)*100}%` }}></div>
          <div className="text-[10px] sm:text-xs text-gray-500 mt-1">{d.date.slice(5)}</div>
        </div>
      ))}
    </div>
  )
}

const DonutChart = ({ data }) => {
  const total = data.reduce((s, d) => s + d.count, 0)
  let acc = 0
  const segments = data.map((d, i) => {
    const start = acc / total * 360
    acc += d.count
    const end = acc / total * 360
    const color = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#10b981"][i % 6]
    return `${color} ${start}deg ${end}deg`
  }).join(',')
  return (
    <div className="flex items-center justify-center h-64">
      <div className="relative w-48 h-48">
        <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(${segments})` }}></div>
        <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{total}</div>
            <div className="text-sm text-gray-500">Tasks</div>
          </div>
        </div>
      </div>
    </div>
  )
}

const Reports = () => {
  const [stats, setStats] = useState(null)
  const [staffPerformance, setStaffPerformance] = useState([])
  const [loading, setLoading] = useState(true)
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")
  const [trend, setTrend] = useState([])
  const [distribution, setDistribution] = useState([])

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
      const [statsResponse, staffResponse, trendRes, distRes] = await Promise.all([
        reportsAPI.getStats(params),
        reportsAPI.getStaffPerformance(params),
        reportsAPI.getCompletionTrend(params),
        reportsAPI.getTaskDistribution(params),
      ])

      setStats(statsResponse.data)
      setStaffPerformance(staffResponse.data)
      setTrend(trendRes.data.data || [])
      setDistribution(distRes.data.data || [])
    } catch (error) {
      console.error("Error fetching reports data:", error)
    } finally {
      setLoading(false)
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Comprehensive insights into farm operations and performance</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <input type="date" className="border border-gray-300 rounded-xl px-3 py-2 text-sm" value={start} onChange={(e) => setStart(e.target.value)} />
          <input type="date" className="border border-gray-300 rounded-xl px-3 py-2 text-sm" value={end} onChange={(e) => setEnd(e.target.value)} />
          <button onClick={fetchReportsData} className="btn-secondary text-sm">Apply</button>
          <button onClick={exportCSV} className="btn-primary text-sm flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

  {/* Stats Cards */}
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Task Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.taskCompletionRate || 0}%</p>
              <p className="text-xs text-gray-500">Average completion rate this period</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Livestock</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.activeLivestock || 0}</p>
              <p className="text-xs text-gray-500">Total healthy livestock count</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Staff Efficiency</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.staffEfficiency || 0}%</p>
              <p className="text-xs text-gray-500">Average staff productivity score</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Monthly Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${stats?.monthlyRevenue || 0}k</p>
              <p className="text-xs text-gray-500">Livestock products revenue</p>
            </div>
          </div>
        </div>
      </div>

  {/* Charts Section */}
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Task Completion Trend */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">Task Completion Trend</h3>
              <p className="text-sm text-primary-600">Daily task completion rates over the selected period</p>
            </div>
          </div>

          <BarChart data={trend} />
        </div>

        {/* Task Distribution */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">Task Distribution (by priority)</h3>
              <p className="text-sm text-primary-600">Breakdown of tasks by priority</p>
            </div>
          </div>

          <DonutChart data={distribution} />

          <div className="grid grid-cols-2 gap-4 mt-4">
            {distribution.map((d, i) => (
              <div key={i} className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ["#22c55e","#3b82f6","#f59e0b","#ef4444","#8b5cf6","#10b981"][i % 6] }}></div>
                <span className="text-sm text-gray-600">{d.label}: {d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Staff Performance */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-gray-900">Staff Performance Leaderboard</h3>
            <p className="text-sm text-primary-600">Top performing staff members {start && end ? `(${start} to ${end})` : '(last 7 days)'}</p>
          </div>
        </div>

        <div className="space-y-4">
          {staffPerformance.map((staff, index) => (
            <div key={staff.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center space-x-4">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                    index === 0
                      ? "bg-yellow-500"
                      : index === 1
                        ? "bg-gray-400"
                        : index === 2
                          ? "bg-orange-600"
                          : "bg-gray-300"
                  }`}
                >
                  #{index + 1}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{staff.full_name}</p>
                  <p className="text-sm text-primary-600">{staff.role}</p>
                </div>
              </div>

              <div className="flex items-center space-x-8 text-right">
                <div>
                  <p className="text-sm text-gray-600">Tasks Completed</p>
                  <p className="font-bold text-gray-900">{staff.tasks_completed || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Efficiency</p>
                  <p className="font-bold text-gray-900">{staff.efficiency || 0}%</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Reports
