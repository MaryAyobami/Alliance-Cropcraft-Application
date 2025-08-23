"use client"

import { useState, useEffect, useMemo } from "react"
import { reportsAPI } from "../services/api"
import { TrendingUp, Users, DollarSign, Activity, Download } from "lucide-react"
import { Line, Doughnut } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend)

const Reports = () => {
  const [stats, setStats] = useState(null)
  const [staffPerformance, setStaffPerformance] = useState([])
  const [loading, setLoading] = useState(true)
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")

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

  const trendChart = useMemo(() => {
    const labels = (stats?.completionTrend || []).map(it => new Date(it.day).toLocaleDateString())
    const totals = (stats?.completionTrend || []).map(it => Number(it.total))
    const completes = (stats?.completionTrend || []).map(it => Number(it.completed))

    return {
      data: {
        labels,
        datasets: [
          {
            label: 'Completed',
            data: completes,
            borderColor: '#16a34a',
            backgroundColor: 'rgba(34,197,94,0.25)',
            tension: 0.3,
            fill: true,
          },
          {
            label: 'Total',
            data: totals,
            borderColor: '#94a3b8',
            backgroundColor: 'rgba(148,163,184,0.15)',
            tension: 0.3,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          tooltip: { mode: 'index', intersect: false },
        },
        interaction: { mode: 'nearest', intersect: false },
        scales: { y: { beginAtZero: true } },
      },
    }
  }, [stats])

  const distChart = useMemo(() => {
    const dist = stats?.distributionByPriority || []
    const labels = dist.map(d => d.label)
    const values = dist.map(d => Number(d.count))
    const palette = ['#22c55e','#86efac','#10b981','#059669','#065f46','#4ade80']

    return {
      data: {
        labels,
        datasets: [
          {
            label: 'Tasks',
            data: values,
            backgroundColor: labels.map((_, i) => palette[i % palette.length]),
            borderWidth: 1,
          },
        ],
      },
      options: {
        plugins: {
          legend: { position: 'bottom' },
        },
        cutout: '55%'
      },
    }
  }, [stats])

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
              <p className="text-sm text-gray-600">Total Tasks</p>
              <p className="text-2xl font-bold text-gray-900">{(stats?.completionTrend || []).reduce((a,b)=>a+Number(b.total||0),0)}</p>
              <p className="text-xs text-gray-500">Tasks in selected period</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{(stats?.completionTrend || []).reduce((a,b)=>a+Number(b.completed||0),0)}</p>
              <p className="text-xs text-gray-500">Completed tasks in period</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{Math.max(((stats?.completionTrend||[]).reduce((a,b)=>a+Number(b.total||0),0) - (stats?.completionTrend||[]).reduce((a,b)=>a+Number(b.completed||0),0)),0)}</p>
              <p className="text-xs text-gray-500">Remaining tasks in period</p>
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
              <p className="text-sm text-primary-600">Daily task totals vs completed</p>
            </div>
          </div>
          <div className="h-64">
            <Line data={trendChart.data} options={trendChart.options} />
          </div>
        </div>

        {/* Task Distribution by Priority */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">Task Distribution</h3>
              <p className="text-sm text-primary-600">By priority</p>
            </div>
          </div>
          <div className="flex items-center justify-center h-64">
            <div className="w-64 h-64">
              <Doughnut data={distChart.data} options={distChart.options} />
            </div>
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
