"use client"

import { useEffect, useState } from 'react'
import { authAPI } from '../services/api'

const VerifyEmail = () => {
  const [status, setStatus] = useState('pending')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (token) {
      authAPI.verifyEmail(token)
        .then(() => {
          setStatus('success')
          // Update local user
          try {
            const u = JSON.parse(localStorage.getItem('user') || '{}')
            u.email_verified = true
            localStorage.setItem('user', JSON.stringify(u))
          } catch {}
        })
        .catch((err) => {
          setStatus('error')
          setMessage(err?.response?.data?.message || 'Verification failed')
        })
    } else {
      setStatus('waiting')
    }
  }, [])

  const resend = async () => {
    try {
      await authAPI.requestVerification()
      setMessage('Verification email sent')
    } catch {
      setMessage('Failed to send verification email')
    }
  }

  return (
    <div className="max-w-lg mx-auto card">
      <h2 className="text-xl font-semibold mb-2">Verify your email</h2>
      {status === 'pending' && <p>Verifying your email...</p>}
      {status === 'success' && <p className="text-green-700">Your email has been verified. You can now access all features.</p>}
      {status === 'error' && <p className="text-red-700">{message}</p>}
      {status === 'waiting' && <p>Please check your inbox for a verification link.</p>}
      <div className="mt-4 flex gap-2">
        <button className="btn-primary" onClick={resend}>Resend verification email</button>
      </div>
    </div>
  )
}

export default VerifyEmail