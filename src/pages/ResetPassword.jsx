"use client"

import { useEffect, useState } from 'react'
import { authAPI } from '../services/api'

const ResetPassword = () => {
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setToken(params.get('token') || '')
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await authAPI.resetPassword({ token, password, confirm })
      setDone(true)
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to reset password')
    }
  }

  return (
    <div className="max-w-md mx-auto card">
      <h2 className="text-xl font-semibold mb-2">Reset Password</h2>
      {done ? (
        <p>Your password has been reset. You can now sign in.</p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <input className="input-field" type="password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <input className="input-field" type="password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button className="btn-primary w-full" type="submit">Reset password</button>
        </form>
      )}
    </div>
  )
}

export default ResetPassword