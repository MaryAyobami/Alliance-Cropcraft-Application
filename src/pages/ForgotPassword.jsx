"use client"

import { useState } from "react"
import { authAPI } from "../services/api"

const ForgotPassword = () => {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  const submit = async (e) => {
    e.preventDefault()
    setError("")
    try {
      await authAPI.forgotPassword(email)
      setSent(true)
    } catch (e) {
      setSent(true) // still show success for security reasons
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">Forgot Password</h2>
        {sent ? (
          <p className="text-gray-700">If an account exists for that email, a reset link has been sent.</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input className="input-field" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
            </div>
            <button className="btn-primary w-full" type="submit">Send reset link</button>
          </form>
        )}
      </div>
    </div>
  )
}

export default ForgotPassword

