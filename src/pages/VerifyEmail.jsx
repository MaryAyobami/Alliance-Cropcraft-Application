"use client"

import { useState, useEffect } from "react"
import { Link, useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { authAPI } from "../services/api"
import { Mail, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react"

const VerifyEmail = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [resending, setResending] = useState(false)
  const [userEmail, setUserEmail] = useState("")
  
  const { token } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { verifyEmail, sendEmailVerification } = useAuth()

  useEffect(() => {
    // Get token from URL params or search params
    const verificationToken = token || searchParams.get('token')
    
    // Get email from location state, localStorage, or URL params
    const email = location.state?.email || 
                  localStorage.getItem('pendingVerificationEmail') || 
                  searchParams.get('email')
    
    if (email) {
      setUserEmail(email)
    }

    // Set initial message if coming from registration/login
    if (location.state?.message) {
      setError("")
    }

    if (verificationToken) {
      setLoading(true)
      handleVerification(verificationToken)
    } else if (!location.state?.message) {
      setError("Invalid or missing verification token.")
    }
  }, [token, searchParams, location.state])

  const handleVerification = async (verificationToken) => {
    try {
      const response = await authAPI.verifyEmail(verificationToken)
      setSuccess(true)
      setError("")
      
      // Clear stored email
      localStorage.removeItem('pendingVerificationEmail')
      
      setTimeout(() => {
        navigate("/login", { 
          state: { 
            message: "Email verified successfully! You can now log in.",
            type: "success"
          }
        })
      }, 3000)
    } catch (error) {
      const errorData = error.response?.data
      if (errorData?.token_expired) {
        setError("Verification link has expired. Please request a new one.")
      } else {
        setError(errorData?.message || "Email verification failed. The link may be invalid or expired.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    let email = userEmail
    
    if (!email) {
      email = prompt("Please enter your email address to resend verification:")
      if (!email) return
    }

    setResending(true)
    setError("")
    
    try {
      await authAPI.sendVerification(email)
      setError("")
      alert("Verification email has been sent to your email address. Please check your inbox and spam folder.")
    } catch (error) {
      const errorData = error.response?.data
      setError(errorData?.message || "Failed to send verification email.")
    } finally {
      setResending(false)
    }
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen farm-gradient flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="card-enhanced text-center">
            <div className="w-16 h-16 sky-gradient rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Verifying Email</h2>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">
              Please wait while we verify your email address...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Show success state
  if (success) {
    return (
      <div className="min-h-screen farm-gradient flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="card-enhanced text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Email Verified Successfully!</h2>
            <p className="text-gray-600 mb-6">
              Your email address has been verified. You can now log in to your account.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              You will be redirected to the login page in a few seconds.
            </p>
            <Link
              to="/login"
              className="btn-primary w-full flex items-center justify-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go to Login</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Show verification required state or error state
  return (
    <div className="min-h-screen farm-gradient flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="card-enhanced text-center">
          <div className={`w-16 h-16 ${error ? 'bg-red-100' : 'bg-blue-100'} rounded-full flex items-center justify-center mx-auto mb-6`}>
            {error ? (
              <AlertCircle className="w-8 h-8 text-red-600" />
            ) : (
              <Mail className="w-8 h-8 text-blue-600" />
            )}
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {error ? "Email Verification" : "Verify Your Email"}
          </h2>
          
          <p className="text-gray-600 mb-6">
            {error || location.state?.message || "Please check your email for a verification link."}
          </p>
          
          {userEmail && (
            <p className="text-sm text-gray-500 mb-6">
              Verification email sent to: <strong>{userEmail}</strong>
            </p>
          )}
          
          <div className="space-y-4">
            <button
              onClick={handleResendVerification}
              disabled={resending}
              className="btn-primary w-full flex items-center justify-center space-x-2"
            >
              {resending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  <span>Resend Verification Email</span>
                </>
              )}
            </button>
            
            <Link
              to="/login"
              className="btn-secondary w-full flex items-center justify-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Login</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VerifyEmail