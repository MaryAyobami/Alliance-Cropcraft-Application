import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { tasksAPI } from "../services/api"
import { CheckCircle, Clock, Calendar, User, ArrowLeft, FileText, Camera, Tag, AlertCircle } from "lucide-react"

const TaskDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const response = await tasksAPI.getTaskDetails(id)
        setTask(response.data)
      } catch (error) {
        setTask(null)
      } finally {
        setLoading(false)
      }
    }
    fetchTask()
  }, [id])

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200"
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "low":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusIcon = (status) => {
    return status === "completed" ? (
      <CheckCircle className="w-6 h-6 text-green-500" />
    ) : (
      <Clock className="w-6 h-6 text-gray-400" />
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-6">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Task not found</h3>
          <p className="text-gray-600 mb-4">The task you're looking for doesn't exist or you don't have permission to view it.</p>
          <button
            onClick={() => navigate(-1)}
            className="btn-primary"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-2 sm:px-4 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/tasks')}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
            <div className="flex items-center gap-3 mt-2">
              {getStatusIcon(task.status)}
              <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full border ${getPriorityColor(task.priority)}`}>
                {task.priority} priority
              </span>
              <span className="text-sm text-gray-500 capitalize">
                Status: {task.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Task Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="card-enhanced">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Description</h3>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 leading-relaxed">
                {task.description || "No description provided"}
              </p>
            </div>
          </div>

          {/* Timeline */}
          <div className="card-enhanced">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Timeline</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">Due Date:</span>
                <span className="text-gray-600">{task.due_date || "Not specified"}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">Due Time:</span>
                <span className="text-gray-600">{task.due_time || "Not specified"}</span>
              </div>
              {task.completed_at && (
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="font-medium text-green-700">Completed:</span>
                  <span className="text-green-600">
                    {new Date(task.completed_at).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Completion Notes */}
          {task.completion_notes && (
            <div className="card-enhanced">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Completion Notes</h3>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-gray-700">
                  {task.completion_notes}
                </p>
              </div>
            </div>
          )}

          {/* Evidence Photo */}
          {task.evidence_photo && (
            <div className="card-enhanced">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Camera className="w-5 h-5 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Evidence Photo</h3>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <img
                  src={task.evidence_photo}
                  alt="Task completion evidence"
                  className="w-full max-w-md rounded-lg object-cover shadow-lg"
                />
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Task Type */}
          <div className="card-enhanced">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Tag className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Task Type</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">Type:</span>
                <span className="text-gray-600 capitalize">
                  {task.tag === "static" ? "Static (Daily)" : "Dynamic (One-time)"}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">Recurrent:</span>
                <span className="text-gray-600">
                  {task.recurrent ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </div>

          {/* Assignment */}
          <div className="card-enhanced">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
                <User className="w-5 h-5 text-cyan-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Assignment</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">Assigned To:</span>
                <span className="text-gray-600">
                  {task.assigned_name || "Unassigned"}
                </span>
              </div>
              {task.created_by_name && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">Created By:</span>
                  <span className="text-gray-600">
                    {task.created_by_name}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Created Date */}
          <div className="card-enhanced">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Created</h3>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">
                {task.created_at ? new Date(task.created_at).toLocaleDateString() : "Unknown"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TaskDetails