import { useState, useEffect } from 'react'
import { WifiOff, Wifi } from 'lucide-react'

/**
 * OfflineBanner
 * Slides in below the fixed top bar (56px) when the device goes offline.
 * Shows a brief "Back online" confirmation for 3 s when reconnected.
 * Pass sheetOpen=true to suppress the banner while the subscribe sheet is open.
 */
const OfflineBanner = ({ sheetOpen = false }) => {
  const [online, setOnline] = useState(() => navigator.onLine)
  const [showBack, setShowBack] = useState(false)

  useEffect(() => {
    let backTimer = null

    const handleOffline = () => {
      setOnline(false)
      setShowBack(false)
      if (backTimer) clearTimeout(backTimer)
    }

    const handleOnline = () => {
      setOnline(true)
      setShowBack(true)
      backTimer = setTimeout(() => setShowBack(false), 3000)
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
      if (backTimer) clearTimeout(backTimer)
    }
  }, [])

  // Banner is visible when offline, or briefly after coming back online
  const visible = !online || showBack

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-hidden={sheetOpen || !visible || undefined}
      {...(sheetOpen || !visible ? { inert: '' } : {})}
      style={{
        position: 'fixed',
        top: '56px',          /* sits flush under the 56 px top bar */
        left: 0,
        right: 0,
        zIndex: 39,           /* under the top bar (z-40) */
        transform: visible ? 'translateY(0)' : 'translateY(-110%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: visible ? 'auto' : 'none',
      }}
      className={
        online
          ? 'flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium bg-green-950 text-green-300 border-b border-green-900'
          : 'flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium bg-gray-800 text-gray-300 border-b border-gray-700'
      }
    >
      {online ? (
        <>
          <Wifi size={12} aria-hidden="true" />
          Back online
        </>
      ) : (
        <>
          <WifiOff size={12} aria-hidden="true" />
          You're offline — all moon &amp; Panchang calculations work without internet
        </>
      )}
    </div>
  )
}

export default OfflineBanner
