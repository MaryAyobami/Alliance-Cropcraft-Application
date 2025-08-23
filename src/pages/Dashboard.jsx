"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import { dashboardAPI } from "../services/api"
import { TrendingUp, Users, Calendar, CheckCircle, Clock, Sun, Sunset, Moon, Cloud, CloudRain, Thermometer, MapPin, ArrowRight } from "lucide-react"
import { useNavigate } from "react-router-dom"

const Dashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [tasks, setTasks] = useState({ morning: [], afternoon: [], evening: [] })
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const statsResponse = await dashboardAPI.getStats()
        const tasksResponse = await dashboardAPI.getTasks()

        setStats(statsResponse.data)
        setTasks(tasksResponse.data)
        console.log(statsResponse.data)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    const fetchWeatherData = async () => {
      try {
        // Farm location in Ilorin, Oyo State, Nigeria
        const farmLocation = {
          lat: 7.7883,
          lon: 3.9190,
          name: "Alliance CropCraft Farm"
        }
        
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${farmLocation.lat}&lon=${farmLocation.lon}&appid=f4d6cec31b04951c0ac2ac398f1a3c40&units=metric`
        )
        
        console.log(response)
        if (response.ok) {
          const data = await response.json()
          setWeather({
            temperature: Math.round(data.main.temp),
            description: data.weather[0].description,
            condition: data.weather[0].main,
            humidity: data.main.humidity,
            feelsLike: Math.round(data.main.feels_like),
            location: farmLocation.name
          })
        } else {
          throw new Error('Weather API request failed')
        }
      } catch (error) {
        console.error("Error fetching weather data:", error)
        setWeather({
          temperature: 28,
          description: "partly cloudy",
          condition: "Clouds",
          humidity: 75,
          feelsLike: 31,
          location: "Alliance CropCraft Farm"
        })
      }
    }

    fetchDashboardData()
    fetchWeatherData()
  }, [])

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

  const getWeatherIcon = (condition) => {
    switch (condition?.toLowerCase()) {
      case "clear":
        return Sun
      case "clouds":
        return Cloud
      case "rain":
      case "drizzle":
        return CloudRain
      default:
        return Sun
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 17) return "Good afternoon"
    return "Good evening"
  }

  const TaskSection = ({ title, tasks, icon: Icon, color }) => (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center shadow-sm`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">
              {tasks.filter((t) => t.status === "completed").length} of {tasks.length} completed
            </p>
          </div>
        </div>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-3 mb-6">
        <div
          className={`h-3 rounded-full transition-all duration-500 ${color.replace('bg-', 'bg-').replace('-500', '-400')}`}
          style={{
            width: `${tasks.length > 0 ? (tasks.filter((t) => t.status === "completed").length / tasks.length) * 100 : 0}%`,
          }}
        ></div>
      </div>

      <div className="space-y-4">
        {tasks.slice(0, 4).map((task) => (
          <div 
            key={task.id} 
            className="flex items-center justify-between group hover:bg-gray-50 -mx-2 px-2 py-2 rounded-lg transition-colors cursor-pointer"
            onClick={() => navigate(`/task-details/${task.id}`)}
          >
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              {task.status === "completed" ? (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : (
                <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className={`font-medium ${task.status === "completed" ? "line-through text-gray-500" : "text-gray-900"}`}>
                  {task.title}
                </p>
                <p className="text-sm text-gray-500 mt-1">{task.due_time}</p>
              </div>
            </div>
            <span className={`px-3 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)} ml-3 flex-shrink-0`}>
              {task.priority}
            </span>
          </div>
        ))}
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const WeatherIcon = weather ? getWeatherIcon(weather.condition) : Sun

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-6">
      {/* Hero Section with Weather Integration */}
  <div className="relative bg-gradient-to-br from-primary-800 via-primary-700 to-primary-500 rounded-2xl p-4 sm:p-8 text-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-black bg-opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%), 
                             radial-gradient(circle at 75% 75%, rgba(255,255,255,0.1) 0%, transparent 50%)`
          }}></div>
        </div>

        <div className="relative z-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-0">
            {/* Welcome Section */}
            <div className="flex-1">
              <h1 className="text-2xl sm:text-2xl lg:text-4xl font-bold mb-2">
                {getGreeting()}, {user?.full_name}!
              </h1>
              <p className="text-white text-base sm:text-md mb-4">
                You have {stats?.pendingTasks || 0} pending tasks today
              </p>
              <div className="flex flex-wrap items-center gap-4 sm:gap-8">
                <div>
                  <div className="text-3xl sm:text-2xl font-bold">{stats?.completedTasks || "0/0"}</div>
                  <p className="text-white text-sm">Tasks Completed</p>
                </div>
                <div className="hidden sm:block h-12 w-px bg-blue-300 opacity-50"></div>
                <div>
                  <div className="text-3xl sm:text-2xl font-bold">{stats?.completionRate || 0}%</div>
                  <p className="text-white text-sm">Success Rate</p>
                </div>
              </div>
            </div>

            {/* Weather Section */}
            {weather && (
              <div className="hidden sm:block lg:text-right">
                <div className="flex flex-row items-center gap-4 lg:flex-col lg:items-end lg:gap-0 lg:space-y-2">
                  <WeatherIcon className="w-16 h-16 sm:w-12 sm:h-12 md:w-12 md:h-12 text-white opacity-90" />
                  <div>
                    <div className="text-2xl sm:text-2xl font-bold">{weather.temperature}°C</div>
                    <p className="text-white capitalize text-lg sm:text-sm">{weather.description}</p>
                    <div className="flex items-center justify-end space-x-1 mt-2 text-white">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{weather.location}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
{/* {weather && (
  <div className="block sm:hidden bg-gradient-to-br from-farm-700 via-farm-700 to-farm-500 rounded-2xl p-4 text-white mb-4">
    <div className="flex items-center gap-4">
      <WeatherIcon className="w-10 h-10 text-white opacity-90" />
      <div>
        <div className="text-xl font-bold">{weather.temperature}°C</div>
        <p className="text-white capitalize text-md">{weather.description}</p>
        <div className="flex items-center space-x-1 mt-2 text-white">
          <MapPin className="w-4 h-4" />
          <span className="text-sm">{weather.location}</span>
        </div>
      </div>
    </div>
  </div>
)} */}
      {/* Stats Overview */}
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="card group hover:shadow-lg transition-all duration-300">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.completionRate || 0}%</p>
            </div>
          </div>
        </div>

        <div className="card group hover:shadow-lg transition-all duration-300">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Active Staff</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.activeStaff || 0}</p>
            </div>
          </div>
        </div>

        <div className="card group hover:shadow-lg transition-all duration-300">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Calendar className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">This Week</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.thisWeekTasks || 0} Tasks</p>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Schedule */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-2">
          <div className="flex items-center gap-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Today's Schedule</h2>
            <button
              onClick={() => navigate('/task-history?week=current')}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
            >
              <span>Tasks This Week</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="text-xs sm:text-sm text-gray-500">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
          <TaskSection 
            title="Morning Tasks" 
            tasks={tasks.morning} 
            icon={Sun} 
            color="bg-gradient-to-br from-amber-400 to-orange-500" 
          />

          <TaskSection 
            title="Afternoon Tasks" 
            tasks={tasks.afternoon} 
            icon={Sunset} 
            color="bg-gradient-to-br from-red-400 to-pink-500" 
          />

          <TaskSection 
            title="Evening Tasks" 
            tasks={tasks.evening} 
            icon={Moon} 
            color="bg-gradient-to-br from-indigo-400 to-purple-500" 
          />
        </div>
      </div>
    </div>
  )
}

export default Dashboard