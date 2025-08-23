"use client"

import { useEffect, useState } from "react"
import { useNavigate, useSearchParams, Link } from "react-router-dom"
import { authAPI } from "../services/api"

const VerifyEmail = () => {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState("verifying")
  const navigate = useNavigate()

  useEffect(() => {
    const token = searchParams.get("token")
    if (!token) {
      setStatus("error")
      return
    }
    const run = async () => {
      try {
        await authAPI.verifyEmail(token)
        setStatus("success")
        setTimeout(() => navigate("/login"), 1500)
      } catch (e) {
        setStatus("error")
      }
    }
    run()
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card max-w-md w-full text-center">
        {status === 'verifying' && (
          <>
            <h2 className="text-xl font-semibold mb-2">Verifying your email…</h2>
            <p className="text-gray-600">Please wait a moment.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <h2 className="text-xl font-semibold mb-2 text-green-700">Email verified!</h2>
            <p className="text-gray-600">Redirecting you to login…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <h2 className="text-xl font-semibold mb-2 text-red-600">Verification failed</h2>
            <p className="text-gray-600">Your verification link is invalid or expired.</p>
            <div className="mt-4">
              <Link className="btn-primary" to="/login">Go to Login</Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default VerifyEmail

