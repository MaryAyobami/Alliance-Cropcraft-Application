"use client"

import { useState } from 'react'
import { authAPI } from '../services/api'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await authAPI.forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to send reset email')
    }
  }

  return (
    <div className="max-w-md mx-auto card">
      <h2 className="text-xl font-semibold mb-2">Forgot Password</h2>
      {sent ? (
        <p>Check your email for a password reset link.</p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <input className="input-field" type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button className="btn-primary w-full" type="submit">Send reset link</button>
        </form>
      )}
    </div>
  )
}

export default ForgotPassword