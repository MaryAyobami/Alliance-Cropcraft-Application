"use client"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  BarChart3,
  Users,
  UserPlus,
  Settings,
  LogOut,
  Bell,
} from "lucide-react"

const Layout = ({ children }) => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Tasks", href: "/tasks", icon: CheckSquare },
    { name: "Calendar", href: "/calendar", icon: Calendar },
    { name: "Reports", href: "/reports", icon: BarChart3 },
  ]

  // Add admin-only navigation items
  if (user?.role === "Admin User") {
    navigation.push(
      { name: "Manage Users", href: "/manage-users", icon: Users },
      { name: "Add User", href: "/add-user", icon: UserPlus },
      { name: "Settings", href: "/settings", icon: Settings },
    )
  }

    const CompanyLogo = () => (
    <div className="relative inline-block">
      <svg width="40" height="50" viewBox="0 0 80 80" className="animate-logo-glow">
        {/* Circular background with gradient */}
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#059669" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Background circle */}
        <circle cx="40" cy="40" r="38" fill="url(#logoGradient)" filter="url(#glow)" />
        
        {/* Wheat stalks */}
        <g fill="white" transform="translate(20, 15)">
          {/* Left wheat stalk */}
          <path d="M8 45 L10 20 Q10 18 12 18 Q14 18 14 20 L16 45" stroke="white" strokeWidth="2" fill="none"/>
          <ellipse cx="12" cy="20" rx="3" ry="2" />
          <ellipse cx="12" cy="24" rx="2.5" ry="1.5" />
          <ellipse cx="12" cy="28" rx="2" ry="1" />
          
          {/* Center wheat stalk */}
          <path d="M18 50 L20 15 Q20 13 22 13 Q24 13 24 15 L26 50" stroke="white" strokeWidth="2" fill="none"/>
          <ellipse cx="22" cy="15" rx="3.5" ry="2.5" />
          <ellipse cx="22" cy="19" rx="3" ry="2" />
          <ellipse cx="22" cy="23" rx="2.5" ry="1.5" />
          <ellipse cx="22" cy="27" rx="2" ry="1" />
          
          {/* Right wheat stalk */}
          <path d="M28 45 L30 20 Q30 18 32 18 Q34 18 34 20 L36 45" stroke="white" strokeWidth="2" fill="none"/>
          <ellipse cx="32" cy="20" rx="3" ry="2" />
          <ellipse cx="32" cy="24" rx="2.5" ry="1.5" />
          <ellipse cx="32" cy="28" rx="2" ry="1" />
        </g>
        
        {/* Small leaves */}
        <g fill="#dcfce7">
          <ellipse cx="25" cy="35" rx="4" ry="2" transform="rotate(-30 25 35)" />
          <ellipse cx="55" cy="35" rx="4" ry="2" transform="rotate(30 55 35)" />
        </g>
      </svg>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-sm border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <CompanyLogo />
            <div>
              <h1 className="font-bold text-lg text-gray-900">Alliance CropCraft</h1>
              {/* <p className="text-sm text-primary-700">Limited</p> */}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.href

            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center space-x-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? "bg-primary-600 text-white" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 capitalize">
                {location.pathname.replace("/", "") || "Dashboard"}
              </h2>
            </div>

            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-gray-400 hover:text-gray-600">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  3
                </span>
              </button>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                  <p className="text-xs text-primary-600">{user?.role}</p>
                </div>
                <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.full_name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </span>
                </div>
                <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-gray-600">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}

export default Layout
