"use client"

import { useState } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { authAPI } from "../services/api"

const ResetPassword = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError("")
    if (password.length < 6) return setError("Password must be at least 6 characters")
    if (password !== confirm) return setError("Passwords do not match")
    try {
      await authAPI.resetPassword({ token, password })
      setDone(true)
      setTimeout(() => navigate('/login'), 1500)
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to reset password')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">Reset Password</h2>
        {done ? (
          <p className="text-green-700">Password updated. Redirecting to login…</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <div>
              <label className="block text-sm mb-1">New password</label>
              <input className="input-field" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm mb-1">Confirm password</label>
              <input className="input-field" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required />
            </div>
            <button className="btn-primary w-full" type="submit">Update password</button>
          </form>
        )}
      </div>
    </div>
  )
}

export default ResetPassword

