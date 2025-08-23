import { useEffect, useState } from "react"
import { tasksAPI, userAPI } from "../services/api"

const CreateTaskForm = () => {
  const [users, setUsers] = useState([])

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    assigned_to: "",
    due_date: "",
    due_time: "",
    tag: "static",         // NEW: default to static
    recurrent: true,       // NEW: default to true
    active_date: ""        // NEW: for dynamic tasks
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")


  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await userAPI.getUsers()
        setUsers(res.data)
        console.log(res.data)
        console.log(users)
      } catch (err) {
        console.error("Failed to fetch users")
      }
    }
    fetchUsers()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
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

    try {
      const res = await tasksAPI.createTask(formData)
      console.log(res.data)
      
      // Clear form and show success message
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
      
      // Show success message
      alert("Task created successfully!")
      
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create task. Please check all required fields.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold">Create New Task</h2>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div>
        <label className="block text-sm">Title</label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm">Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm">Priority</label>
        <select
          name="priority"
          value={formData.priority}
          onChange={handleChange}
          className="w-full border rounded px-3 py-2"
        >
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div>
        <label className="block text-sm">Assign To</label>
        <select
          name="assigned_to"
          value={formData.assigned_to}
          onChange={handleChange}
          required
          className="w-full border rounded px-3 py-2"
        >
          <option value="">-- Select User --</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.full_name} ({user.role})
            </option>
          ))}
        </select>
      </div>
    <div>
        <label className="block text-sm">Task Type</label>
        <select
          name="tag"
          value={formData.tag}
          onChange={handleChange}
          className="w-full border rounded px-3 py-2"
        >
          <option value="static">Static (Daily/Recurrent)</option>
          <option value="dynamic">Dynamic (One-time)</option>
        </select>
      </div>
      {formData.tag === "static" && (
          <div className="text-xs text-gray-500">This task will recur every day.</div>
        )}
        {formData.tag === "dynamic" && (
          <div className="text-xs text-gray-500">This task will only be active on the selected date.</div>
        )}

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-sm">Due Date</label>
          <input
            type="date"
            name="due_date"
            value={formData.due_date}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm">Due Time</label>
          <input
            type="time"
            name="due_time"
            value={formData.due_time}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-primary-600 text-white px-4 py-2 rounded-xl  hover:bg-blue-700 w-full"
      >
        {loading ? "Creating..." : "Create Task"}
      </button>
    </form>
  )
}

export default CreateTaskForm
