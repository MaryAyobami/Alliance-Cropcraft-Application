import axios from "axios"

const API_BASE_URL = "/api"

const api = axios.create({
  baseURL: API_BASE_URL,
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auth API
export const authAPI = {
  login: (credentials) => api.post("/auth/login", credentials),
  register: (userData) => api.post("/auth/register", userData),
}

// User API
export const userAPI = {
  getProfile: () => api.get("/users/profile"),
  updateProfile: (userData) => api.put("/users/profile", userData),
  getUsers: () => api.get("/users"),
  createUser: (userData) => api.post("/users", userData),
  uploadAvatar: (formData) => api.post("/users/avatar", formData),
  changePassword: (data) => api.put("/users/password", data),
  updateNotifications: (formData) => api.put("/users/notifications", formData),
}
// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get("/dashboard/stats"),
  getTasks: () => api.get("/dashboard/tasks"),
}

// Tasks API
export const tasksAPI = {
  getTasks: () => api.get("/tasks"),
  completeTask: (taskId) => api.put(`/tasks/${taskId}/complete`),
  createTask: (taskData) => api.post("/tasks", taskData),
  completeTaskWithEvidence: (taskData) =>
    api.post(`/tasks/${taskData.get('taskId')}/complete-with-evidence`, taskData),
}

// Events API
export const eventsAPI = {
  getEvents: () => api.get("/events"),
  createEvent: (eventData) => api.post("/events", eventData),
}

// Reports API
export const reportsAPI = {
  getStats: () => api.get("/reports/stats"),
  getStaffPerformance: () => api.get("/reports/staff-performance"),
}

export const subscribePush = (subscription) =>
  api.post("/notifications/subscribe", subscription)

export default api
