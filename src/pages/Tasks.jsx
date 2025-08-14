"use client"

import { useState, useEffect } from "react"
import { tasksAPI } from "../services/api"
import { CheckCircle, Clock, Filter, Upload, Camera } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"
import CreateTaskForm from "../components/CreateTaskForm"

const Tasks = () => {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [showCreateTaskForm, setShowCreateTaskForm] = useState(false)

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      const response = await tasksAPI.getTasks()
      setTasks(response.data)
    } catch (error) {
      console.error("Error fetching tasks:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteTask = async (taskId) => {
    try {
      await tasksAPI.completeTask(taskId)
      setTasks(
        tasks.map((task) =>
          task.id === taskId ? { ...task, status: "completed", completed_at: new Date().toISOString() } : task,
        ),
      )
    } catch (error) {
      console.error("Error completing task:", error)
    }
  }

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

  const filteredTasks = tasks.filter((task) => {
    if (filter === "all") return true
    return task.status === filter
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Task Management</h1>
          <p className="text-gray-600 mt-1">Manage and track livestock care tasks</p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-2 text-sm"
            >
              <option value="all">All Tasks</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          {user.role === "Admin" && (
        <button
          className="btn-primary text-sm"
          onClick={() => setShowCreateTaskForm(true)}
        >
          Create Task
        </button>
      )}

        {showCreateTaskForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-lg relative">
              <button
                onClick={() => setShowCreateTaskForm(false)}
                className="absolute top-2 right-3 text-gray-500 hover:text-black"
              >
                ✕
              </button>
              <CreateTaskForm />
            </div>
          </div>
        )}
          
        </div>
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTasks.map((task) => (
          <div key={task.id} className="card">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                {task.status === "completed" ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : (
                  <Clock className="w-6 h-6 text-gray-400" />
                )}
                <div>
                  <h3
                    className={`font-semibold ${task.status === "completed" ? "line-through text-gray-500" : "text-gray-900"}`}
                  >
                    {task.title}
                  </h3>
                  <span
                    className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}
                  >
                    {task.priority}
                  </span>
                </div>
              </div>

              {task.status === "completed" && (
                <div className="text-right">
                  <span className="text-xs text-gray-500">Evidence</span>
                  <div className="flex items-center space-x-1 mt-1">
                    <Camera className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-green-600">photo_evidence.jpg</span>
                  </div>
                </div>
              )}
            </div>

            <p className="text-gray-600 text-sm mb-4">{task.description}</p>

            <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
              <div className="flex items-center space-x-4">
                <span>⏰ {task.due_time}</span>
                {task.assigned_name && <span>👤 Assigned to: {task.assigned_name}</span>}
              </div>
            </div>

            {task.status === "completed" ? (
              <div className="text-sm text-green-600 font-medium">
                ✅ Completed at {new Date(task.completed_at).toLocaleTimeString()}
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleCompleteTask(task.id)}
                  className="btn-primary text-sm flex items-center space-x-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Mark Complete</span>
                </button>
                <button className="btn-secondary text-sm flex items-center space-x-2">
                  <Upload className="w-4 h-4" />
                  <span>Upload Photo</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
          <p className="text-gray-600">{filter === "all" ? "No tasks available." : `No ${filter} tasks found.`}</p>
        </div>
      )}
    </div>
  )
}

export default Tasks
