"use client"

import { useState, useEffect } from "react"
import { eventsAPI } from "../services/api"
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react"

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    event_date: "",
    event_time: "",
    location: "",
    type: "Task",
    priority: "medium",
    reminder_minutes: 30,
    notify: true,
  })
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      const response = await eventsAPI.getEvents()
      setEvents(response.data)
    } catch (error) {
      console.error("Error fetching events:", error)
    } finally {
      setLoading(false)
    }
  }

  const validateEvent = (eventData) => {
    const errors = {}
    
    if (!eventData.title.trim()) {
      errors.title = "Event title is required"
    } else if (eventData.title.length > 100) {
      errors.title = "Title must be less than 100 characters"
    }
    
    if (!eventData.event_date) {
      errors.event_date = "Event date is required"
    } else {
      const selectedDate = new Date(eventData.event_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (selectedDate < today) {
        errors.event_date = "Event date cannot be in the past"
      }
    }
    
    if (eventData.description && eventData.description.length > 500) {
      errors.description = "Description must be less than 500 characters"
    }

    if (eventData.location && eventData.location.length > 100) {
      errors.location = "Location must be less than 100 characters"
    }

    return errors
  }

  const handleCreateEvent = async (e) => {
    e.preventDefault()
    setError("")
    setFieldErrors({})

    // Validate event data
    const errors = validateEvent(newEvent)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setError("Please fix the errors below")
      return
    }

    try {
      const response = await eventsAPI.createEvent(newEvent)
      setEvents([...events, response.data])
      setShowModal(false)
      setNewEvent({
        title: "",
        description: "",
        event_date: "",
        event_time: "",
        location: "",
        type: "Task",
        priority: "medium",
        reminder_minutes: 30,
        notify: true,
      })
      setError("")
      setFieldErrors({})
      
      // Show success notification (you can replace this with a toast)
      alert("Event created successfully!")
      
    } catch (error) {
      console.error("Error creating event:", error)
      const errorData = error.response?.data
      
      if (errorData?.field) {
        setFieldErrors({ [errorData.field]: errorData.message })
        setError("Please check the highlighted field")
      } else if (errorData?.message) {
        setError(errorData.message)
      } else if (error.code === 'ERR_NETWORK') {
        setError("Network error. Please check your connection and try again.")
      } else {
        setError("Failed to create event. Please try again.")
      }
    }
  }

  const handleUpdateEvent = async (e) => {
    e.preventDefault()
    if (!editingEvent) return
    try {
      const { id, ...payload } = editingEvent
      const response = await eventsAPI.updateEvent(id, payload)
      setEvents(events.map((ev) => (ev.id === id ? response.data : ev)))
      setEditingEvent(null)
    } catch (error) {
      console.error("Error updating event:", error)
    }
  }

  const handleDeleteEvent = async (id) => {
    try {
      await eventsAPI.deleteEvent(id)
      setEvents(events.filter((e) => e.id !== id))
    } catch (error) {
      console.error("Error deleting event:", error)
    }
  }

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }

    return days
  }

  const getEventsForDate = (day) => {
    if (!day) return []

    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    return events.filter((event) => event.event_date === dateStr)
  }

  const getUpcomingEvents = () => {
    const today = new Date()
    const upcoming = events
      .filter((event) => new Date(event.event_date) >= today)
      .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
      .slice(0, 5)
    return upcoming
  }

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate)
    newDate.setMonth(currentDate.getMonth() + direction)
    setCurrentDate(newDate)
  }

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-600 mt-1">Schedule and manage farm tasks and events</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <select className="border border-gray-300 rounded-xl px-3 py-2 text-sm">
            <option>All</option>
          </select>
          <button onClick={() => setShowModal(true)} className="btn-primary text-sm flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Calendar */}
        <div className="lg:col-span-3">
          <div className="card">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
              </div>

              <div className="flex items-center space-x-2">
                <button onClick={() => navigateMonth(-1)} className="p-2 hover:bg-gray-100 rounded-xl">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-xl"
                >
                  Today
                </button>
                <button onClick={() => navigateMonth(1)} className="p-2 hover:bg-gray-100 rounded-xl">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Day headers */}
              {dayNames.map((day) => (
                <div key={day} className="p-3 text-center text-sm font-medium text-gray-500">
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {getDaysInMonth(currentDate).map((day, index) => {
                const dayEvents = getEventsForDate(day)
                const isToday =
                  day &&
                  new Date().getDate() === day &&
                  new Date().getMonth() === currentDate.getMonth() &&
                  new Date().getFullYear() === currentDate.getFullYear()

                return (
                  <div
                    key={index}
                    className={`min-h-[120px] p-2 border border-gray-100 ${
                      day ? "hover:bg-gray-50" : ""
                    } ${isToday ? "bg-primary-50 border-primary-200" : ""}`}
                  >
                    {day && (
                      <>
                        <div className={`flex items-center justify-between text-sm font-medium mb-1 ${isToday ? "text-primary-600" : "text-gray-900"}`}>
                          <span>{day}</span>
                        </div>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map((event) => (
                            <div key={event.id} className="text-xs p-1 bg-primary-100 text-primary-800 rounded flex items-center justify-between gap-1">
                              <span className="truncate">{event.title}</span>
                              <div className="flex items-center gap-1">
                                <button
                                  className="text-[10px] px-1 py-0.5 bg-white/70 rounded hover:bg-white"
                                  onClick={() => setEditingEvent(event)}
                                >
                                  Edit
                                </button>
                                <button
                                  className="text-[10px] px-1 py-0.5 bg-red-100 text-red-700 rounded hover:bg-red-200"
                                  onClick={() => handleDeleteEvent(event.id)}
                                >
                                  Del
                                </button>
                              </div>
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-xs text-gray-500">+{dayEvents.length - 3} more</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Upcoming Events Sidebar */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Upcoming Events</h3>
            <p className="text-sm text-primary-600 mb-4">Next 5 scheduled events</p>

            <div className="space-y-3">
              {getUpcomingEvents().map((event) => (
                <div key={event.id} className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="font-medium text-sm text-gray-900">{event.title}</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    {new Date(event.event_date).toLocaleDateString()} at {event.event_time}
                  </p>
                  {event.location && <p className="text-xs text-gray-500 mt-1">Assigned to {event.location}</p>}
                </div>
              ))}

              {getUpcomingEvents().length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No upcoming events</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Event Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Create New Event</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-primary-600 mb-6">Schedule a new task or event on the calendar</p>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="Event title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                />
                {fieldErrors.title && <p className="text-xs text-red-500 mt-1">{fieldErrors.title}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    className="input-field"
                    value={newEvent.event_date}
                    onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                  />
                  {fieldErrors.event_date && <p className="text-xs text-red-500 mt-1">{fieldErrors.event_date}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
                  <input
                    type="time"
                    required
                    className="input-field"
                    value={newEvent.event_time}
                    onChange={(e) => setNewEvent({ ...newEvent, event_time: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="input-field"
                  rows="3"
                  placeholder="Event description"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                />
                {fieldErrors.description && <p className="text-xs text-red-500 mt-1">{fieldErrors.description}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    className="input-field"
                    value={newEvent.type}
                    onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                  >
                    <option value="Task">Task</option>
                    <option value="Event">Event</option>
                    <option value="Meeting">Meeting</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    className="input-field"
                    value={newEvent.priority}
                    onChange={(e) => setNewEvent({ ...newEvent, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Event location"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                />
                {fieldErrors.location && <p className="text-xs text-red-500 mt-1">{fieldErrors.location}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reminder (minutes before)</label>
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    value={newEvent.reminder_minutes}
                    onChange={(e) => setNewEvent({ ...newEvent, reminder_minutes: Number(e.target.value) })}
                  />
                </div>
                <div className="flex items-end">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={newEvent.notify}
                      onChange={(e) => setNewEvent({ ...newEvent, notify: e.target.checked })}
                    />
                    Send notification
                  </label>
                </div>
              </div>

              {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

              <div className="flex space-x-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  Create Event
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {editingEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit Event</h3>
              <button onClick={() => setEditingEvent(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={editingEvent.title}
                  onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    className="input-field"
                    value={editingEvent.event_date}
                    onChange={(e) => setEditingEvent({ ...editingEvent, event_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
                  <input
                    type="time"
                    required
                    className="input-field"
                    value={editingEvent.event_time}
                    onChange={(e) => setEditingEvent({ ...editingEvent, event_time: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="input-field"
                  rows="3"
                  value={editingEvent.description || ""}
                  onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    className="input-field"
                    value={editingEvent.type}
                    onChange={(e) => setEditingEvent({ ...editingEvent, type: e.target.value })}
                  >
                    <option value="Task">Task</option>
                    <option value="Event">Event</option>
                    <option value="Meeting">Meeting</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    className="input-field"
                    value={editingEvent.priority}
                    onChange={(e) => setEditingEvent({ ...editingEvent, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  className="input-field"
                  value={editingEvent.location || ""}
                  onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reminder (minutes before)</label>
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    value={editingEvent.reminder_minutes || 0}
                    onChange={(e) => setEditingEvent({ ...editingEvent, reminder_minutes: Number(e.target.value) })}
                  />
                </div>
                <div className="flex items-end">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={!!editingEvent.notify}
                      onChange={(e) => setEditingEvent({ ...editingEvent, notify: e.target.checked })}
                    />
                    Send notification
                  </label>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button type="submit" className="btn-primary flex-1">Save</button>
                <button type="button" onClick={() => setEditingEvent(null)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Calendar
