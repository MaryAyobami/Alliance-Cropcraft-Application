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
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await tasksAPI.createTask(formData)
      console.log(res.data)
    } catch (err) {
      setError("Failed to create task.")
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
