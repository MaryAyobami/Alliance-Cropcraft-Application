import { useState, useEffect } from "react"
import { externalUsersAPI } from "../services/api"

const ExternalUserForm = ({ user: editUser, mode, onUserSaved, onCancel }) => {
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    job_description: "",
    email: "",
    company_name: "",
    address: ""
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState({})

  // Job roles for external users
  const jobRoles = [
    "Vendor",
    "Contractor",
    "Equipment Supplier",
    "Feed Supplier",
    "Veterinary Service",
    "Transport Service",
    "Maintenance Worker",
    "Consultant",
    "Inspector",
    "Delivery Personnel",
    "Other"
  ]

  useEffect(() => {
    if (editUser && mode === "edit") {
      setFormData({
        full_name: editUser.full_name || "",
        phone: editUser.phone || "",
        job_description: editUser.job_description || editUser.role || "",
        email: editUser.email || "",
        company_name: editUser.company_name || "",
        address: editUser.address || ""
      })
    }
  }, [editUser, mode])

  const validateForm = () => {
    const errors = {}

    if (!formData.full_name.trim()) {
      errors.full_name = "Full name is required"
    }

    if (!formData.phone.trim()) {
      errors.phone = "Phone number is required"
    } else if (!/^\+?[\d\s\-\(\)]{10,}$/.test(formData.phone.replace(/\s+/g, ''))) {
      errors.phone = "Please enter a valid phone number"
    }

    if (!formData.job_description.trim()) {
      errors.job_description = "Job description/role is required"
    }

    // Email validation only if provided (optional)
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address"
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
      // Create external user data
      const submitData = {
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
        role: formData.job_description.trim(), // Send job_description as role
        job_description: formData.job_description.trim(),
        email: formData.email.trim() || null,
        is_external: true,
        company_name: formData.company_name.trim() || null,
        address: formData.address.trim() || null
      }

      // Use the dedicated externalUsersAPI for external user actions
      let response
      if (mode === "create") {
        response = await externalUsersAPI.createExternalUser(submitData)
      } else {
        // Always send job_description as role for edit as well
        submitData.role = formData.job_description.trim();
        response = await externalUsersAPI.updateExternalUser(editUser.id, submitData)
      }

      if (onUserSaved) {
        onUserSaved(response.data)
      }
    } catch (err) {
      console.error("External user save error:", err)
      const errorData = err.response?.data
      
      if (errorData?.field) {
        setFieldErrors({ [errorData.field]: errorData.message })
      } else if (errorData?.message) {
        setError(errorData.message)
      } else {
        setError(mode === "create" ? "Failed to add external user" : "Failed to update external user")
      }
    } finally {
      setLoading(false)
    }
  }

  const getFieldClassName = (fieldName) => {
    const baseClass = "w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 transition-colors"
    if (fieldErrors[fieldName]) {
      return `${baseClass} border-red-500 focus:ring-red-200`
    }
    return `${baseClass} border-gray-300 focus:ring-primary-200 focus:border-primary-500`
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl text-sm">
        <p className="font-medium">External User Registration</p>
        <p className="text-xs mt-1">External users don't need login credentials. Only basic contact information is required.</p>
      </div>

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
            Phone Number <span className="text-red-500">*</span>
          </label>
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

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Job Description/Role <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            <select
              name="job_description"
              value={formData.job_description}
              onChange={handleChange}
              className={getFieldClassName('job_description')}
            >
              <option value="">Select job role</option>
              {jobRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            {formData.job_description === "Other" && (
              <input
                type="text"
                name="job_description"
                value=""
                onChange={(e) => setFormData({ ...formData, job_description: e.target.value })}
                className={getFieldClassName('job_description')}
                placeholder="Specify other job description"
              />
            )}
          </div>
          {fieldErrors.job_description && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.job_description}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email <span className="text-gray-500 text-xs">(Optional)</span>
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={getFieldClassName('email')}
            placeholder="Enter email address (optional)"
          />
          <p className="text-xs text-gray-500 mt-1">
            Email is optional for external users as they won't access the system directly.
          </p>
          {fieldErrors.email && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Company Name <span className="text-gray-500 text-xs">(Optional)</span>
          </label>
          <input
            type="text"
            name="company_name"
            value={formData.company_name}
            onChange={handleChange}
            className={getFieldClassName('company_name')}
            placeholder="Enter company name (optional)"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address <span className="text-gray-500 text-xs">(Optional)</span>
          </label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className={getFieldClassName('address')}
            placeholder="Enter address (optional)"
          />
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
              {mode === "create" ? "Adding..." : "Updating..."}
            </span>
          ) : (
            mode === "create" ? "Add External User" : "Update External User"
          )}
        </button>
      </div>
    </form>
  )
}

export default ExternalUserForm