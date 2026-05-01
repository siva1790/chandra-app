import { useState, useEffect } from 'react'

const InstallPrompt = () => {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showBanner, setShowBanner] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
      return
    }

    const handler = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
      setShowBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => {
      setInstalled(true)
      setShowBanner(false)
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const result = await installPrompt.userChoice
    if (result.outcome === 'accepted') {
      setShowBanner(false)
      setInstalled(true)
    }
  }

  if (installed || !showBanner) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-4">
      <div className="bg-gray-900 border border-yellow-800 rounded-2xl p-4 flex items-center gap-3 shadow-xl">
        <span className="text-3xl">🌙</span>
        <div className="flex-1">
          <p className="text-white text-sm font-semibold">Install Chandra</p>
          <p className="text-gray-400 text-xs">Add to home screen for quick access</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBanner(false)}
            className="text-gray-500 text-xs px-2 py-1"
          >
            Later
          </button>
          <button
            onClick={handleInstall}
            className="bg-yellow-500 text-gray-900 text-xs font-bold px-3 py-1 rounded-lg"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  )
}

export default InstallPrompt