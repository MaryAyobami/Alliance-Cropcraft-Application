import React, { useState, useEffect } from "react"
import { User, Mail, Phone, Lock, Bell, Edit3, Camera, Check, X } from "lucide-react"
import { userAPI } from "../services/api"
import api from "../services/api"

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
  const [notifications, setNotifications] = useState({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const VAPID_PUBLIC_KEY = "BNHDRbAjLIrCvsBN1AIZpWClyCqUAUPq9ae46_TgiLy2uY4CGWmozC_cjdLIJtTX-Pg8Zsk0AZzlENIH-YqHMq8" // Replace with your actual public key

  useEffect(() => {
  async function fetchData() {
    try {
      const profileRes = await userAPI.getProfile()
      setProfile({
        name: profileRes.data.full_name,
        email: profileRes.data.email,
        phone: profileRes.data.phone,
        avatar: profileRes.data.avatar || ""
      })
      // Fetch notification preferences
      // If your backend returns them in profile, use them directly
      setNotifications({
        push: profileRes.data.notif_push ?? true,
        email: profileRes.data.notif_email ?? true,
        morningTime: profileRes.data.notif_morning ?? "08:00",
        eveningTime: profileRes.data.notif_evening ?? "18:00"
      })

    } catch (err) {
      // handle error
    }
  }
  fetchData()
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

  const enablePushNotifications = async () => {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    const registration = await navigator.serviceWorker.ready
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      alert("Permission denied for push notifications.")
      return
    }
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: VAPID_PUBLIC_KEY
    })
    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    })
    alert("Push notifications enabled!")
  }
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
  try {
    await userAPI.updateNotifications({
      push: notifications.push,
      email: notifications.email,
      morningTime: notifications.morningTime,
      eveningTime: notifications.eveningTime
    })
    if (notifications.push) {
      await enablePushNotifications()
    }
    setMessage("Notification settings updated!")
  } catch (err) {
    setMessage("Failed to update notification settings.")
  }
  setLoading(false)
  setShowNotifications(false)
  setTimeout(() => setMessage(""), 3000)
}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600 mt-2">Manage your account preferences and security settings</p>
        </div>
      </div>

      {/* Success Message */}
      {message && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center">
          <Check className="w-5 h-5 mr-2" />
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information Card */}
        <div className="lg:col-span-2">
          <div className="card-enhanced">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
              </div>
              {!editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-colors"
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
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
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
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
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
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
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
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
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
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
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
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
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