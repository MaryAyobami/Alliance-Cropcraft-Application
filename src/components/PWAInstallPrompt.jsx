import React, { useState, useEffect } from 'react'
import { Download } from 'lucide-react'

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstall, setShowInstall] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if app is already installed
    const checkInstalled = () => {
      // Check if running in standalone mode (installed PWA)
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true)
        return
      }
      
      // Check if running as PWA on iOS
      if (window.navigator.standalone === true) {
        setIsInstalled(true)
        return
      }
    }

    checkInstalled()

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault()
      
      // Stash the event so it can be triggered later
      setDeferredPrompt(e)
      setShowInstall(true)
    }

    // Listen for app installed event
    const handleAppInstalled = (evt) => {
      setShowInstall(false)
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt()
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice
      
      // Clear the deferredPrompt
      setDeferredPrompt(null)
      setShowInstall(false)
    }
  }

  // Don't show button if already installed or prompt not available
  if (isInstalled || !showInstall) return null

  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 z-50 max-w-sm animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 p-2 bg-primary-100 rounded-lg">
          <Download className="w-5 h-5 text-primary-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 mb-3">
            Install the Livestock Management App for a better experience!
          </p>
          <div className="flex space-x-2">
            <button 
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
              onClick={handleInstall}
            >
              Install
            </button>
            <button 
              className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors duration-200"
              onClick={() => setShowInstall(false)}
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PWAInstallPrompt