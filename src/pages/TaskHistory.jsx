import { useEffect, useState } from "react"
import { useAuth } from "../contexts/AuthContext"
import api from "../services/api"
import { useSearchParams, useNavigate } from "react-router-dom"
import { CheckCircle, Clock, Calendar, User, ArrowLeft, Eye, Filter, Search, X } from "lucide-react"

const TaskHistory = () => {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [personalTasks, setPersonalTasks] = useState([])
  const [staffTasks, setStaffTasks] = useState([])
  const [staffFilter, setStaffFilter] = useState("")
  const [activeTab, setActiveTab] = useState('personal')
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
        const res = await api.get("/task-history");
        const allTasks = res.data.data || res.data;
        setTasks(allTasks);
        if (user && (user.role === "Admin" || user.role === "Admin User" || user.role === "Farm Manager")) {
          setPersonalTasks(allTasks.filter(t => t.assigned_to === user.id));
          setStaffTasks(allTasks.filter(t => t.assigned_to !== user.id));
        } else {
          setPersonalTasks(allTasks.filter(t => t.assigned_to === user?.id));
        }
      } catch (err) {
        console.error("Failed to fetch task history:", err);
        setTasks([]);
        setPersonalTasks([]);
        setStaffTasks([]);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

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
  const filterTasks = (taskList, extraFilter = null) => taskList.filter(task => {
    const matchesSearch = task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.assigned_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || task.status === filterStatus;
    const matchesPriority = !filterPriority || task.priority === filterPriority;
    const matchesType = !filterType || task.tag === filterType;
    const matchesStaff = !staffFilter || String(task.assigned_to) === staffFilter;
    return matchesSearch && matchesStatus && matchesPriority && matchesType && (extraFilter ? extraFilter(task) : true) && matchesStaff;
  });
  const filteredPersonalTasks = filterTasks(personalTasks);
  const filteredStaffTasks = filterTasks(staffTasks);
  const filteredTasks = filterTasks(tasks);

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
  // Helper for rendering task tables
  const renderTaskTable = (taskList) => (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white rounded-2xl shadow-xl">
        <thead>
          <tr className="bg-gradient-to-r from-primary-100 to-primary-50 text-primary-800">
            <th className="px-6 py-4 text-left font-semibold rounded-tl-2xl">Title</th>
            <th className="px-6 py-4 text-left font-semibold">Status</th>
            <th className="px-6 py-4 text-left font-semibold">Priority</th>
            <th className="px-6 py-4 text-left font-semibold">Type</th>
            <th className="px-6 py-4 text-left font-semibold">Due Time</th>
            <th className="px-6 py-4 text-left font-semibold">Completed At</th>
            <th className="px-6 py-4 text-left font-semibold">Assigned</th>
            <th className="px-6 py-4 text-left font-semibold">Evidence</th>
            <th className="px-6 py-4 text-left font-semibold rounded-tr-2xl">Notes</th>
          </tr>
        </thead>
        <tbody>
          {taskList.map((task, idx) => (
            <tr
              key={task.id}
              className={`transition-colors ${task.status === "completed" ? "bg-green-50" : ""} ${idx % 2 === 0 ? "" : "bg-gray-50"} hover:bg-primary-50`}
              style={{ borderRadius: idx === 0 ? "1rem 1rem 0 0" : idx === taskList.length - 1 ? "0 0 1rem 1rem" : "" }}
            >
              <td className="px-6 py-4 font-semibold whitespace-nowrap">
                {task.status === "completed" ? (
                  <span className="line-through text-gray-500">{task.title}</span>
                ) : (
                  <span className="text-gray-900">{task.title}</span>
                )}
              </td>
              <td className="px-6 py-4">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${task.status === "completed" ? "bg-green-200 text-green-700" : task.status === "missed" ? "bg-red-200 text-red-700" : "bg-gray-200 text-gray-700"}`}>{task.status}</span>
              </td>
              <td className="px-6 py-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium shadow-sm ${getPriorityColor(task.priority)}`}>{task.priority}</span>
              </td>
              <td className="px-6 py-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700`}>{task.recurrent === true || task.tag === "static" ? "Daily" : "One-time"}</span>
              </td>
              <td className="px-6 py-4">{task.due_time || <span className="text-gray-400">-</span>}</td>
              <td className="px-6 py-4">{
                task.completed_at
                  ? <span className="bg-green-100 text-green-700 px-2 py-1 rounded-lg text-xs font-mono">{new Date(task.completed_at).toLocaleString()}</span>
                  : (task.completion_date ? <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-lg text-xs font-mono">{new Date(task.completion_date).toLocaleDateString()}</span> : <span className="text-gray-400">-</span>)
              }</td>
              <td className="px-6 py-4">{task.assigned_name || <span className="text-gray-400">-</span>}</td>
              <td className="px-6 py-4">
                {task.evidence_photo ? (
                  <a href={task.evidence_photo} target="_blank" rel="noopener noreferrer" className="text-primary-600 underline font-medium">View</a>
                ) : <span className="text-gray-400">-</span>}
              </td>
              <td className="px-6 py-4">{task.completion_notes ? <span className="bg-yellow-50 text-yellow-800 px-2 py-1 rounded-lg text-xs">{task.completion_notes}</span> : <span className="text-gray-400">-</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

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
            <h1 className="text-3xl font-bold text-gray-900">Task History</h1>
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
                <option value="missed">Missed</option>
              </select>
            </div>
            {/* Staff filter for Admins/Managers */}
            {(user && (user.role === "Admin" || user.role === "Admin User" || user.role === "Farm Manager")) && staffTasks.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Staff</label>
                <select
                  value={staffFilter}
                  onChange={e => setStaffFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">All Staff</option>
                  {[...new Set(staffTasks.map(t => `${t.assigned_to}|${t.assigned_name}`))].map(staff => {
                    const [id, name] = staff.split("|");
                    return <option key={id} value={id}>{name || id}</option>;
                  })}
                </select>
              </div>
            )}

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
      {/* Tabbed Task History Section */}
      {(user && (user.role === "Admin" || user.role === "Admin User" || user.role === "Farm Manager")) ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex gap-4 mb-6">
            <button
               onClick={() => setActiveTab('personal')}
             className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors duration-200 ${
             activeTab === 'personal'
            ? 'border-primary-600 text-primary-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }`}
            >
              Personal Tasks
            </button>
            <button
                 onClick={() => setActiveTab('staff')}
        className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors duration-200 ${
          activeTab === 'staff'
            ? 'border-primary-600 text-primary-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }`}
            >
              Staff Tasks
            </button>
          </div>
          {activeTab === 'personal' ? (
            filteredPersonalTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No personal task history found.</div>
            ) : (
              renderTaskTable(filteredPersonalTasks)
            )
          ) : (
            filteredStaffTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No staff task history found.</div>
            ) : (
              renderTaskTable(filteredStaffTasks)
            )
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-4">Personal Task History</h2>
          {filteredPersonalTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No personal task history found.</div>
          ) : (
            renderTaskTable(filteredPersonalTasks)
          )}
        </div>
      )}

    </div>
  )
}

export default TaskHistory