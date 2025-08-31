import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import { userAPI, externalUsersAPI } from "../services/api"
import UserForm from "../components/UserForm"
import ExternalUserForm from "../components/ExternalUserForm"
import { 
  Users as UsersIcon, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  Eye,
  Mail,
  Phone,
  UserCheck,
  UserX,
  Shield,
  Calendar,
  X
} from "lucide-react"

const Users = () => {
  const { user } = useAuth()
  const [staffUsers, setStaffUsers] = useState([])
  const [externalUsers, setExternalUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterRole, setFilterRole] = useState("")
  const [filterCategory, setFilterCategory] = useState("all") // all, staff, external
  const [showModal, setShowModal] = useState(false)
  const [showExternalModal, setShowExternalModal] = useState(false)
  const [modalMode, setModalMode] = useState("create") // create, edit, view
  const [externalModalMode, setExternalModalMode] = useState("create") // create, edit, view
  const [selectedUser, setSelectedUser] = useState(null)

  // Role-based permissions
  const canManageUsers = ["Admin", "Farm Manager"].includes(user?.role)

  // Categorize users
  const staffRoles = ["Admin", "Farm Manager", "Farm Attendant", "Pasture Officer", "Veterinary Doctor", "Feed Production Officer"]
  const externalRoles = ["vendor", "contractor", "visitor", "other", "Vendor", "Contractor", "Visitor", "Other"]

  useEffect(() => {
    fetchStaffUsers()
    fetchExternalUsers()
  }, [])

  const fetchStaffUsers = async () => {
    try {
      setLoading(true)
      const staffRes = await userAPI.getUsers()
      setStaffUsers(staffRes.data)
      setError("")
    } catch (error) {
      console.error("Failed to fetch staff users:", error)
      setError("Failed to load staff users. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const fetchExternalUsers = async () => {
    try {
      setLoading(true)
      const externalRes = await externalUsersAPI.getExternalUsers()
      setExternalUsers(externalRes.data)
      setError("")
    } catch (error) {
      console.error("Failed to fetch external users:", error)
      setError("Failed to load external users. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const categorizeUser = (userRole) => {
    return staffRoles.includes(userRole) ? "staff" : "external"
  }

  const filteredStaff = staffUsers.filter(u => {
    const matchesSearch = u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.phone?.includes(searchTerm)
    const matchesRole = !filterRole || u.role === filterRole
    return matchesSearch && matchesRole
  })

  const filteredExternal = externalUsers.filter(u => {
    const matchesSearch = u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.phone?.includes(searchTerm)
    const matchesRole = !filterRole || u.role === filterRole
    return matchesSearch && matchesRole
  })

  const getRoleBadgeColor = (role) => {
    const roleColors = {
      "Admin": "bg-red-100 text-red-700 border-red-200",
      "Farm Manager": "bg-blue-100 text-blue-700 border-blue-200", 
      "Pasture Manager": "bg-green-100 text-green-700 border-green-200",
      "Farm Attendant": "bg-yellow-100 text-yellow-700 border-yellow-200",
      "Veterinary Doctor": "bg-purple-100 text-purple-700 border-purple-200",
      "Vendor": "bg-orange-100 text-orange-700 border-orange-200",
      "Contractor": "bg-indigo-100 text-indigo-700 border-indigo-200",
    }
    return roleColors[role] || "bg-gray-100 text-gray-700 border-gray-200"
  }

  const handleCreate = () => {
    if (!canManageUsers) return
    setModalMode("create")
    setSelectedUser(null)
    setShowModal(true)
  }

  const handleCreateExternal = () => {
    if (!canManageUsers) return
    setExternalModalMode("create")
    setSelectedUser(null)
    setShowExternalModal(true)
  }

  const handleEdit = (userToEdit) => {
    if (!canManageUsers) return
    if (categorizeUser(userToEdit.role) === "external") {
      setExternalModalMode("edit")
      setSelectedUser(userToEdit)
      setShowExternalModal(true)
    } else {
      setModalMode("edit")
      setSelectedUser(userToEdit)
      setShowModal(true)
    }
  }

  const handleView = (userToView) => {
    if (categorizeUser(userToView.role) === "external") {
      setExternalModalMode("view")
      setSelectedUser(userToView)
      setShowExternalModal(true)
    } else {
      setModalMode("view")
      setSelectedUser(userToView)
      setShowModal(true)
    }
  }

  const handleUserSaved = (savedUser) => {
    fetchStaffUsers()
    setShowModal(false)
    setSelectedUser(null)
  }

  const handleExternalUserSaved = (savedUser) => {
    fetchExternalUsers()
    setShowExternalModal(false)
    setSelectedUser(null)
    setError("")
    setSuccess(externalModalMode === "create" ? "External user added successfully." : "External user updated successfully.")
    setTimeout(() => setSuccess(""), 3000)
  }

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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-2">Manage staff and external users</p>
        </div>
        {canManageUsers && (
          <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0">
            <button
              onClick={handleCreate}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Add Staff User</span>
            </button>
            <button
              onClick={handleCreateExternal}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Add External User</span>
            </button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl">
          {success}
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Users</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Role</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Roles</option>
              {[...staffRoles, ...externalRoles].map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Users</option>
              <option value="staff">Active Staff</option>
              <option value="external">External Users</option>
            </select>
          </div>

          <div className="flex items-end">
            <div className="text-sm text-gray-600">
          <p className="font-medium">Total: {filteredStaff.length + filteredExternal.length}</p>
          <p>Staff: {filteredStaff.length} | External: {filteredExternal.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Staff Section */}
      {(filterCategory === "all" || filterCategory === "staff") && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">Active Staff</h2>
              <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-sm font-medium">
                {filteredStaff.length}
              </span>
            </div>
            <p className="text-gray-600 mt-1">Farm employees and staff members</p>
          </div>

          <div className="p-6">
            {filteredStaff.length === 0 ? (
              <div className="text-center py-8">
                <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No staff found</h3>
                <p className="text-gray-600">No staff members match your search criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStaff.map((staffUser) => (
                  <div key={staffUser.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{staffUser.full_name}</h3>
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${getRoleBadgeColor(staffUser.role)}`}>
                          {staffUser.role}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span>{staffUser.email}</span>
                      </div>
                      {staffUser.phone && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4" />
                          <span>{staffUser.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>Joined {staffUser.created_at && !isNaN(Date.parse(staffUser.created_at)) ? new Date(staffUser.created_at).toLocaleDateString() : "Not available"}</span>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleView(staffUser)}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View</span>
                      </button>
                      
                      {canManageUsers && (
                        <button
                          onClick={() => handleEdit(staffUser)}
                          className="flex-1 bg-primary-100 hover:bg-primary-200 text-primary-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
                        >
                          <Edit className="w-4 h-4" />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* External Users Section */}
      {(filterCategory === "all" || filterCategory === "external") && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <UserX className="w-5 h-5 text-orange-600" />
              <h2 className="text-xl font-semibold text-gray-900">External Users</h2>
              <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-sm font-medium">
                {filteredExternal.length}
              </span>
            </div>
            <p className="text-gray-600 mt-1">Vendors, contractors, and other external contacts</p>
          </div>

          <div className="p-6">
            {filteredExternal.length === 0 ? (
              <div className="text-center py-8">
                <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No external users found</h3>
                <p className="text-gray-600">No external users match your search criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredExternal.map((externalUser) => (
                  <div key={externalUser.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{externalUser.full_name}</h3>
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${getRoleBadgeColor(externalUser.role)}`}>
                          {externalUser.role}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span>{externalUser.email}</span>
                      </div>
                      {externalUser.phone && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4" />
                          <span>{externalUser.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>Added {externalUser.created_at && !isNaN(Date.parse(externalUser.created_at)) ? new Date(externalUser.created_at).toLocaleDateString() : "Not available"}</span>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleView(externalUser)}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View</span>
                      </button>
                      
                      {canManageUsers && (
                        <button
                          onClick={() => handleEdit(externalUser)}
                          className="flex-1 bg-primary-100 hover:bg-primary-200 text-primary-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
                        >
                          <Edit className="w-4 h-4" />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Modal - Create/Edit/View User */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {modalMode === "create" ? "Add New User" : 
                 modalMode === "edit" ? "Edit User" : "User Details"}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {modalMode === "view" && selectedUser ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedUser.full_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${getRoleBadgeColor(selectedUser.role)}`}>
                      {selectedUser.role}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedUser.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedUser.phone || "Not provided"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {staffRoles.includes(selectedUser.role) ? "Active Staff" : "External User"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Joined Date</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedUser.created_at && !isNaN(Date.parse(selectedUser.created_at)) ? new Date(selectedUser.created_at).toLocaleDateString() : "Not available"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <UserForm
                user={selectedUser}
                mode={modalMode}
                onUserSaved={handleUserSaved}
                onCancel={() => setShowModal(false)}
              />
            )}
          </div>
        </div>
      )}

      {/* External User Modal - Create/Edit External User */}
      {showExternalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {externalModalMode === "create" ? "Add External User" : 
                 externalModalMode === "edit" ? "Edit External User" : "External User Details"}
              </h3>
              <button 
                onClick={() => setShowExternalModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {externalModalMode === "view" && selectedUser ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedUser.full_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${getRoleBadgeColor(selectedUser.role)}`}>
                      {selectedUser.role}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedUser.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedUser.phone || "Not provided"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Company Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedUser.company_name || "Not provided"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedUser.address || "Not provided"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Joined Date</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedUser.created_at && !isNaN(Date.parse(selectedUser.created_at)) ? new Date(selectedUser.created_at).toLocaleDateString() : "Not available"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <ExternalUserForm
                user={selectedUser}
                mode={externalModalMode}
                onUserSaved={handleExternalUserSaved}
                onCancel={() => setShowExternalModal(false)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Users