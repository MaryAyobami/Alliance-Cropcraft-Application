import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import { penAPI, userAPI } from "../services/api"
import { queueAPICall, getCachedData, cacheData } from "../services/offlineSync"
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Users,
  MapPin,
  Hash,
  AlertCircle,
  CheckCircle,
  X,
  UserCheck,
  Settings
} from "lucide-react"

const PenManagement = () => {
  const { user } = useAuth()
  const [pens, setPens] = useState([])
  const [users, setUsers] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterSpecies, setFilterSpecies] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState("create") // create, edit, assign
  const [selectedPen, setSelectedPen] = useState(null)
  const [formData, setFormData] = useState({
    name: "",
    capacity: "",
    species: "",
    location: "",
    notes: ""
  })
  const [assignmentData, setAssignmentData] = useState({
    attendant_id: "",
    supervisor_id: "",
    notes: ""
  })

  // Role-based permissions
  const canManagePens = ["Admin", "Farm Manager", "Supervisor"].includes(user?.role)
  const canAssignStaff = ["Admin", "Farm Manager", "Supervisor"].includes(user?.role)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Try to fetch from API first, fallback to cached data
      let pensData, usersData, assignmentsData
      
      if (navigator.onLine) {
        try {
          const [pensResponse, usersResponse, assignmentsResponse] = await Promise.all([
            penAPI.getPens(),
            userAPI.getUsers(),
            penAPI.getPenAssignments()
          ])
          
          pensData = pensResponse.data
          usersData = usersResponse.data
          assignmentsData = assignmentsResponse.data

          // Cache the data for offline use
          await cacheData.pens(pensData)
          await cacheData.users(usersData)
          
        } catch (apiError) {
          console.warn('[PenManagement] API fetch failed, using cached data:', apiError)
          throw apiError
        }
      } else {
        throw new Error('Offline mode')
      }

      setPens(pensData || [])
      setUsers(usersData || [])
      setAssignments(assignmentsData || [])
      setError("")
    } catch (error) {
      console.error("Failed to fetch pen data:", error)
      
      // Load from cache
      try {
        const cachedPens = await getCachedData.pens()
        const cachedUsers = await getCachedData.users()
        
        setPens(cachedPens || [])
        setUsers(cachedUsers || [])
        setError("Using offline data. Some information may be outdated.")
      } catch (cacheError) {
        setError("Failed to load pen data. Please check your connection.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    if (!canManagePens) return
    setModalMode("create")
    setSelectedPen(null)
    setFormData({
      name: "",
      capacity: "",
      species: "",
      location: "",
      notes: ""
    })
    setShowModal(true)
  }

  const handleEdit = (pen) => {
    if (!canManagePens) return
    setModalMode("edit")
    setSelectedPen(pen)
    setFormData({
      name: pen.name || "",
      capacity: pen.capacity || "",
      species: pen.species || "",
      location: pen.location || "",
      notes: pen.notes || ""
    })
    setShowModal(true)
  }

  const handleAssign = (pen) => {
    if (!canAssignStaff) return
    setModalMode("assign")
    setSelectedPen(pen)
    
    // Get current assignment
    const currentAssignment = assignments.find(a => a.pen_id === pen.id && a.is_active)
    setAssignmentData({
      attendant_id: currentAssignment?.attendant_id || "",
      supervisor_id: currentAssignment?.supervisor_id || "",
      notes: currentAssignment?.notes || ""
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      if (modalMode === "create") {
        if (navigator.onLine) {
          const response = await penAPI.createPen(formData)
          setPens([response.data, ...pens])
          await cacheData.pens(response.data)
        } else {
          // Queue for sync
          await queueAPICall('/pens', 'POST', formData, 'high')
          // Add optimistically to UI
          const tempPen = { ...formData, id: `temp_${Date.now()}`, current_occupancy: 0 }
          setPens([tempPen, ...pens])
        }
        alert("Pen created successfully!")
      } else if (modalMode === "edit") {
        if (navigator.onLine) {
          const response = await penAPI.updatePen(selectedPen.id, formData)
          setPens(pens.map(p => p.id === selectedPen.id ? response.data : p))
          await cacheData.pens(response.data)
        } else {
          await queueAPICall(`/pens/${selectedPen.id}`, 'PUT', formData, 'high')
          // Update optimistically
          const updatedPen = { ...selectedPen, ...formData }
          setPens(pens.map(p => p.id === selectedPen.id ? updatedPen : p))
        }
        alert("Pen updated successfully!")
      } else if (modalMode === "assign") {
        if (navigator.onLine) {
          const response = await penAPI.createPenAssignment({
            pen_id: selectedPen.id,
            ...assignmentData
          })
          setAssignments([...assignments.filter(a => !(a.pen_id === selectedPen.id && a.is_active)), response.data])
        } else {
          await queueAPICall('/pen-assignments', 'POST', {
            pen_id: selectedPen.id,
            ...assignmentData
          }, 'high')
        }
        alert("Staff assignment updated successfully!")
      }
      
      setShowModal(false)
    } catch (error) {
      console.error("Form submission error:", error)
      alert(error.response?.data?.message || "Failed to save changes")
    }
  }

  const handleDelete = async (pen) => {
    if (!canManagePens) return
    
    if (!window.confirm(`Are you sure you want to delete pen "${pen.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      if (navigator.onLine) {
        await penAPI.deletePen(pen.id)
      } else {
        await queueAPICall(`/pens/${pen.id}`, 'DELETE', null, 'high')
      }
      
      setPens(pens.filter(p => p.id !== pen.id))
      alert("Pen deleted successfully")
    } catch (error) {
      console.error("Failed to delete pen:", error)
      alert(error.response?.data?.message || "Failed to delete pen")
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleAssignmentChange = (e) => {
    const { name, value } = e.target
    setAssignmentData({ ...assignmentData, [name]: value })
  }

  // Filter pens based on search and filters
  const filteredPens = pens.filter(pen => {
    const matchesSearch = pen.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pen.location?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSpecies = !filterSpecies || pen.species?.toLowerCase() === filterSpecies.toLowerCase()
    return matchesSearch && matchesSpecies
  })

  // Get assignment details for a pen
  const getPenAssignment = (penId) => {
    const assignment = assignments.find(a => a.pen_id === penId && a.is_active)
    if (!assignment) return null

    const attendant = users.find(u => u.id === assignment.attendant_id)
    const supervisor = users.find(u => u.id === assignment.supervisor_id)

    return {
      attendant: attendant?.full_name || 'Unassigned',
      supervisor: supervisor?.full_name || 'Unassigned'
    }
  }

  // Get available staff for assignments
  const getAvailableAttendants = () => users.filter(u => u.role === 'Farm Attendant')
  const getAvailableSupervisors = () => users.filter(u => u.role === 'Supervisor')

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pen Management</h1>
          <p className="text-gray-600 mt-2">Manage livestock pens and staff assignments</p>
        </div>
        {canManagePens && (
          <button
            onClick={handleCreate}
            className="mt-4 sm:mt-0 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Pen</span>
          </button>
        )}
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-xl flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Pens</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Species</label>
            <select
              value={filterSpecies}
              onChange={(e) => setFilterSpecies(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Species</option>
              {[...new Set(pens.map(pen => pen.species).filter(Boolean))].map(species => (
                <option key={species} value={species}>{species}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              <p className="font-medium">Total: {filteredPens.length} pens</p>
              <p>Capacity: {filteredPens.reduce((sum, pen) => sum + (pen.capacity || 0), 0)} animals</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pens Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPens.map((pen) => {
          const assignment = getPenAssignment(pen.id)
          const occupancyPercentage = pen.capacity ? (pen.current_occupancy / pen.capacity) * 100 : 0
          
          return (
            <div key={pen.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{pen.name}</h3>
                  <p className="text-gray-600 capitalize">{pen.species}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  occupancyPercentage >= 90 ? 'bg-red-100 text-red-800' :
                  occupancyPercentage >= 70 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {pen.current_occupancy || 0}/{pen.capacity || 0}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {pen.location && (
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{pen.location}</span>
                  </div>
                )}
                
                <div className="flex items-center text-sm text-gray-600">
                  <Hash className="w-4 h-4 mr-2" />
                  <span>Capacity: {pen.capacity || 0}</span>
                </div>

                {assignment && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs font-medium text-gray-700 mb-1">Staff Assignment:</p>
                    <p className="text-sm text-gray-600">👤 {assignment.attendant}</p>
                    <p className="text-sm text-gray-600">👨‍💼 {assignment.supervisor}</p>
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                {canAssignStaff && (
                  <button
                    onClick={() => handleAssign(pen)}
                    className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Assign</span>
                  </button>
                )}
                
                {canManagePens && (
                  <>
                    <button
                      onClick={() => handleEdit(pen)}
                      className="flex-1 bg-primary-100 hover:bg-primary-200 text-primary-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                    
                    <button
                      onClick={() => handleDelete(pen)}
                      className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {filteredPens.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Settings className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No pens found</h3>
          <p className="text-gray-600 mb-4">
            {pens.length === 0 ? "Get started by creating your first pen" : "Try adjusting your search criteria"}
          </p>
          {canManagePens && pens.length === 0 && (
            <button
              onClick={handleCreate}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl transition-colors"
            >
              Create Your First Pen
            </button>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">
                {modalMode === "create" && "Add New Pen"}
                {modalMode === "edit" && "Edit Pen"}
                {modalMode === "assign" && "Assign Staff"}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {modalMode !== "assign" ? (
                // Pen form
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pen Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="e.g., Pen A1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Species <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="species"
                      value={formData.species}
                      onChange={handleInputChange}
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Select species</option>
                      <option value="cattle">Cattle</option>
                      <option value="goat">Goat</option>
                      <option value="sheep">Sheep</option>
                      <option value="pig">Pig</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Capacity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="capacity"
                      value={formData.capacity}
                      onChange={handleInputChange}
                      required
                      min="1"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Maximum number of animals"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="e.g., North Pasture"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Additional notes about this pen"
                    />
                  </div>
                </>
              ) : (
                // Assignment form
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assign Attendant
                    </label>
                    <select
                      name="attendant_id"
                      value={assignmentData.attendant_id}
                      onChange={handleAssignmentChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Select attendant</option>
                      {getAvailableAttendants().map(attendant => (
                        <option key={attendant.id} value={attendant.id}>
                          {attendant.full_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assign Supervisor
                    </label>
                    <select
                      name="supervisor_id"
                      value={assignmentData.supervisor_id}
                      onChange={handleAssignmentChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Select supervisor</option>
                      {getAvailableSupervisors().map(supervisor => (
                        <option key={supervisor.id} value={supervisor.id}>
                          {supervisor.full_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assignment Notes</label>
                    <textarea
                      name="notes"
                      value={assignmentData.notes}
                      onChange={handleAssignmentChange}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Special instructions or notes for this assignment"
                    />
                  </div>
                </>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  {modalMode === "create" ? "Create Pen" : modalMode === "edit" ? "Update Pen" : "Assign Staff"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default PenManagement