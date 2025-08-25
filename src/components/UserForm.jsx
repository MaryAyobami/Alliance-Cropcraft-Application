import { useState, useEffect } from "react"
import { userAPI } from "../services/api"
import { useAuth } from "../contexts/AuthContext"

const UserForm = ({ user: editUser, mode, onUserSaved, onCancel }) => {
  const { user: currentUser } = useAuth()
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    role: "Farm Attendant",
    password: "",
    confirmPassword: ""
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState({})

  // Available roles based on user permission
  const availableRoles = [
    "Farm Attendant", "Veterinary Doctor", "Pasture Officer", "Admin", "Farm Manager", "Maintenance Officer", "Feed Production Officer"
  ]

  // Add Farm Manager and Admin for Admin users only
  if (currentUser?.role === "Admin") {
    availableRoles.unshift("Farm Manager", "Admin")
  }

  // Define external user roles that don't need passwords or email verification
  const externalRoles = ["Vendor", "Contractor", "Visitor", "Other"]
  const isExternalUser = externalRoles.includes(formData.role)

  useEffect(() => {
    if (editUser && mode === "edit") {
      setFormData({
        full_name: editUser.full_name || "",
        email: editUser.email || "",
        phone: editUser.phone || "",
        role: editUser.role || "Farm Attendant",
        password: "",
        confirmPassword: ""
      })
    }
  }, [editUser, mode])

  const validateForm = () => {
    const errors = {}

    if (!formData.full_name.trim()) {
      errors.full_name = "Full name is required"
    }

    // Email is optional for external users
    if (!isExternalUser) {
      if (!formData.email.trim()) {
        errors.email = "Email is required"
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = "Please enter a valid email address"
      }
    } else if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address"
    }

    if (!formData.role) {
      errors.role = "Role is required"
    }

    // Password validation - not required for external users
    if (!isExternalUser) {
      if (mode === "create") {
        if (!formData.password) {
          errors.password = "Password is required"
        } else if (formData.password.length < 6) {
          errors.password = "Password must be at least 6 characters"
        }

        if (formData.password !== formData.confirmPassword) {
          errors.confirmPassword = "Passwords do not match"
        }
      } else if (mode === "edit" && formData.password) {
        // Optional password change for edit mode
        if (formData.password.length < 6) {
          errors.password = "Password must be at least 6 characters"
        }

        if (formData.password !== formData.confirmPassword) {
          errors.confirmPassword = "Passwords do not match"
        }
      }
    } else if (formData.password) {
      // External users can optionally have passwords, but if provided they must be valid
      if (formData.password.length < 6) {
        errors.password = "Password must be at least 6 characters"
      }

      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = "Passwords do not match"
      }
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors({ ...fieldErrors, [name]: "" })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (!validateForm()) {
      setLoading(false)
      return
    }

    try {
      const submitData = {
        full_name: formData.full_name,
        phone: formData.phone,
        role: formData.role
      }

      // Add email only if provided (required for staff, optional for external)
      if (formData.email.trim()) {
        submitData.email = formData.email
      }

      // Add password only if provided
      if (mode === "create" || (mode === "edit" && formData.password)) {
        submitData.password = formData.password
      }

      let response
      if (mode === "create") {
        response = await userAPI.createUser(submitData)
      } else {
        response = await userAPI.updateUser(editUser.id, submitData)
      }

      if (onUserSaved) {
        onUserSaved(response.data)
      }
    } catch (err) {
      console.error("User save error:", err)
      const errorData = err.response?.data
      
      if (errorData?.field) {
        setFieldErrors({ [errorData.field]: errorData.message })
      } else if (errorData?.message) {
        setError(errorData.message)
      } else {
        setError(mode === "create" ? "Failed to create user" : "Failed to update user")
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
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            className={getFieldClassName('full_name')}
            placeholder="Enter full name"
          />
          {fieldErrors.full_name && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.full_name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email {!isExternalUser && <span className="text-red-500">*</span>}
            {isExternalUser && <span className="text-gray-500 text-xs">(Optional for external users)</span>}
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={getFieldClassName('email')}
            placeholder={isExternalUser ? "Enter email address (optional)" : "Enter email address"}
          />
          {fieldErrors.email && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className={getFieldClassName('phone')}
            placeholder="Enter phone number"
          />
          {fieldErrors.phone && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.phone}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role <span className="text-red-500">*</span>
          </label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className={getFieldClassName('role')}
          >
            {availableRoles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
          {fieldErrors.role && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.role}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {mode === "create" ? "Password" : "New Password"} 
            {mode === "create" && !isExternalUser && <span className="text-red-500">*</span>}
            {isExternalUser && <span className="text-gray-500 text-xs">(Not required for external users)</span>}
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className={getFieldClassName('password')}
            placeholder={isExternalUser ? "Enter password (optional)" : (mode === "create" ? "Enter password" : "Leave blank to keep current password")}
          />
          {fieldErrors.password && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {mode === "create" ? "Confirm Password" : "Confirm New Password"}
            {mode === "create" && !isExternalUser && <span className="text-red-500">*</span>}
            {isExternalUser && <span className="text-gray-500 text-xs">(Optional)</span>}
          </label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className={getFieldClassName('confirmPassword')}
            placeholder={isExternalUser ? "Confirm password (optional)" : "Confirm password"}
          />
          {fieldErrors.confirmPassword && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.confirmPassword}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-colors disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {mode === "create" ? "Creating..." : "Updating..."}
            </span>
          ) : (
            mode === "create" ? "Create User" : "Update User"
          )}
        </button>
      </div>
    </form>
  )
}

export default UserForm