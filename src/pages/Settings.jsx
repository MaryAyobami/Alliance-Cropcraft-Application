import React, { useState, useEffect } from "react"
import { User, Mail, Phone, Lock, Bell, Edit3, Camera, Check, X } from "lucide-react"

const Profile = () => {
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    avatar: ""
  })
  const [avatarPreview, setAvatarPreview] = useState("")
  const [editMode, setEditMode] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: ""
  })
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState({
    push: true,
    email: true,
    morningTime: "08:00",
    eveningTime: "18:00"
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    // Fetch user profile and notification settings from backend
    // Example:
    // setProfile({ name: "John Doe", email: "john@example.com", phone: "08012345678", avatar: "/default-avatar.png" })
    // setNotifications({ push: true, email: true, morningTime: "08:00", eveningTime: "18:00" })
  }, [])

  const handleProfileChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value })
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleSaveProfile = async () => {
    setLoading(true)
    setMessage("")
    // TODO: Send updated profile (including avatar) to backend
    setLoading(false)
    setEditMode(false)
    setMessage("Profile updated successfully!")
    setTimeout(() => setMessage(""), 3000)
  }

  const handlePasswordChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value })
  }

  const handleChangePassword = async () => {
    setLoading(true)
    setMessage("")
    // TODO: Validate and send password change to backend
    setLoading(false)
    setShowPasswordForm(false)
    setPasswords({ current: "", new: "", confirm: "" })
    setMessage("Password changed successfully!")
    setTimeout(() => setMessage(""), 3000)
  }

  const handleNotificationsChange = (e) => {
    const { name, value, type, checked } = e.target
    setNotifications({
      ...notifications,
      [name]: type === "checkbox" ? checked : value
    })
  }

  const handleSaveNotifications = async () => {
    setLoading(true)
    setMessage("")
    // TODO: Send updated notifications to backend
    setLoading(false)
    setShowNotifications(false)
    setMessage("Notification settings updated!")
    setTimeout(() => setMessage(""), 3000)
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-primary-700 bg-clip-text text-transparent mb-2">
            Profile Settings
          </h1>
          <p className="text-slate-600">Manage your account preferences and security settings</p>
        </div>

        {/* Success Message */}
        {message && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 text-center animate-pulse shadow-sm">
            <Check className="inline-block w-5 h-5 mr-2" />
            {message}
          </div>
        )}

        <div className="">
          {/* Profile Information Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary-100 rounded-xl">
                  <User className="w-6 h-6 text-primary-600" />
                </div>
                <h2 className="text-2xl font-semibold text-slate-800">Personal Information</h2>
              </div>
              {!editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-xl transition-all duration-200 hover:scale-105"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit</span>
                </button>
              )}
            </div>

            {/* Avatar Section */}
            <div className="flex items-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 p-1">
                  <div className="w-full h-full rounded-full bg-white p-1">
                    {avatarPreview || profile.avatar ? (
                      <img
                        src={avatarPreview || profile.avatar}
                        alt="Profile Avatar"
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center">
                        <User className="w-8 h-8 text-slate-400" />
                      </div>
                    )}
                  </div>
                </div>
                {editMode && (
                  <label className="absolute -bottom-2 -right-2 p-2 bg-primary-600 hover:bg-primary-700 rounded-full cursor-pointer transition-colors shadow-lg">
                    <Camera className="w-4 h-4 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-slate-800">{profile.name}</h3>
                <p className="text-slate-600">{profile.email}</p>
              </div>
            </div>

            {editMode ? (
              <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    name="name"
                    value={profile.name}
                    onChange={handleProfileChange}
                    placeholder="Full Name"
                    className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-slate-50 focus:bg-white"
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    value={profile.email}
                    onChange={handleProfileChange}
                    placeholder="Email Address"
                    className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-slate-50 focus:bg-white"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={profile.phone}
                    onChange={handleProfileChange}
                    placeholder="Phone Number"
                    className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-slate-50 focus:bg-white"
                  />
                </div>
                <div className="flex space-x-3 pt-2">
                  <button
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Check className="w-5 h-5" />
                    )}
                    <span>{loading ? "Saving..." : "Save Changes"}</span>
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all duration-200 hover:scale-105"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl">
                  <User className="w-5 h-5 text-slate-500" />
                  <div>
                    <p className="text-sm text-slate-500">Name</p>
                    <p className="font-medium text-slate-800">{profile.name}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl">
                  <Mail className="w-5 h-5 text-slate-500" />
                  <div>
                    <p className="text-sm text-slate-500">Email</p>
                    <p className="font-medium text-slate-800">{profile.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl">
                  <Phone className="w-5 h-5 text-slate-500" />
                  <div>
                    <p className="text-sm text-slate-500">Phone</p>
                    <p className="font-medium text-slate-800">{profile.phone}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Security Card */}
          <div className="bg-white/80 backdrop-blur-sm mt-4 rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-slate-100 rounded-xl">
                  <Lock className="w-6 h-6 text-slate-600" />
                </div>
                <h2 className="text-2xl font-semibold text-slate-800">Security</h2>
              </div>
              {!showPasswordForm && (
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-all duration-200 hover:scale-105"
                >
                  <Lock className="w-4 h-4" />
                  <span>Change</span>
                </button>
              )}
            </div>

            {showPasswordForm ? (
              <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    name="current"
                    value={passwords.current}
                    onChange={handlePasswordChange}
                    placeholder="Current Password"
                    className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-slate-50 focus:bg-white"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    name="new"
                    value={passwords.new}
                    onChange={handlePasswordChange}
                    placeholder="New Password"
                    className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-slate-50 focus:bg-white"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    name="confirm"
                    value={passwords.confirm}
                    onChange={handlePasswordChange}
                    placeholder="Confirm New Password"
                    className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-slate-50 focus:bg-white"
                  />
                </div>
                <div className="flex space-x-3 pt-2">
                  <button
                    onClick={handleChangePassword}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Check className="w-5 h-5" />
                    )}
                    <span>{loading ? "Changing..." : "Update Password"}</span>
                  </button>
                  <button
                    onClick={() => setShowPasswordForm(false)}
                    className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all duration-200 hover:scale-105"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl text-center">
                <Lock className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                <p className="text-slate-600">Your password is secure</p>
                <p className="text-sm text-slate-500">Last changed 30 days ago</p>
              </div>
            )}
          </div>
        </div>

        {/* Notifications Card - Full Width */}
        <div className="mt-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-100 rounded-xl">
                <Bell className="w-6 h-6 text-primary-600" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-800">Notifications</h2>
            </div>
            {!showNotifications && (
              <button
                onClick={() => setShowNotifications(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-xl transition-all duration-200 hover:scale-105"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit</span>
              </button>
            )}
          </div>

          {showNotifications ? (
            <div className="grid md:grid-cols-2 gap-6 animate-in slide-in-from-top-2 duration-300">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-700 mb-3">Preferences</h3>
                <label className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    name="push"
                    checked={notifications.push}
                    onChange={handleNotificationsChange}
                    className="w-5 h-5 text-primary-600 border-2 border-slate-300 rounded focus:ring-primary-500 focus:ring-2"
                  />
                  <div>
                    <p className="font-medium text-slate-800">Push Notifications</p>
                    <p className="text-sm text-slate-600">Receive notifications on your device</p>
                  </div>
                </label>
                <label className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    name="email"
                    checked={notifications.email}
                    onChange={handleNotificationsChange}
                    className="w-5 h-5 text-primary-600 border-2 border-slate-300 rounded focus:ring-primary-500 focus:ring-2"
                  />
                  <div>
                    <p className="font-medium text-slate-800">Email Notifications</p>
                    <p className="text-sm text-slate-600">Receive updates via email</p>
                  </div>
                </label>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-700 mb-3">Schedule</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Morning Summary</label>
                    <input
                      type="time"
                      name="morningTime"
                      value={notifications.morningTime}
                      onChange={handleNotificationsChange}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Evening Summary</label>
                    <input
                      type="time"
                      name="eveningTime"
                      value={notifications.eveningTime}
                      onChange={handleNotificationsChange}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 flex space-x-3 pt-4">
                <button
                  onClick={handleSaveNotifications}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check className="w-5 h-5" />
                  )}
                  <span>{loading ? "Saving..." : "Save Settings"}</span>
                </button>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all duration-200 hover:scale-105"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-300">
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-500 mb-1">Push Notifications</p>
                <p className="font-semibold text-slate-800">{notifications.push ? "Enabled" : "Disabled"}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-500 mb-1">Email Notifications</p>
                <p className="font-semibold text-slate-800">{notifications.email ? "Enabled" : "Disabled"}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-500 mb-1">Morning Summary</p>
                <p className="font-semibold text-slate-800">{notifications.morningTime}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-500 mb-1">Evening Summary</p>
                <p className="font-semibold text-slate-800">{notifications.eveningTime}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Profile