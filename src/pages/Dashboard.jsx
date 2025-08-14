"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import { dashboardAPI } from "../services/api"
import { TrendingUp, Users, Calendar, CheckCircle, Clock, Sun, Sunset, Moon } from "lucide-react"

const Dashboard = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [tasks, setTasks] = useState({ morning: [], afternoon: [], evening: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const statsResponse = await dashboardAPI.getStats()
        const tasksResponse = await dashboardAPI.getTasks()

        setStats(statsResponse.data)
        setTasks(tasksResponse.data)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const TaskSection = ({ title, tasks, icon: Icon, color }) => (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-primary-600">
              {tasks.filter((t) => t.status === "completed").length} of {tasks.length} completed
            </p>
          </div>
        </div>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div
          className="bg-primary-600 h-2 rounded-full transition-all duration-300"
          style={{
            width: `${tasks.length > 0 ? (tasks.filter((t) => t.status === "completed").length / tasks.length) * 100 : 0}%`,
          }}
        ></div>
      </div>

      <div className="space-y-3">
        {tasks.slice(0, 3).map((task) => (
          <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center space-x-3">
              {task.status === "completed" ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <Clock className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <p
                  className={`font-medium ${task.status === "completed" ? "line-through text-gray-500" : "text-gray-900"}`}
                >
                  {task.title}
                </p>
                <p className="text-sm text-gray-500">{task.due_time}</p>
              </div>
            </div>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </span>
          </div>
        ))}
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Good morning, {user?.full_name}!</h1>
            <p className="text-primary-100 mt-1">You have {stats?.pendingTasks || 0} pending tasks today</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{stats?.completedTasks || "0/0"}</div>
            <p className="text-primary-100">Tasks Completed</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.completionRate || 0}%</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Staff</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.activeStaff || 0}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">This Week</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.thisWeekTasks || 0} Tasks</p>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Schedule */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Today's Schedule</h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <TaskSection title="Morning Tasks" tasks={tasks.morning} icon={Sun} color="bg-orange-500" />

          <TaskSection title="Afternoon Tasks" tasks={tasks.afternoon} icon={Sunset} color="bg-red-500" />

          <TaskSection title="Evening Tasks" tasks={tasks.evening} icon={Moon} color="bg-purple-500" />
        </div>
      </div>
    </div>
  )
}

export default Dashboard
