import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { tasksAPI } from "../services/api"

const TaskDetails = () => {
  const { id } = useParams()
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

  if (loading) return <div>Loading...</div>
  if (!task) return <div>Task not found</div>

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">{task.title}</h1>
      <p className="mb-2 text-gray-600">{task.description}</p>
      <div className="mb-2">Due: {task.due_date} {task.due_time}</div>
      <div className="mb-2">Status: {task.status}</div>
      <div className="mb-2">Priority: {task.priority}</div>
      {/* Add more details as needed */}
    </div>
  )
}

export default TaskDetails