"use client"

import React, { useState, useEffect, useRef} from "react"
import { useNavigate } from "react-router-dom"
import { tasksAPI } from "../services/api"
import { CheckCircle, Clock, Filter, Upload, Camera, X, Eye, FileText, Calendar, User, Edit, Trash2, Plus, Users } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"
import CreateTaskForm from "../components/CreateTaskForm"
import EditTaskForm from "../components/EditTaskForm"
import { format } from "date-fns"


const Tasks = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tasks, setTasks] = useState([])
  const [weeklyTasks, setWeeklyTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [showStaffOverview, setShowStaffOverview] = useState(false)
  const [staffViewMode, setStaffViewMode] = useState("cards") // cards, table
  const [showCreateTaskForm, setShowCreateTaskForm] = useState(false)
  const [showCompletionForm, setShowCompletionForm] = useState(false)
  const [showTaskDetails, setShowTaskDetails] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [completionData, setCompletionData] = useState({
    photo: null,
    notes: '',
    photoPreview: null
  })
  const [showCamera, setShowCamera] = useState(false)
  const [cameraStream, setCameraStream] = useState(null)
  const [showAllTasks, setShowAllTasks] = useState(false)
  const [showAllWeeklyTasks, setShowAllWeeklyTasks] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [showEditTaskForm, setShowEditTaskForm] = useState(false)
  const videoRef = useRef(null)

  // Role-based permissions
  const canCreate = ["Admin", "Farm Manager"].includes(user?.role)
  const canUpdate = ["Admin", "Farm Manager"].includes(user?.role)
  const canDelete = ["Admin", "Farm Manager"].includes(user?.role)

  useEffect(() => {
    fetchTasks()
    fetchWeeklyTasks()
  }, [])

  
  const handleOpenCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      setCameraStream(stream)
      setShowCamera(true)
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch (err) {
      alert("Camera access denied")
    }
  }

  const handleTakePhoto = () => {
    const canvas = document.createElement("canvas")
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0)
    canvas.toBlob(blob => {
      setCompletionData({ ...completionData, photo: blob, photoPreview: URL.createObjectURL(blob) })
      setShowCamera(false)
      cameraStream.getTracks().forEach(track => track.stop())
    }, "image/jpeg")
  }

  const fetchTasks = async () => {
    try {
      const response = await tasksAPI.getTasks()

      
      // Handle different possible response structures
      let tasksData = []
      
      if (Array.isArray(response.data)) {
        tasksData = response.data
      } else if (Array.isArray(response)) {
        tasksData = response
      } else if (response.data && Array.isArray(response.data.tasks)) {
        tasksData = response.data.tasks
      } else if (response.data && typeof response.data === 'object') {
        // If it's an object, try to find an array property
        const possibleArrays = Object.values(response.data).filter(value => Array.isArray(value))
        if (possibleArrays.length > 0) {
          tasksData = possibleArrays[0]
        }
      }
      

      
      const today = format(new Date(), "yyyy-MM-dd")

      const validatedTasks = tasksData.map(task => ({
        ...task,
        status: task.status || 'pending',
        priority: task.priority || 'medium',
        title: task.title || 'Untitled Task',
        description: task.description || '',
        due_time: task.due_time || 'No due date',
        tag: task.tag || 'static',
        recurrent: typeof task.recurrent === 'boolean' ? task.recurrent : (task.tag === 'static'),
        active_date: task.active_date || ""
      }))

      // Filter for today's tasks
      const todaysTasks = validatedTasks.filter(task => {
        if (task.tag === "static" && task.recurrent) return true
        if (task.tag === "dynamic" && task.active_date) {
          return format(new Date(task.active_date), "yyyy-MM-dd") === today
        }
        return false
      })


      setTasks(todaysTasks)

    } catch (error) {
      console.error("Error fetching tasks:", error)
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  const fetchWeeklyTasks = async () => {
    try {
      const response = await tasksAPI.getWeeklyHistory()
      if (response.data) {
        setWeeklyTasks(response.data)
      }
    } catch (error) {
      console.error("Error fetching weekly tasks:", error)
      setWeeklyTasks([])
    }
  }

  const handleMarkCompleteClick = (task) => {
    setSelectedTask(task)
    setShowCompletionForm(true)
    setCompletionData({
      photo: null,
      notes: '',
      photoPreview: null
    })
  }

  const handleCompletedTaskClick = (task) => {
    setSelectedTask(task)
    setShowTaskDetails(true)
  }

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setCompletionData(prev => ({
        ...prev,
        photo: file,
        photoPreview: URL.createObjectURL(file)
      }))
    }
  }

  const handleSubmitCompletion = async () => {
    try {
      const formData = new FormData()
      formData.append('taskId', selectedTask.id)
      formData.append('notes', completionData.notes)
      formData.append('completedAt', new Date().toISOString())
      
      if (completionData.photo) {
        formData.append('evidence', completionData.photo)
      }

      // Call API to complete task with evidence
      await tasksAPI.completeTaskWithEvidence(formData)
      
      // Update local state
      setTasks(tasks.map(task => 
        task.id === selectedTask.id 
          ? { 
              ...task, 
              status: "completed", 
              completed_at: new Date().toISOString(),
              completion_notes: completionData.notes,
              evidence_photo: completionData.photo ? completionData.photo.name : null
            } 
          : task
      ))

      // Close form
      setShowCompletionForm(false)
      setSelectedTask(null)
    } catch (error) {
      console.error("Error completing task:", error)
      alert("Failed to complete task. Please try again.")
    }
  }

  const closeCompletionForm = () => {
    setShowCompletionForm(false)
    setSelectedTask(null)
    if (completionData.photoPreview) {
      URL.revokeObjectURL(completionData.photoPreview)
    }
    setCompletionData({
      photo: null,
      notes: '',
      photoPreview: null
    })
  }

  const closeTaskDetails = () => {
    setShowTaskDetails(false)
    setSelectedTask(null)
  }

  const handleEditTask = (task) => {
    setEditingTask(task)
    setShowEditTaskForm(true)
  }

  const handleTaskUpdated = () => {
    setShowEditTaskForm(false)
    setEditingTask(null)
    fetchTasks() // Refetch tasks to get updated data
  }

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await tasksAPI.deleteTask(taskId)
        fetchTasks() // Refetch tasks to reflect deletion
      } catch (error) {
        console.error("Error deleting task:", error)
        alert("Failed to delete task. Please try again.")
      }
    }
  }

  const handleCancelEdit = () => {
    setShowEditTaskForm(false)
    setEditingTask(null)
  }

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

  // Fixed filtering with proper error handling and debugging
  const filteredTasks = tasks.filter((task) => {

    
    // Ensure task exists and has a status property
    if (!task || typeof task.status !== 'string') {
      console.warn('Task missing or has invalid status:', task)
      return false
    }
    
    if (filter === "all") return true
    
    const taskStatus = task.status.toLowerCase()
    const filterValue = filter.toLowerCase()
    const matches = taskStatus === filterValue
    

    
    return matches
  })

  // Categorize tasks for admin/farm manager view
  const categorizedTasks = React.useMemo(() => {
    if (!["Admin", "Farm Manager"].includes(user?.role)) {
      return { personal: filteredTasks, staff: [] }
    }

    const personal = filteredTasks.filter(task => 
      task.assigned_to === user?.id || task.created_by === user?.id
    )
    
    const staff = filteredTasks.filter(task => 
      task.assigned_to !== user?.id && task.created_by !== user?.id
    )

    return { personal, staff }
  }, [filteredTasks, user?.id, user?.role])



  // Send reminder function
  const handleSendReminder = async (taskId, assignedUserId) => {
    try {
      // Call API to send reminder
      await fetch(`/api/tasks/${taskId}/remind`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ assignedUserId })
      })
      alert('Reminder sent successfully!')
    } catch (error) {
      console.error('Failed to send reminder:', error)
      alert('Failed to send reminder. Please try again.')
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
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Task Management</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Tasks</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {canCreate && (
              <button
                className="btn-primary text-sm"
                onClick={() => setShowCreateTaskForm(true)}
              >
                Create Task
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Admin/Farm Manager Layout with Separate Sections */}
      {["Admin", "Farm Manager"].includes(user?.role) ? (
        <>
          {/* Personal Tasks Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Personal Tasks</h2>
              {categorizedTasks.personal.length > 6 && (
                <button
                  onClick={() => setShowAllTasks(!showAllTasks)}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  {showAllTasks ? "Show Less" : `See More (${categorizedTasks.personal.length - 6})`}
                </button>
              )}
            </div>

            {categorizedTasks.personal.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl">
                <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No personal tasks</h3>
                <p className="text-gray-600">You don't have any tasks assigned to you at the moment.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6">
                {(showAllTasks ? categorizedTasks.personal : categorizedTasks.personal.slice(0, 6)).map((task) => (
            <div 
              key={task.id || Math.random()} 
              className="card-enhanced cursor-pointer hover:shadow-lg transition-shadow duration-200"
              onClick={() => navigate(`/task-details/${task.id}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${task.status === "completed" ? "bg-green-100" : "bg-blue-100"}`}>
                    {task.status === "completed" ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Clock className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3
                      className={`text-lg font-semibold ${task.status === "completed" ? "line-through text-gray-500" : "text-gray-900"}`}
                    >
                      {task.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}
                      >
                        {task.priority}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                        {task.tag === "static" ? "Daily" : "One-time"}
                      </span>
                    </div>
                  </div>
                </div>

                {task.status === "completed" && task.evidence_photo && (
                  <div className="text-right">
                    <span className="text-xs text-gray-500">Evidence</span>
                    <div className="flex items-center space-x-1 mt-1">
                      <Camera className="w-4 h-4 text-green-500" />
                      <span className="text-xs text-green-600">Uploaded</span>
                    </div>
                  </div>
                )}
              </div>

              {task.description && (
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{task.description}</p>
              )}

              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700 font-medium">Due: {task.due_time}</span>
                  </div>
                  {task.assigned_to_name && (
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">{task.assigned_to_name}</span>
                    </div>
                  )}
                </div>
              </div>

              {task.status === "completed" ? (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-green-600 font-medium">
                    ✅ Completed {task.completed_at ? new Date(task.completed_at).toLocaleString() : 'Recently'}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCompletedTaskClick(task);
                      }}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center space-x-1 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Details</span>
                    </button>
                                          {canDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTask(task.id);
                          }}
                          className="px-2 py-1 text-red-600 hover:text-red-700 hover:bg-red-50 text-sm font-medium flex items-center space-x-1 transition-all duration-200 rounded-md"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete</span>
                        </button>
                      )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col space-y-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkCompleteClick(task);
                    }}
                    className="btn-primary text-sm flex items-center space-x-2 w-full justify-center"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Mark Complete</span>
                  </button>
                  {(canUpdate || canDelete) && (
                    <div className="flex justify-center space-x-2">
                      {canUpdate && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditTask(task);
                          }}
                          className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:text-blue-700 hover:bg-blue-100 text-sm font-medium flex items-center space-x-1 transition-all duration-200 rounded-md border border-blue-200"
                        >
                          <Edit className="w-4 h-4" />
                          <span>Edit</span>
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTask(task.id);
                          }}
                          className="px-3 py-1.5 bg-red-50 text-red-600 hover:text-red-700 hover:bg-red-100 text-sm font-medium flex items-center space-x-1 transition-all duration-200 rounded-md border border-red-200"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Staff Tasks Section */}
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Staff Tasks</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setStaffViewMode(staffViewMode === 'cards' ? 'table' : 'cards')}
            className="px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 text-sm font-medium rounded-xl border border-blue-200 transition-all"
          >
            {staffViewMode === 'cards' ? 'Table View' : 'Card View'}
          </button>
        </div>
      </div>

      {categorizedTasks.staff.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-xl">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No staff tasks</h3>
          <p className="text-gray-600">No tasks have been assigned to staff members.</p>
        </div>
      ) : staffViewMode === 'table' ? (
        /* Staff Tasks Table View */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-3 font-medium text-gray-700 border-b">Task</th>
                  <th className="text-left p-3 font-medium text-gray-700 border-b">Assigned To</th>
                  <th className="text-left p-3 font-medium text-gray-700 border-b">Due Date</th>
                  <th className="text-left p-3 font-medium text-gray-700 border-b">Due Time</th>
                  <th className="text-left p-3 font-medium text-gray-700 border-b">Status</th>
                  <th className="text-left p-3 font-medium text-gray-700 border-b">Priority</th>
                  <th className="text-left p-3 font-medium text-gray-700 border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categorizedTasks.staff.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3 border-b">
                      <div>
                        <div className="font-medium text-gray-900">{task.title}</div>
                        {task.description && (
                          <div className="text-sm text-gray-600 line-clamp-1">{task.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="p-3 border-b">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-blue-600">
                            {task.assigned_name ? task.assigned_name.split(' ').map(n => n[0]).join('') : 'UN'}
                          </span>
                        </div>
                        <span className="text-sm text-gray-700">{task.assigned_name || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="p-3 border-b">
                      <span className="text-sm text-gray-600">{task.due_date || 'Not set'}</span>
                    </td>
                    <td className="p-3 border-b">
                      <span className="text-sm text-gray-600">{task.due_time || 'Not set'}</span>
                    </td>
                    <td className="p-3 border-b">
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                        task.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : task.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="p-3 border-b">
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="p-3 border-b">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => navigate(`/task-details/${task.id}`)}
                          className="px-2 py-1 text-blue-600 hover:bg-blue-50 text-xs font-medium rounded transition-all"
                        >
                          View
                        </button>
                        {task.status !== 'completed' && task.assigned_to && (
                          <button
                            onClick={() => handleSendReminder(task.id, task.assigned_to)}
                            className="px-2 py-1 text-orange-600 hover:bg-orange-50 text-xs font-medium rounded transition-all"
                          >
                            Remind
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Staff Tasks Card View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {categorizedTasks.staff.slice(0, 6).map((task) => (
            <div 
              key={task.id || Math.random()} 
              className="card-enhanced cursor-pointer hover:shadow-lg transition-shadow duration-200"
              onClick={() => navigate(`/task-details/${task.id}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${task.status === "completed" ? "bg-green-100" : "bg-blue-100"}`}>
                    {task.status === "completed" ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Clock className="w-5 h-5 text-blue-600" />
                    )}
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
                    <span className="text-gray-700 font-medium">Due: {task.due_time}</span>
                  </div>
                  {task.assigned_name && (
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">{task.assigned_name}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-center space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/task-details/${task.id}`);
                  }}
                  className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:text-blue-700 hover:bg-blue-100 text-sm font-medium flex items-center space-x-1 transition-all duration-200 rounded-md border border-blue-200"
                >
                  <Eye className="w-4 h-4" />
                  <span>View</span>
                </button>
                {task.status !== 'completed' && task.assigned_to && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSendReminder(task.id, task.assigned_to);
                    }}
                    className="px-3 py-1.5 bg-orange-50 text-orange-600 hover:text-orange-700 hover:bg-orange-100 text-sm font-medium flex items-center space-x-1 transition-all duration-200 rounded-md border border-orange-200"
                  >
                    <User className="w-4 h-4" />
                    <span>Remind</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        )}
      )}
    </div>
  </>
) : (
  /* Regular User Layout */
  <div className="mb-8">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold text-gray-900">Today's Tasks</h2>
      {filteredTasks.length > 6 && (
        <button
          onClick={() => setShowAllTasks(!showAllTasks)}
          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
        >
          {showAllTasks ? "Show Less" : `See More (${filteredTasks.length - 6})`}
        </button>
      )}
    </div>

    {filteredTasks.length === 0 ? (
      <div className="text-center py-12 bg-gray-50 rounded-xl">
        <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
        <p className="text-gray-600">{filter === "all" ? "No tasks available." : `No ${filter} tasks found.`}</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6">
        {(showAllTasks ? filteredTasks : filteredTasks.slice(0, 6)).map((task) => (
          <div 
            key={task.id || Math.random()} 
            className="card-enhanced cursor-pointer hover:shadow-lg transition-shadow duration-200"
            onClick={() => navigate(`/task-details/${task.id}`)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${task.status === "completed" ? "bg-green-100" : "bg-blue-100"}`}>
                  {task.status === "completed" ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <Clock className="w-5 h-5 text-blue-600" />
                  )}
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

              {task.status === "completed" && task.evidence_photo && (
                <div className="text-right">
                  <span className="text-xs text-gray-500">Evidence</span>
                  <div className="flex items-center space-x-1 mt-1">
                    <Camera className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-green-600">Uploaded</span>
                  </div>
                </div>
              )}
            </div>

            {task.description && (
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">{task.description}</p>
            )}

            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700 font-medium">Due: {task.due_time}</span>
                </div>
                {task.assigned_to_name && (
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700">{task.assigned_to_name}</span>
                  </div>
                )}
              </div>
            </div>

            {task.status === "completed" ? (
              <div className="flex items-center justify-between">
                <div className="text-sm text-green-600 font-medium">
                  ✅ Completed {task.completed_at ? new Date(task.completed_at).toLocaleString() : 'Recently'}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCompletedTaskClick(task);
                    }}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center space-x-1 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Details</span>
                  </button>
                  {canDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTask(task.id);
                      }}
                      className="px-2 py-1 text-red-600 hover:text-red-700 hover:bg-red-50 text-sm font-medium flex items-center space-x-1 transition-all duration-200 rounded-md"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col space-y-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkCompleteClick(task);
                  }}
                  className="btn-primary text-sm flex items-center space-x-2 w-full justify-center"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Mark Complete</span>
                </button>
                {(canUpdate || canDelete) && (
                  <div className="flex justify-center space-x-2">
                    {canUpdate && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTask(task);
                        }}
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:text-blue-700 hover:bg-blue-100 text-sm font-medium flex items-center space-x-1 transition-all duration-200 rounded-md border border-blue-200"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Edit</span>
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTask(task.id);
                        }}
                        className="px-3 py-1.5 bg-red-50 text-red-600 hover:text-red-700 hover:bg-red-100 text-sm font-medium flex items-center space-x-1 transition-all duration-200 rounded-md border border-red-200"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
)}

      {/* Weekly Task History */}
      {weeklyTasks.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">This Week's Tasks</h2>
            {weeklyTasks.length > 6 && (
              <button
                onClick={() => setShowAllWeeklyTasks(!showAllWeeklyTasks)}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                {showAllWeeklyTasks ? "Show Less" : `See More (${weeklyTasks.length - 6})`}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {(showAllWeeklyTasks ? weeklyTasks : weeklyTasks.slice(0, 6)).map((task) => (
              <div 
                key={task.id || Math.random()} 
                className="card-enhanced cursor-pointer hover:shadow-lg transition-shadow duration-200"
                onClick={() => navigate(`/task-details/${task.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${task.status === "completed" ? "bg-green-100" : "bg-blue-100"}`}>
                      {task.status === "completed" ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3
                        className={`text-lg font-semibold ${task.status === "completed" ? "line-through text-gray-500" : "text-gray-900"}`}
                      >
                        {task.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}
                        >
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
                      <span className="text-gray-700 font-medium">Due: {task.due_time}</span>
                    </div>
                    {task.assigned_to_name && (
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700">{task.assigned_to_name}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-center mt-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCompletedTaskClick(task);
                    }}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center space-x-1 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Details</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completion Form Modal */}
      {showCompletionForm && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Complete Task</h3>
                    <p className="text-sm text-gray-500">Add evidence and notes</p>
                  </div>
                </div>
                <button
                  onClick={closeCompletionForm}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Task Info */}
              <div className="bg-blue-50 rounded-xl p-4 mb-6">
                <h4 className="font-semibold text-gray-900 mb-2">{selectedTask.title}</h4>
                <p className="text-sm text-gray-600 mb-3">{selectedTask.description}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>Due: {selectedTask.due_time}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>Completing: {new Date().toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Photo Upload Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <Camera className="w-4 h-4 inline mr-2" />
                    Photo Evidence
                  </label>
                  
                  {showCamera && (
                    <div className="mb-4 p-4 bg-gray-100 rounded-xl">
                      <video ref={videoRef} autoPlay className="w-full rounded-lg mb-3" />
                      <div className="flex space-x-2">
                        <button 
                          type="button" 
                          onClick={handleTakePhoto}
                          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          📸 Capture
                        </button>
                        <button 
                          type="button" 
                          onClick={() => {
                            setShowCamera(false);
                            if (cameraStream) {
                              cameraStream.getTracks().forEach(track => track.stop());
                            }
                          }}
                          className="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-primary-400 transition-colors">
                    {completionData.photoPreview ? (
                      <div className="space-y-3">
                        <img 
                          src={completionData.photoPreview} 
                          alt="Preview" 
                          className="max-w-full h-40 object-cover rounded-xl mx-auto shadow-md"
                        />
                        <div className="flex space-x-2 justify-center">
                          <button
                            onClick={() => {
                              URL.revokeObjectURL(completionData.photoPreview)
                              setCompletionData(prev => ({ ...prev, photo: null, photoPreview: null }))
                            }}
                            className="px-3 py-1 text-red-600 bg-red-50 rounded-lg text-sm hover:bg-red-100 transition-colors"
                          >
                            🗑️ Remove
                          </button>
                          <label className="px-3 py-1 text-blue-600 bg-blue-50 rounded-lg text-sm hover:bg-blue-100 transition-colors cursor-pointer">
                            🔄 Replace
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handlePhotoUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex justify-center space-x-4 mb-4">
                          <label className="flex flex-col items-center cursor-pointer p-3 rounded-xl border-2 border-transparent hover:border-blue-200 hover:bg-blue-50 transition-all">
                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                            <span className="text-sm font-medium text-gray-600">Upload File</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handlePhotoUpload}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={handleOpenCamera}
                            className="flex flex-col items-center p-3 rounded-xl border-2 border-transparent hover:border-green-200 hover:bg-green-50 transition-all"
                          >
                            <Camera className="w-8 h-8 text-gray-400 mb-2" />
                            <span className="text-sm font-medium text-gray-600">Take Photo</span>
                          </button>
                        </div>
                        <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <FileText className="w-4 h-4 inline mr-2" />
                    Completion Notes (Optional)
                  </label>
                  <textarea
                    value={completionData.notes}
                    onChange={(e) => setCompletionData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Describe what was completed, any issues encountered, or additional details..."
                    className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none transition-all"
                    rows="4"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 mt-8">
                <button
                  onClick={closeCompletionForm}
                  className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitCompletion}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all font-medium shadow-md hover:shadow-lg"
                >
                  ✅ Complete Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Details Modal */}
      {showTaskDetails && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Task Details</h3>
                <button
                  onClick={closeTaskDetails}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">{selectedTask.title}</h4>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(selectedTask.priority)}`}>
                    {selectedTask.priority} priority
                  </span>
                </div>

                <div>
                  <h5 className="font-medium text-gray-700 mb-2 flex items-center space-x-1">
                    <FileText className="w-4 h-4" />
                    <span>Description</span>
                  </h5>
                  <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedTask.description}</p>
                </div>

                <div>
                  <h5 className="font-medium text-gray-700 mb-2 flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>Timeline</span>
                  </h5>
                  <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                    <p className="text-sm"><span className="font-medium">Due:</span> {selectedTask.due_time}</p>
                    <p className="text-sm text-green-600">
                      <span className="font-medium">Completed:</span> {selectedTask.completed_at ? new Date(selectedTask.completed_at).toLocaleString() : 'Recently'}
                    </p>
                  </div>
                </div>

                {selectedTask.completion_notes && (
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Completion Notes</h5>
                    <p className="text-gray-600 bg-blue-50 p-3 rounded-lg">{selectedTask.completion_notes}</p>
                  </div>
                )}

                {selectedTask.evidence_photo && (
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2 flex items-center space-x-1">
                      <Camera className="w-4 h-4" />
                      <span>Evidence Photo</span>
                    </h5>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="flex items-center space-x-2 text-green-700">
                        <img
                          src={selectedTask.evidence_photo}
                          alt="Photo"
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                       
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Form Modal */}
      {showCreateTaskForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button
              onClick={() => setShowCreateTaskForm(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-black transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <CreateTaskForm />
          </div>
        </div>
      )}

      {/* Edit Task Form Modal */}
      {showEditTaskForm && editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button
              onClick={handleCancelEdit}
              className="absolute top-4 right-4 text-gray-500 hover:text-black transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <EditTaskForm 
              task={editingTask}
              onTaskUpdated={handleTaskUpdated}
              onCancel={handleCancelEdit}
            />
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
          <p className="text-gray-600">{filter === "all" ? "No tasks available." : `No ${filter} tasks found.`}</p>
        </div>
      )}

      {/* Staff Overview Modal */}
      {showStaffOverview && ["Admin", "Farm Manager"].includes(user?.role) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-6xl shadow-2xl relative max-h-[90vh] overflow-hidden">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Staff Tasks Overview</h3>
                    <p className="text-sm text-gray-500">Monitor and manage all staff assignments</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowStaffOverview(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Staff Tasks Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-3 font-medium text-gray-700 border-b">Task</th>
                      <th className="text-left p-3 font-medium text-gray-700 border-b">Assigned To</th>
                      <th className="text-left p-3 font-medium text-gray-700 border-b">Due Date</th>
                      <th className="text-left p-3 font-medium text-gray-700 border-b">Due Time</th>
                      <th className="text-left p-3 font-medium text-gray-700 border-b">Status</th>
                      <th className="text-left p-3 font-medium text-gray-700 border-b">Priority</th>
                      <th className="text-left p-3 font-medium text-gray-700 border-b">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.filter(task => task.assigned_to !== user?.id).map((task) => (
                      <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3 border-b">
                          <div>
                            <div className="font-medium text-gray-900">{task.title}</div>
                            {task.description && (
                              <div className="text-sm text-gray-600 line-clamp-1">{task.description}</div>
                            )}
                          </div>
                        </td>
                        <td className="p-3 border-b">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-blue-600">
                                {task.assigned_name ? task.assigned_name.split(' ').map(n => n[0]).join('') : 'UN'}
                              </span>
                            </div>
                            <span className="text-sm text-gray-700">{task.assigned_name || 'Unassigned'}</span>
                          </div>
                        </td>
                        <td className="p-3 border-b">
                          <span className="text-sm text-gray-600">{task.due_date || 'Not set'}</span>
                        </td>
                        <td className="p-3 border-b">
                          <span className="text-sm text-gray-600">{task.due_time || 'Not set'}</span>
                        </td>
                        <td className="p-3 border-b">
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                            task.status === 'completed' 
                              ? 'bg-green-100 text-green-800' 
                              : task.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {task.status}
                          </span>
                        </td>
                        <td className="p-3 border-b">
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="p-3 border-b">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => navigate(`/task-details/${task.id}`)}
                              className="px-2 py-1 text-blue-600 hover:bg-blue-50 text-xs font-medium rounded transition-all"
                            >
                              View
                            </button>
                            {task.status !== 'completed' && task.assigned_to && (
                              <button
                                onClick={() => handleSendReminder(task.id, task.assigned_to)}
                                className="px-2 py-1 text-orange-600 hover:bg-orange-50 text-xs font-medium rounded transition-all"
                              >
                                Remind
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {tasks.filter(task => task.assigned_to !== user?.id).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No staff tasks found
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Tasks