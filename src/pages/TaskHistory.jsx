import { useEffect, useState } from "react"
import { tasksAPI } from "../services/api"
import { useSearchParams, useNavigate } from "react-router-dom"
import { CheckCircle, Clock, Calendar, User, ArrowLeft, Eye, Filter, Search, X } from "lucide-react"

const TaskHistory = () => {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const week = searchParams.get("week") || "current"
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterPriority, setFilterPriority] = useState("")
  const [filterType, setFilterType] = useState("")
  const [showFilters, setShowFilters] = useState(false)

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

  // Filter tasks based on search and filters
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.assigned_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = !filterStatus || task.status === filterStatus
    const matchesPriority = !filterPriority || task.priority === filterPriority
    const matchesType = !filterType || task.tag === filterType

    return matchesSearch && matchesStatus && matchesPriority && matchesType
  })

  const clearFilters = () => {
    setSearchTerm("")
    setFilterStatus("")
    setFilterPriority("")
    setFilterType("")
  }

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/tasks')}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Task History
            </h1>
            <p className="text-gray-600 mt-2">
              {week === "current" ? "This Week" : week} • {filteredTasks.length} of {tasks.length} tasks shown
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="mt-4 sm:mt-0 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-colors"
        >
          <Filter className="w-5 h-5" />
          <span>Filters</span>
        </button>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Tasks</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by title, description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">All Types</option>
                <option value="static">Daily Tasks</option>
                <option value="dynamic">One-time Tasks</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl flex items-center justify-center space-x-2 transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Clear</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tasks Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 p-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
            <p className="text-gray-600 mb-4">
              {tasks.length === 0 ? "No tasks available for this time period." : "Try adjusting your search criteria"}
            </p>
            {(searchTerm || filterStatus || filterPriority || filterType) && (
              <button
                onClick={clearFilters}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTasks.map(task => (
              <div 
                key={task.id} 
                className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/task-details/${task.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${task.status === "completed" ? "bg-green-100" : "bg-gray-100"}`}>
                      {getStatusIcon(task.status)}
                    </div>
                    <div className="flex-1">
                      <h3 className={`text-lg font-semibold ${task.status === "completed" ? "line-through text-gray-500" : "text-gray-900"}`}>
                        {task.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                          {task.tag === "static" ? "Daily" : "One-time"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {task.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{task.description}</p>
                )}

                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700 font-medium">Due: {task.due_time || "Not set"}</span>
                    </div>
                    {task.assigned_name && (
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700">{task.assigned_name}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-center">
                  <span className="text-primary-600 text-sm font-medium flex items-center space-x-1">
                    <Eye className="w-4 h-4" />
                    <span>View Details</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

export default TaskHistory