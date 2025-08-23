import { useEffect, useState } from "react"
import { tasksAPI } from "../services/api"
import { useSearchParams, useNavigate } from "react-router-dom"
import { CheckCircle, Clock, Calendar, User, ArrowLeft, Eye } from "lucide-react"

const TaskHistory = () => {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const week = searchParams.get("week") || "current"

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await tasksAPI.getHistory({ week })
        setTasks(response.data)
      } catch (error) {
        console.error("Error fetching task history:", error)
        setTasks([])
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [week])

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700"
      case "medium":
        return "bg-yellow-100 text-yellow-700"
      case "low":
        return "bg-green-100 text-green-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  const getStatusIcon = (status) => {
    return status === "completed" ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <Clock className="w-5 h-5 text-gray-400" />
    )
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Task History ({week === "current" ? "This Week" : week})
            </h1>
            <p className="text-gray-600 mt-1">
              {tasks.length} tasks found for this period
            </p>
          </div>
        </div>
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {tasks.map(task => (
          <div key={task.id} className="card hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                {getStatusIcon(task.status)}
                <div>
                  <h3 className={`font-semibold ${task.status === "completed" ? "line-through text-gray-500" : "text-gray-900"}`}>
                    {task.title}
                  </h3>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(task.priority)} mt-1`}>
                    {task.priority}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-gray-600 text-sm mb-4 line-clamp-2">{task.description}</p>

            <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
              <div className="flex items-center space-x-4">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {task.due_time || "No due time"}
                </span>
                {task.assigned_name && (
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {task.assigned_name}
                  </span>
                )}
              </div>
            </div>

            <span className="ml-2 text-xs px-2 py-1 rounded bg-gray-100 border border-gray-300">
              {task.tag === "static" ? "Static (Daily)" : "Dynamic (One-time)"}
            </span>

            <div className="flex justify-center mt-4">
              <button
                onClick={() => navigate(`/task-details/${task.id}`)}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center space-x-1 transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span>View Details</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {tasks.length === 0 && (
        <div className="text-center py-12">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
          <p className="text-gray-600">No tasks available for this time period.</p>
        </div>
      )}
    </div>
  )
}

export default TaskHistory