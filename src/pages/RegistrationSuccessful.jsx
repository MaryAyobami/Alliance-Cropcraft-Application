"use client"

import { Link } from "react-router-dom"
import { CheckCircle, Mail, ArrowLeft } from "lucide-react"

const RegistrationSuccessful = () => {
  return (
    <div className="min-h-screen bg-primary-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-farm-50 space-y-8">
        <div className="card-enhanced text-center">
          <div className="w-16 h-16 bg-farm-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Registration Successful!</h2>
          {/* <p className="text-gray-600 mb-6">
            Your registration has been submitted successfully.<br />
            Please check your email for further instructions.
          </p> */}
          <div className="rounded-2xl overflow-hidden shadow-lg mb-8 mt-8">
            <div className="bg-gradient-to-r from-green-600 to-green-400 flex items-center px-4 py-3">
              <Mail className="w-6 h-6 text-white mr-3" />
              <span className="text-white font-semibold text-base">What happens next?</span>
            </div>
            <div className="bg-green-50 px-6 py-5">
              <ul className="space-y-2 text-green-800 text-sm list-disc list-inside pl-2">
                <li><span className="font-medium">Your account will be reviewed and approved by our team</span></li>
                <li><span className="font-medium">You'll receive an email notification once approved</span></li>
                <li><span className="font-medium">After approval, you can login and access the app</span></li>
              </ul>
            </div>
          </div>
          {/* <p className="text-sm text-gray-500 mb-6">
            Didn’t get an email? Check your spam folder or contact support.
          </p> */}
          <Link
            to="/login"
            className="btn-primary w-full flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Login</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default RegistrationSuccessful