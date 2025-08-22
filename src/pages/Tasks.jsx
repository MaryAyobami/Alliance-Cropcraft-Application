"use client"

import { useState, useEffect, useRef} from "react"
import { tasksAPI } from "../services/api"
import { CheckCircle, Clock, Filter, Upload, Camera, X, Eye, FileText, Calendar, User } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"
import CreateTaskForm from "../components/CreateTaskForm"


const Tasks = () => {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
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
  const videoRef = useRef(null)

  useEffect(() => {
    fetchTasks()
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
      console.log("=== DEBUGGING API RESPONSE ===")
      console.log("Full response object:", response)
      console.log("Response.data:", response.data)
      console.log("Type of response.data:", typeof response.data)
      console.log("Is response.data an array?", Array.isArray(response.data))
      
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
      
      console.log("Extracted tasks data:", tasksData)
      console.log("Number of tasks:", tasksData.length)
      
      if (tasksData.length > 0) {
        console.log("First task structure:", tasksData[0])
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

      console.log("Today's tasks:", todaysTasks)
      setTasks(todaysTasks)

    } catch (error) {
      console.error("Error fetching tasks:", error)
      setTasks([])
    } finally {
      setLoading(false)
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
    console.log("Filtering task:", task, "with filter:", filter)
    
    // Ensure task exists and has a status property
    if (!task || typeof task.status !== 'string') {
      console.warn('Task missing or has invalid status:', task)
      return false
    }
    
    if (filter === "all") return true
    
    const taskStatus = task.status.toLowerCase()
    const filterValue = filter.toLowerCase()
    const matches = taskStatus === filterValue
    
    console.log(`Task ${task.id} status: "${taskStatus}", filter: "${filterValue}", matches: ${matches}`)
    
    return matches
  })
  
  console.log("Final filtered tasks:", filteredTasks)
  console.log("Filter state:", filter)
  console.log("All tasks:", tasks)

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
          {user && user.role === "Admin" && (
            <button
              className="btn-primary text-sm"
              onClick={() => setShowCreateTaskForm(true)}
            >
              Create Task
            </button>
          )}
        </div>
      </div>

  {/* Tasks Grid */}
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6">
        {filteredTasks.map((task) => (
          <div key={task.id || Math.random()} className="card hover:shadow-lg transition-shadow">
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
                    className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(task.priority)} mt-1`}
                  >
                    {task.priority}
                  </span>
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

            <p className="text-gray-600 text-sm mb-4 line-clamp-2">{task.description}</p>

            <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
              <div className="flex items-center space-x-4">
                <span>📅 {task.due_time}</span>
              </div>
            </div>

            <span className="ml-2 text-xs px-2 py-1 rounded bg-gray-100 border border-gray-300">
              {task.tag === "static" ? "Static (Daily)" : "Dynamic (One-time)"}
            </span>

            {task.status === "completed" ? (
              <div className="flex items-center justify-between">
                <div className="text-sm text-green-600 font-medium">
                  ✅ Completed {task.completed_at ? new Date(task.completed_at).toLocaleString() : 'Recently'}
                </div>
                <button
                  onClick={() => handleCompletedTaskClick(task)}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center space-x-1 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Details</span>
                </button>
              </div>
            ) : (
              <div className="flex justify-center">
                <button
                  onClick={() => handleMarkCompleteClick(task)}
                  className="btn-primary text-sm flex items-center space-x-2 w-full justify-center"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Mark Complete</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Completion Form Modal */}
      {showCompletionForm && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Complete Task</h3>
                <button
                  onClick={closeCompletionForm}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">{selectedTask.title}</h4>
                  <p className="text-sm text-gray-600">{selectedTask.description}</p>
                </div>

                {/* Photo Upload */}
                <div>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} />
                      <button type="button" onClick={handleOpenCamera}>Take Photo</button>
                      {showCamera && (
                        <div>
                          <video ref={videoRef} autoPlay />
                          <button type="button" onClick={handleTakePhoto}>Capture</button>
                        </div>
                      )}
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Photo Evidence
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-primary-400 transition-colors">
                    {completionData.photoPreview ? (
                      <div className="space-y-2">
                        <img 
                          src={completionData.photoPreview} 
                          alt="Preview" 
                          className="max-w-full h-32 object-cover rounded-lg mx-auto"
                        />
                        <button
                          onClick={() => {
                            URL.revokeObjectURL(completionData.photoPreview)
                            setCompletionData(prev => ({ ...prev, photo: null, photoPreview: null }))
                          }}
                          className="text-red-500 text-sm"
                        >
                          Remove Photo
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 mb-1">Click to upload photo</p>
                        <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    value={completionData.notes}
                    onChange={(e) => setCompletionData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Add any additional notes about task completion..."
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                    rows="3"
                  />
                </div>

                <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                  📅 Completion time will be automatically recorded: {new Date().toLocaleString()}
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={closeCompletionForm}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitCompletion}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
                >
                  Complete Task
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
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl relative">
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

      {/* Empty State */}
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