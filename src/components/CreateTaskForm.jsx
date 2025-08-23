import { useEffect, useState } from "react"
import { tasksAPI, userAPI } from "../services/api"

const CreateTaskForm = ({ onTaskCreated, onCancel }) => {
  const [users, setUsers] = useState([])
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    assigned_to: "",
    due_date: "",
    due_time: "",
    tag: "static",         
    recurrent: true,       
    active_date: ""        
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState({})
  const [success, setSuccess] = useState("")

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await userAPI.getUsers()
        setUsers(res.data)
      } catch (err) {
        setError("Failed to load users. Please refresh the page.")
        console.error("Failed to fetch users:", err)
      }
    }
    fetchUsers()
  }, [])

  const validateForm = () => {
    const errors = {}
    
    if (!formData.title.trim()) {
      errors.title = "Task title is required"
    } else if (formData.title.length > 100) {
      errors.title = "Title must be less than 100 characters"
    }
    
    if (!formData.assigned_to) {
      errors.assigned_to = "Please assign the task to someone"
    }
    
    if (!formData.due_date) {
      errors.due_date = "Due date is required"
    } else {
      const selectedDate = new Date(formData.due_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (selectedDate < today) {
        errors.due_date = "Due date cannot be in the past"
      }
    }
    
    if (formData.description && formData.description.length > 500) {
      errors.description = "Description must be less than 500 characters"
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors({ ...fieldErrors, [name]: "" })
    }
    
    // If changing tag, set recurrent and active_date accordingly
    if (name === "tag") {
      setFormData({
        ...formData,
        tag: value,
        recurrent: value === "static",
        active_date: value === "dynamic" ? formData.due_date : ""
      })
    } else if (name === "due_date") {
      setFormData({
        ...formData,
        due_date: value,
        active_date: formData.tag === "dynamic" ? value : ""
      })
    } else {
      setFormData({
        ...formData,
        [name]: value,
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    // Validate form
    if (!validateForm()) {
      setLoading(false)
      setError("Please fix the errors below")
      return
    }

    try {
      const response = await tasksAPI.createTask(formData)
      setSuccess("Task created successfully!")
      
      // Reset form
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        assigned_to: "",
        due_date: "",
        due_time: "",
        tag: "static",
        recurrent: true,
        active_date: ""
      })
      
      // Call parent callback if provided
      if (onTaskCreated) {
        onTaskCreated(response.data)
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000)
      
    } catch (err) {
      console.error("Task creation error:", err)
      const errorData = err.response?.data
      
      if (errorData?.field) {
        setFieldErrors({ [errorData.field]: errorData.message })
        setError("Please check the highlighted field")
      } else if (errorData?.message) {
        setError(errorData.message)
      } else if (err.code === 'ERR_NETWORK') {
        setError("Network error. Please check your connection and try again.")
      } else {
        setError("Failed to create task. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  const getFieldClassName = (fieldName) => {
    const baseClass = "w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-colors"
    if (fieldErrors[fieldName]) {
      return `${baseClass} border-red-500 focus:ring-red-200`
    }
    return `${baseClass} border-gray-300 focus:ring-primary-200 focus:border-primary-500`
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Create New Task</h2>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Cancel
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          maxLength={100}
          className={getFieldClassName('title')}
          placeholder="Enter task title"
        />
        {fieldErrors.title && (
          <p className="text-red-500 text-xs mt-1">{fieldErrors.title}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          maxLength={500}
          rows={3}
          className={getFieldClassName('description')}
          placeholder="Enter task description (optional)"
        />
        <div className="flex justify-between mt-1">
          {fieldErrors.description && (
            <p className="text-red-500 text-xs">{fieldErrors.description}</p>
          )}
          <p className="text-gray-400 text-xs ml-auto">
            {formData.description.length}/500
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            className={getFieldClassName('priority')}
          >
            <option value="high">🔴 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Task Type</label>
          <select
            name="tag"
            value={formData.tag}
            onChange={handleChange}
            className={getFieldClassName('tag')}
          >
            <option value="static">🔄 Static (Daily/Recurrent)</option>
            <option value="dynamic">📅 Dynamic (One-time)</option>
          </select>
        </div>
      </div>

      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
        {formData.tag === "static" && "This task will recur every day."}
        {formData.tag === "dynamic" && "This task will only be active on the selected date."}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Assign To <span className="text-red-500">*</span>
        </label>
        <select
          name="assigned_to"
          value={formData.assigned_to}
          onChange={handleChange}
          className={getFieldClassName('assigned_to')}
        >
          <option value="">-- Select User --</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.full_name} ({user.role})
            </option>
          ))}
        </select>
        {fieldErrors.assigned_to && (
          <p className="text-red-500 text-xs mt-1">{fieldErrors.assigned_to}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Due Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="due_date"
            value={formData.due_date}
            onChange={handleChange}
            min={new Date().toISOString().split('T')[0]}
            className={getFieldClassName('due_date')}
          />
          {fieldErrors.due_date && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.due_date}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Due Time</label>
          <input
            type="time"
            name="due_time"
            value={formData.due_time}
            onChange={handleChange}
            className={getFieldClassName('due_time')}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Creating Task...
          </span>
        ) : (
          "Create Task"
        )}
      </button>
    </form>
  )
}

export default CreateTaskForm
