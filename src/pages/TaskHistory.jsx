import { useEffect, useState } from "react"
import { tasksAPI } from "../services/api"
import { useSearchParams } from "react-router-dom"

const TaskHistory = () => {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchParams] = useSearchParams()
  const week = searchParams.get("week") || "current"

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // You may want to pass week as a param to your API
        const response = await tasksAPI.getHistory({ week })
        setTasks(response.data)
      } catch (error) {
        setTasks([])
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [week])

  if (loading) return <div>Loading...</div>

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Task History ({week === "current" ? "This Week" : week})</h1>
      <ul className="space-y-4">
        {tasks.map(task => (
          <li key={task.id} className="p-4 bg-gray-100 rounded-xl">
            <div className="flex justify-between items-center">
              <span className="font-semibold">{task.title}</span>
              <span className="text-xs text-gray-500">{task.due_date}</span>
            </div>
            <div className="text-sm text-gray-600">{task.description}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default TaskHistory