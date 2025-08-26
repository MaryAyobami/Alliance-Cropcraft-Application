import { useState } from "react"
import { eventsAPI } from "../services/api"

const CreateEventForm = ({ onEventCreated, onCancel }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    event_date: "",
    event_time: "",
    location: "",
    type: "meeting",
    priority: "medium",
    participants: ""
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState({})
  const [success, setSuccess] = useState("")

  const validateForm = () => {
    const errors = {}
    
    if (!formData.title.trim()) {
      errors.title = "Event title is required"
    } else if (formData.title.length > 100) {
      errors.title = "Title must be less than 100 characters"
    }
    
    if (!formData.event_date) {
      errors.event_date = "Event date is required"
    } else {
      // Compare date strings directly to avoid timezone issues
      const selectedDate = formData.event_date
      const today = new Date().toISOString().split('T')[0]
      
      if (selectedDate < today) {
        errors.event_date = "Event date cannot be in the past"
      }
    }
    
    if (formData.description && formData.description.length > 500) {
      errors.description = "Description must be less than 500 characters"
    }

    // Validate participant emails
    if (formData.participants) {
      const emails = formData.participants.split(',').map(email => email.trim()).filter(email => email)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const invalidEmails = emails.filter(email => !emailRegex.test(email))
      
      if (invalidEmails.length > 0) {
        errors.participants = `Invalid email(s): ${invalidEmails.join(', ')}`
      }
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
    
    setFormData({
      ...formData,
      [name]: value,
    })
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
      const response = await eventsAPI.createEvent(formData)
      setSuccess("Event created successfully!")
      
      // Reset form
      setFormData({
        title: "",
        description: "",
        event_date: "",
        event_time: "",
        location: "",
        type: "meeting",
        priority: "medium",
        participants: ""
      })
      
      // Call parent callback if provided
      if (onEventCreated) {
        onEventCreated(response.data)
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000)
      
    } catch (err) {
      console.error("Event creation error:", err)
      const errorData = err.response?.data
      
      if (errorData?.field) {
        setFieldErrors({ [errorData.field]: errorData.message })
        setError("Please check the highlighted field")
      } else if (errorData?.message) {
        setError(errorData.message)
      } else if (err.code === 'ERR_NETWORK') {
        setError("Network error. Please check your connection and try again.")
      } else {
        setError("Failed to create event. Please try again.")
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
    <div className="max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
    <form onSubmit={handleSubmit} className="space-y-4 px-1 pb-4">
      <div className="flex items-center justify-between sticky top-0 bg-white pt-2 pb-4 z-10">
        <h2 className="text-xl font-semibold text-gray-900">Create New Event</h2>
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
          placeholder="Enter event title"
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
          placeholder="Enter event description (optional)"
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Participant Emails
        </label>
        <input
          type="text"
          name="participants"
          value={formData.participants}
          onChange={handleChange}
          className={getFieldClassName('participants')}
          placeholder="Enter participant emails separated by commas (e.g., user1@email.com, user2@email.com)"
        />
        {fieldErrors.participants && (
          <p className="text-red-500 text-xs mt-1">{fieldErrors.participants}</p>
        )}
        <p className="text-gray-500 text-xs mt-1">
          Participants will receive email invitations and calendar sync notifications
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className={getFieldClassName('type')}
          >
            <option value="meeting">Meeting</option>
            <option value="event">Event</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            className={getFieldClassName('priority')}
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
        <input
          type="text"
          name="location"
          value={formData.location}
          onChange={handleChange}
          maxLength={200}
          className={getFieldClassName('location')}
          placeholder="Enter event location (optional)"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Event Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="event_date"
            value={formData.event_date}
            onChange={handleChange}
            min={new Date().toISOString().split('T')[0]}
            className={getFieldClassName('event_date')}
          />
          {fieldErrors.event_date && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.event_date}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Event Time</label>
          <input
            type="time"
            name="event_time"
            value={formData.event_time}
            onChange={handleChange}
            className={getFieldClassName('event_time')}
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
            Creating Event...
          </span>
        ) : (
          "Create Event"
        )}
      </button>
    </form>
    </div>
  )
}

export default CreateEventForm