import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

const BottomSheet = ({
  open,
  onClose,
  title,
  labelledBy,
  children,
  triggerRef,
  className = '',
}) => {
  const sheetRef = useRef(null)
  const hasBeenOpen = useRef(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key !== 'Tab' || !sheetRef.current) return

      const focusable = [
        ...sheetRef.current.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ),
      ]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (open) {
      hasBeenOpen.current = true
      window.requestAnimationFrame(() => {
        const first = sheetRef.current?.querySelector('button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])')
        first?.focus()
      })
    } else if (hasBeenOpen.current) {
      triggerRef?.current?.focus()
    }
  }, [open, triggerRef])

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-chandra-bg-overlay transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={labelledBy ? undefined : title}
        aria-labelledby={labelledBy}
        aria-hidden={open ? undefined : 'true'}
        {...(!open && { inert: '' })}
        className={[
          'fixed bottom-0 left-0 right-0 z-50 max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-chandra-bg-surface shadow-[0_8px_24px_rgba(0,0,0,0.6)]',
          'transition-transform duration-300 ease-out',
          open ? 'translate-y-0' : 'translate-y-full',
          className,
        ].filter(Boolean).join(' ')}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between bg-chandra-bg-surface px-4 pb-2 pt-3">
          <div className="w-8" />
          <div className="h-1 w-10 rounded-full bg-chandra-text-disabled/60" aria-hidden="true" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-chandra-text-secondary transition-colors hover:bg-chandra-bg-elevated hover:text-chandra-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chandra-focus"
          >
            <X size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </>
  )
}

export default BottomSheet
