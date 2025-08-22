import React, { useEffect, useState } from "react"

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    })
  }, [])

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      deferredPrompt.userChoice.then(() => {
        setShowPrompt(false)
        setDeferredPrompt(null)
      })
    }
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 z-50">
      <p>Install the Alliance CropCraft App for a better experience!</p>
      <button className="btn-primary mt-2" onClick={handleInstallClick}>
        Install
      </button>
      <button className="ml-2 text-gray-500" onClick={() => setShowPrompt(false)}>
        Maybe later
      </button>
    </div>
  )
}

export default PWAInstallPrompt