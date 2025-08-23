"use client"

import { useState, useEffect } from "react"
import { Link, useParams, useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { Mail, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react"

const VerifyEmail = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [resending, setResending] = useState(false)
  
  const { token } = useParams()
  const navigate = useNavigate()
  const { verifyEmail, sendEmailVerification } = useAuth()

  useEffect(() => {
    if (token) {
      handleVerification()
    } else {
      setLoading(false)
      setError("Invalid or missing verification token.")
    }
  }, [token])

  const handleVerification = async () => {
    try {
      await verifyEmail(token)
      setSuccess(true)
      setTimeout(() => {
        navigate("/login")
      }, 3000)
    } catch (error) {
      setError(error.response?.data?.message || "Email verification failed. The link may be invalid or expired.")
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    const email = prompt("Please enter your email address to resend verification:")
    if (!email) return

    setResending(true)
    try {
      await sendEmailVerification(email)
      alert("Verification email has been sent to your email address.")
    } catch (error) {
      alert(error.response?.data?.message || "Failed to send verification email.")
    } finally {
      setResending(false)
    }
  }

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

  return (
    <div className="min-h-screen farm-gradient flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="card-enhanced text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Email Verification Failed</h2>
          <p className="text-gray-600 mb-6">
            {error}
          </p>
          
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