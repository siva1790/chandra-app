/**
 * TodayMessageModal
 * Bottom-sheet reading experience for "View today's message".
 *
 * Shows: vara, formatted date, tithi, paksha, illumination %, daily message.
 * Shows a single Share action using the native share sheet.
 * Closeable via X button or overlay tap.
 */

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { generateShareCard } from '../shareCard'

const TodayMessageModal = ({
  isOpen,
  onClose,
  // Content props
  vara,
  dateLabel,       // e.g. "Thursday, 14 May 2026"
  tithiName,
  paksha,
  illuminationPct,
  message,
  // For card generation
  phase,
}) => {
  const closeRef = useRef(null)
  const [sharing, setSharing] = useState(false)

  // Focus close button when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => closeRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Trap Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  // Build the card blob then trigger share
  const buildAndShare = async () => {
    setSharing(true)
    try {
      const blob = await generateShareCard({
        phase,
        vara,
        dateLabel,
        tithiName,
        paksha,
        illuminationPct,
        message,
      })
      const file = new File([blob], 'chandra-today.png', { type: 'image/png' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'My moon today — Chandra' })
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'chandra-today.png'
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      if (err.name !== 'AbortError') console.error('Share failed:', err)
    } finally {
      setSharing(false)
    }
  }

  const handleShare = async () => {
    await buildAndShare()
  }

  if (!isOpen) return null

  const pakshaDisplay = paksha === 'Shukla'
    ? 'Shukla Paksha · Waxing'
    : paksha === 'Krishna'
    ? 'Krishna Paksha · Waning'
    : ''

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Today's message"
        className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto"
      >
        <div className="bg-[#0f1526] rounded-t-2xl px-5 pt-4 pb-8 border-t border-gray-800">

          {/* Drag handle + close */}
          <div className="flex items-center justify-between mb-4">
            <div className="w-8 h-1 bg-gray-700 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-3" />
            <div className="flex-1" />
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded-full hover:bg-gray-800 transition-colors text-gray-500 hover:text-gray-300"
            >
              <X size={18} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>

          {/* Vara + date */}
          <p className="text-center text-xs tracking-widest text-gray-500 uppercase mb-4">
            {vara} · {dateLabel}
          </p>

          {/* Tithi + illumination row */}
          <div
            className="flex items-center gap-3 mb-4 px-3 py-3 rounded-xl"
            style={{ background: '#141829' }}
          >
            {/* Moon phase dot */}
            <div
              className="w-9 h-9 rounded-full flex-shrink-0"
              style={{ background: 'radial-gradient(circle at 38% 36%, #f0ead0 0%, #c8b87a 55%, #5a4e20 100%)' }}
              aria-hidden="true"
            />
            <div>
              <p className="text-white text-sm font-medium leading-tight">{tithiName}</p>
              {pakshaDisplay && (
                <p className="text-xs mt-0.5" style={{ color: '#DDBB6A' }}>{pakshaDisplay}</p>
              )}
            </div>
            <p className="ml-auto text-xs text-gray-500">{Number(illuminationPct).toFixed(0)}% lit</p>
          </div>

          {/* Message */}
          <div
            className="rounded-xl px-4 py-3 mb-5"
            style={{
              background: '#0B1020',
              borderLeft: '2px solid #DDBB6A',
            }}
          >
            <p className="text-sm leading-relaxed italic" style={{ color: '#B5BDD1' }}>
              "{message}"
            </p>
          </div>


          {/* Action button */}
          <div className="flex justify-center">

            <button
              onClick={handleShare}
              disabled={sharing}
              aria-label="Share via other apps"
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-opacity disabled:opacity-50"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#B5BDD1',
              }}
            >
              {/* Share icon */}
              <svg
                width="14" height="14" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="1.75"
                strokeLinecap="round" strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16 6 12 2 8 6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
              <span className="text-xs">Share</span>
            </button>

          </div>

        </div>
      </div>
    </>
  )
}

export default TodayMessageModal
