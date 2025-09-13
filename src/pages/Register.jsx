"use client"

import { useState, useRef, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { authAPI } from "../services/api"
import Logo, { SVGLogo } from "../components/Logo"

const Register = () => {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    role: "",
    password: "",
    confirmPassword: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const containerRef = useRef(null)
  const errorRef = useRef(null)
  const { login } = useAuth()
  const navigate = useNavigate()

  const roles = ["Farm Attendant", "Veterinary Doctor", "Pasture Officer", "Admin", "Farm Manager", "Maintenance Officer", "Feed Production Officer"]

  // Auto-scroll to error when error changes
  useEffect(() => {
    if (error && errorRef.current && containerRef.current) {
      setTimeout(() => {
        errorRef.current.scrollIntoView({ 
          behavior: "smooth", 
          block: "center",
          inline: "nearest"
        })
      }, 100)
    }
  }, [error])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  // Validation helpers
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const validatePhone = (phone) => /^\d{10,15}$/.test(phone.replace(/\D/g, "")) // Accepts 10-15 digits
  const validatePassword = (password) =>
    password.length >= 8 &&
    /[0-9!@#$%^&*(),.?":{}|<>]/.test(password) // Must contain a number or symbol

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    if (!acceptTerms) {
      setError("Please accept the terms and conditions")
      setLoading(false)
      return
    }

    if (!validateEmail(formData.email)) {
      setError("Please enter a valid email address")
      setLoading(false)
      return
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      setError("Please enter a valid phone number (10-15 digits)")
      setLoading(false)
      return
    }

    if (!validatePassword(formData.password)) {
      setError("Password must be at least 8 characters and contain a number or symbol")
      setLoading(false)
      return
    }

    if (!formData.full_name.trim()) {
      setError("Full name is required")
      setLoading(false)
      return
    }
      
    if (!formData.role) {
      setError("Please select your role")
      setLoading(false)
      return
    }

    try {
      const { confirmPassword, ...registerData } = formData
      const response = await authAPI.register(registerData)
      
      // Check if email verification is required
      if (response.data.verification_required) {
        // Store email for verification page
        localStorage.setItem('pendingVerificationEmail', response.data.user.email)
        navigate("/registration-successful", { 
          state: { 
            message: response.data.message,
            email: response.data.user.email 
          }
        })
      } else {
        // Old flow for backward compatibility
        const { token, user } = response.data
        login(token, user)
        navigate("/dashboard")
      }
    } catch (error) {
      const errorData = error.response?.data
      if (errorData?.field) {
        // Handle field-specific errors
        setError(errorData.message)
        // You could also highlight the specific field here
      } else {
        setError(errorData?.message || "Registration failed")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={containerRef} className="min-h-screen flex flex-col lg:flex-row relative">
      {/* Left Side - Green Farm Image - Fixed Height */}
      <div className="hidden lg:flex lg:w-3/5 relative overflow-hidden h-screen sticky top-0">
        {/* Green Farm Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transform scale-105 transition-transform duration-700 hover:scale-100"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1625246333195-78d9c38ad449?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2940&q=80')`
          }}
        >
          {/* Gradient overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-black/30 to-transparent"></div>
        </div>

        {/* Company Logo - Top Left */}
        <div className="absolute top-8 left-8 z-20 animate-slide-down">
          <div className="flex items-center space-x-4">
            <Logo size="48" />
            <div className="text-white">
              <h3 className="text-xl font-bold tracking-wide">Alliance CropCraft</h3>
              <p className="text-sm opacity-90 font-medium">Limited</p>
            </div>
          </div>
        </div>

        {/* Main Content - Bottom */}
        <div className="relative z-10 flex flex-col justify-end p-6 lg:p-12 text-white">
          <div className="max-w-lg animate-slide-up">
            <div className="mb-6">
              <div className="w-16 h-1 bg-primary-700 mb-4 animate-expand"></div>
              <h1 className="text-xl sm:text-3xl lg:text-5xl font-bold mb-3 leading-tight">
                Create an Account
              </h1>
            </div>
            
            <div className="space-y-3 animate-slide-up delay-300">
              <p className="text-lg opacity-90 leading-relaxed">
                Create your account to access Alliance CropCraft comprehensive farm management dashboard with real-time insights.
              </p>
              
              <div className="flex items-center space-x-6 text-sm opacity-80 mt-6">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary-700 rounded-full animate-pulse"></div>
                  <span>Livestock Monitoring</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary-700 rounded-full animate-pulse delay-300"></div>
                  <span>Task Management</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary-700 rounded-full animate-pulse delay-600"></div>
                  <span>Smart Reports</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Enhanced Registration Form */}
      <div className="w-full lg:w-2/5 relative overflow-hidden min-h-screen">
        {/* Animated Background with circles and animal stickers */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-primary-50">
          {/* Circle 1 with Cow */}
          <div className="absolute top-20 right-20 w-40 h-40 bg-primary-200/20 rounded-full animate-float blur-xl"></div>
          <div className="absolute top-24 right-24 w-10 h-10 flex items-center justify-center animate-float delay-100">
            <svg viewBox="0 0 64 64" className="w-8 h-8 opacity-70">
              <circle cx="32" cy="32" r="30" fill="#8B4513"/>
              <ellipse cx="32" cy="45" rx="25" ry="15" fill="#D2691E"/>
              <circle cx="25" cy="25" r="3" fill="#000"/>
              <circle cx="39" cy="25" r="3" fill="#000"/>
              <ellipse cx="32" cy="35" rx="4" ry="2" fill="#000"/>
              <path d="M20 15 Q15 10 12 15 Q15 20 20 15" fill="#8B4513"/>
              <path d="M44 15 Q49 10 52 15 Q49 20 44 15" fill="#8B4513"/>
              <rect x="28" y="50" width="8" height="12" fill="#000"/>
            </svg>
          </div>

          {/* Circle 2 with Pig */}
          <div className="absolute bottom-40 left-10 w-32 h-32 bg-green-300/20 rounded-full animate-float-reverse delay-1000 blur-lg"></div>
          <div className="absolute bottom-44 left-14 w-8 h-8 flex items-center justify-center animate-float-reverse delay-1100">
            <svg viewBox="0 0 64 64" className="w-7 h-7 opacity-70">
              <ellipse cx="32" cy="35" rx="22" ry="18" fill="#FFB6C1"/>
              <circle cx="32" cy="25" r="15" fill="#FFB6C1"/>
              <circle cx="27" cy="22" r="2" fill="#000"/>
              <circle cx="37" cy="22" r="2" fill="#000"/>
              <ellipse cx="32" cy="28" rx="6" ry="4" fill="#FF69B4"/>
              <circle cx="30" cy="28" r="1" fill="#000"/>
              <circle cx="34" cy="28" r="1" fill="#000"/>
              <path d="M20 18 Q15 15 18 12 Q22 15 20 18" fill="#FFB6C1"/>
              <path d="M44 18 Q49 15 46 12 Q42 15 44 18" fill="#FFB6C1"/>
              <path d="M32 45 Q28 50 32 52 Q36 50 32 45" fill="#FF69B4"/>
            </svg>
          </div>

          {/* Circle 3 with Chicken */}
          <div className="absolute top-1/2 right-10 w-24 h-24 bg-teal-200/30 rounded-full animate-pulse-slow delay-500 blur-lg"></div>
          <div className="absolute top-1/2 right-14 w-7 h-7 flex items-center justify-center animate-pulse-slow delay-600">
            <svg viewBox="0 0 64 64" className="w-6 h-6 opacity-70">
              <ellipse cx="32" cy="40" rx="18" ry="20" fill="#FFFFFF"/>
              <circle cx="32" cy="25" r="12" fill="#FFFFFF"/>
              <circle cx="29" cy="22" r="1.5" fill="#000"/>
              <circle cx="35" cy="22" r="1.5" fill="#000"/>
              <path d="M32 26 L28 28 L32 30 Z" fill="#FFA500"/>
              <path d="M25 15 Q20 10 25 8 Q30 12 25 15" fill="#FF0000"/>
              <ellipse cx="32" cy="55" rx="8" ry="3" fill="#FFA500"/>
              <circle cx="28" cy="55" r="1" fill="#FFA500"/>
              <circle cx="36" cy="55" r="1" fill="#FFA500"/>
            </svg>
          </div>

          {/* Circle 4 with Sheep */}
          <div className="absolute top-1/3 left-1/4 w-28 h-28 bg-lime-200/20 rounded-full animate-float delay-700 blur-xl"></div>
          <div className="absolute top-1/3 left-1/4 w-8 h-8 flex items-center justify-center animate-float delay-800">
            <svg viewBox="0 0 64 64" className="w-7 h-7 opacity-70">
              <ellipse cx="32" cy="38" rx="20" ry="15" fill="#F5F5DC"/>
              <circle cx="32" cy="25" r="10" fill="#000"/>
              <circle cx="29" cy="22" r="1" fill="#FFF"/>
              <circle cx="35" cy="22" r="1" fill="#FFF"/>
              <circle cx="25" cy="30" r="4" fill="#F5F5DC"/>
              <circle cx="39" cy="30" r="4" fill="#F5F5DC"/>
              <circle cx="20" cy="35" r="3" fill="#F5F5DC"/>
              <circle cx="44" cy="35" r="3" fill="#F5F5DC"/>
              <circle cx="32" cy="20" r="3" fill="#F5F5DC"/>
              <rect x="28" y="48" width="3" height="10" fill="#000"/>
              <rect x="33" y="48" width="3" height="10" fill="#000"/>
            </svg>
          </div>

          {/* Circle 5 with Horse */}
          <div className="absolute bottom-20 right-1/3 w-20 h-20 bg-primary-700/20 rounded-full animate-float-reverse delay-300 blur-lg"></div>
          <div className="absolute bottom-24 right-1/3 w-7 h-7 flex items-center justify-center animate-float-reverse delay-400">
            <svg viewBox="0 0 64 64" className="w-6 h-6 opacity-70">
              <ellipse cx="32" cy="40" rx="16" ry="18" fill="#8B4513"/>
              <ellipse cx="32" cy="20" rx="8" ry="12" fill="#8B4513"/>
              <circle cx="29" cy="18" r="1" fill="#000"/>
              <circle cx="35" cy="18" r="1" fill="#000"/>
              <path d="M32 22 L28 24 L32 26 Z" fill="#000"/>
              <path d="M28 8 Q25 5 28 3 Q32 6 30 10 Q28 12 28 8" fill="#654321"/>
              <path d="M36 8 Q39 5 36 3 Q32 6 34 10 Q36 12 36 8" fill="#654321"/>
              <rect x="26" y="52" width="3" height="8" fill="#000"/>
              <rect x="35" y="52" width="3" height="8" fill="#000"/>
              <ellipse cx="32" cy="25" rx="12" ry="8" fill="#A0522D"/>
            </svg>
          </div>

          {/* Additional smaller circles with mini animals */}
          <div className="absolute top-32 left-16 w-6 h-6 animate-float delay-1500 opacity-60">
            <svg viewBox="0 0 32 32" className="w-6 h-6">
              <circle cx="16" cy="16" r="14" fill="#90EE90"/>
              <text x="16" y="20" textAnchor="middle" fontSize="16" fill="#4A5568">🐰</text>
            </svg>
          </div>

          <div className="absolute bottom-32 right-12 w-6 h-6 animate-float-reverse delay-2000 opacity-60">
            <svg viewBox="0 0 32 32" className="w-6 h-6">
              <circle cx="16" cy="16" r="14" fill="#FFE4B5"/>
              <text x="16" y="20" textAnchor="middle" fontSize="16" fill="#4A5568">🐐</text>
            </svg>
          </div>
        </div>

        {/* Form Content - Scrollable */}
        <div className="relative z-10 flex items-center justify-center min-h-screen p-6 overflow-y-auto">
          <div className="max-w-md w-full animate-fade-in-up my-8">
            {/* Mobile Logo */}
            <div className="text-center mb-6 lg:hidden">
              <div className="flex justify-center mb-4">
                <Logo size="64" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Alliance CropCraft</h2>
              <p className="text-primary-600 font-medium">Limited</p>
            </div>

            <div className="bg-white/85 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-6 transition-all duration-500 hover:shadow-3xl hover:bg-white/90">
              
              {/* Desktop Form Header */}
              <div className="text-center mb-6 hidden lg:block">
                <div className="inline-flex items-center justify-center w-16 h-16 ">
                    <Logo size="64" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 animate-slide-down mb-2">Create Account</h2>
              </div>

              {error && (
                <div ref={errorRef} className="mb-4 p-4 bg-red-50 border-l-4 border-red-400 rounded-r-xl animate-shake">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-red-700 font-medium text-sm">{error}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name */}
                <div className="animate-slide-up delay-300">
                  <label htmlFor="full_name" className="block text-sm font-semibold text-gray-700 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <input
                      id="full_name"
                      name="full_name"
                      type="text"
                      required
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none transition-all duration-300 hover:border-green-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500"
                      placeholder="Enter your full name"
                      value={formData.full_name}
                      onChange={handleChange}
                    />
                    
                  </div>
                </div>

                {/* Email */}
                <div className="animate-slide-up delay-400">
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none transition-all duration-300 hover:border-green-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500"
                      placeholder="Enter your email address"
                      value={formData.email}
                      onChange={handleChange}
                    />
                   
                  </div>
                </div>

                {/* Phone */}
                <div className="animate-slide-up delay-500">
                  <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none transition-all duration-300 hover:border-green-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500"
                      placeholder="Enter your phone number"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                   
                  </div>
                </div>

                {/* Role */}
                <div className="animate-slide-up delay-600">
                  <label htmlFor="role" className="block text-sm font-semibold text-gray-700 mb-2">
                    Role
                  </label>
                  <div className="relative">
                    <select
                      id="role"
                      name="role"
                      required
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none transition-all duration-300 hover:border-green-300 bg-white/70 backdrop-blur-sm text-gray-900 appearance-none"
                      value={formData.role}
                      onChange={handleChange}
                    >
                      <option value="">Select your role</option>
                      {roles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                   
                    <svg className="absolute right-4 top-4 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Password */}
                <div className="animate-slide-up delay-700">
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none transition-all duration-300 hover:border-green-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500"
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="animate-slide-up delay-800">
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none transition-all duration-300 hover:border-green-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500"
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div className="animate-slide-up delay-900 bt-2">
                  <div className="flex items-start space-x-3 mt-4">
                    <input
                      id="acceptTerms"
                      type="checkbox"
                      className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded transition-colors duration-200"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                    />
                    <label htmlFor="acceptTerms" className="text-sm text-gray-700 leading-relaxed">
                      I agree to the{" "}
                      <a href="#" className="text-green-600 hover:text-green-700 font-medium underline">
                        Terms and Conditions
                      </a>{" "}
                      and{" "}
                      <a href="#" className="text-green-600 hover:text-green-700 font-medium underline">
                        Privacy Policy
                      </a>
                    </label>
                  </div>
                </div>

                {/* Submit Button */}
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full bg-gradient-to-r from-green-600 via-green-500 to-teal-600 hover:from-green-700 hover:via-green-600 hover:to-teal-700 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 hover:shadow-xl active:scale-95 animate-slide-up delay-1000 shadow-lg mt-6"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Account...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      Create Account
                    </span>
                  )}
                </button>
              </form>

              {/* Sign In Link */}
              <div className="mt-6 text-center animate-slide-up delay-1100">
                <p className="text-sm text-gray-600 mb-4">
                  Already have an account?
                </p>
                <Link 
                  to="/login" 
                  className="inline-flex items-center px-6 py-3 border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white font-semibold rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg active:scale-95"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced CSS animations */}
      <style jsx>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes expand {
          from { width: 0; }
          to { width: 4rem; }
        }
        
        @keyframes bounce-gentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          33% { transform: translateY(-20px) translateX(10px); }
          66% { transform: translateY(-10px) translateX(-5px); }
        }
        
        @keyframes float-reverse {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          33% { transform: translateY(-15px) translateX(-10px); }
          66% { transform: translateY(-25px) translateX(5px); }
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.05); }
        }
        
        @keyframes logo-glow {
          0%, 100% { filter: drop-shadow(0 0 10px rgba(16, 185, 129, 0.3)); }
          50% { filter: drop-shadow(0 0 20px rgba(16, 185, 129, 0.6)); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        .animate-slide-up { animation: slide-up 0.8s ease-out forwards; opacity: 0; }
        .animate-slide-down { animation: slide-down 0.8s ease-out forwards; opacity: 0; }
        .animate-fade-in-up { animation: fade-in-up 1.2s ease-out forwards; opacity: 0; }
        .animate-expand { animation: expand 1.5s ease-out forwards; }
        .animate-bounce-gentle { animation: bounce-gentle 3s ease-in-out infinite; }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-reverse { animation: float-reverse 8s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
        .animate-logo-glow { animation: logo-glow 3s ease-in-out infinite; }
        .animate-shake { animation: shake 0.6s ease-in-out; }
        
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }
        .delay-500 { animation-delay: 0.5s; }
        .delay-600 { animation-delay: 0.6s; }
        .delay-700 { animation-delay: 0.7s; }
        .delay-800 { animation-delay: 0.8s; }
        .delay-900 { animation-delay: 0.9s; }
        .delay-1000 { animation-delay: 1s; }
        .delay-1100 { animation-delay: 1.1s; }
        .delay-1200 { animation-delay: 1.2s; }
        .delay-1500 { animation-delay: 1.5s; }
        .delay-2000 { animation-delay: 2s; }
        
        .shadow-3xl {
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
      `}</style>
    </div>
  )
}

export default Register