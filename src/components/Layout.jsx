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
import { useState } from "react"

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  	const navigation = [
		{ name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
		{ name: "Tasks", href: "/tasks", icon: CheckSquare },
		{ name: "Calendar", href: "/calendar", icon: Calendar },
		...(user?.role === "Admin" ? [{ name: "Reports", href: "/reports", icon: BarChart3 }] : []),
	];

  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      {/* Animated background circles */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <svg width="100%" height="100%" className="absolute top-0 left-0 animate-fade-in" style={{zIndex:0}}>
          <circle cx="10%" cy="10%" r="80" fill="#d1fae5" opacity="0.3">
            <animate attributeName="r" values="80;100;80" dur="6s" repeatCount="indefinite" />
          </circle>
          <circle cx="80%" cy="20%" r="60" fill="#a7f3d0" opacity="0.2">
            <animate attributeName="r" values="60;80;60" dur="7s" repeatCount="indefinite" />
          </circle>
          <circle cx="50%" cy="80%" r="100" fill="#f0abfc" opacity="0.15">
            <animate attributeName="r" values="100;120;100" dur="8s" repeatCount="indefinite" />
          </circle>
        </svg>
      </div>

      {/* Top Navigation Bar */}
      <nav className="relative z-10 w-full bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between lg:hidden">
        <div className="flex items-center gap-3">
          {/* <CompanyLogo /> */}
          <span className="font-bold text-lg text-gray-900">Alliance CropCraft</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Hamburger for mobile */}
          <button className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100" onClick={() => setMenuOpen(!menuOpen)}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          {/* User/Logout/Notifications */}
          <div className="flex items-center gap-3">
            <button className="relative p-2 text-gray-400 hover:text-gray-600">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">3</span>
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                <p className="text-xs text-primary-600">{user?.role}</p>
              </div>
              <div className=" cursor-pointer w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase()}
                </span>
              </div>
              <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-gray-600">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-20 bg-black bg-opacity-30" onClick={() => setMenuOpen(false)}></div>
      )}
      <div className={`fixed top-0 left-0 z-30 w-64 h-full bg-white shadow-lg transform ${menuOpen ? "translate-x-0" : "-translate-x-full"} transition-transform duration-300 lg:hidden`}>
        <div className="p-6 border-b border-gray-200 flex items-center gap-3">
          {/* <CompanyLogo /> */}
          <span className="font-bold text-lg text-gray-900">Alliance CropCraft</span>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${isActive ? "bg-primary-600 text-white" : "text-gray-700 hover:bg-gray-100"}`}
                onClick={() => setMenuOpen(false)}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-gray-200 flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {user?.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase()}
            </span>
          </div>
          <div onClick={()=>navigate('/profile')} className="flex-1 pointer-cursor">
            <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
            <p className="text-xs text-primary-600">{user?.role}</p>
          </div>
          <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-gray-600">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main content with sidebar for desktop */}
      <div className="relative z-10 flex flex-col lg:flex-row">
        {/* Sidebar for desktop */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:min-h-screen bg-white shadow-lg border-r border-gray-200 z-20">
          <div className="p-6 border-b border-gray-200 flex items-center gap-3">
            {/* <CompanyLogo /> */}
            <span className="font-bold text-lg text-gray-900">Alliance CropCraft</span>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${isActive ? "bg-primary-600 text-white" : "text-gray-700 hover:bg-gray-100"}`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>
          <div className="p-4 border-t border-gray-200 flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user?.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase()}
              </span>
            </div>
            <div onClick={()=>navigate('/profile')} className="flex-1 cursor-pointer">
              <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
              <p className="text-xs text-primary-600">{user?.role}</p>
            </div>
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-gray-600">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </aside>
        {/* Main content area */}
        <main className="flex-1 p-2 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

export default Layout;