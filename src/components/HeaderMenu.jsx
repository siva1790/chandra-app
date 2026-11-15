import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BookOpen, EllipsisVertical, ExternalLink, Info, ShieldCheck, X } from 'lucide-react'
import './HeaderMenu.css'

export default function HeaderMenu({ onLearn }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const wrapperRef = useRef(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const dialogRef = useRef(null)
  const focusEdge = useRef('first')
  const menuId = useId()
  const titleId = useId()
  const introId = useId()

  useEffect(() => {
    if (!menuOpen) return
    const items = menuRef.current.querySelectorAll('[role="menuitem"]')
    items[focusEdge.current === 'last' ? items.length - 1 : 0]?.focus()
    const outside = event => {
      if (!wrapperRef.current?.contains(event.target)) setMenuOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [menuOpen])

  useEffect(() => {
    if (!aboutOpen) return
    const dialog = dialogRef.current
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      if (dialog.open) dialog.close()
      document.body.style.overflow = previousOverflow
      triggerRef.current?.focus({ preventScroll: true })
    }
  }, [aboutOpen])

  const menuKeyDown = event => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setMenuOpen(false)
      triggerRef.current.focus()
    }
    if (event.key === 'Tab') setMenuOpen(false)
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const items = [...menuRef.current.querySelectorAll('[role="menuitem"]')]
    const index = items.indexOf(document.activeElement)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
    items[next]?.focus()
  }

  return <>
    <div className="chandra-header-menu" ref={wrapperRef} onBlur={event => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false)
    }}>
      <button
        ref={triggerRef}
        type="button"
        className="chandra-more-button"
        aria-label="More options"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls={menuOpen ? menuId : undefined}
        onClick={() => { focusEdge.current = 'first'; setMenuOpen(previous => !previous) }}
        onKeyDown={event => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            focusEdge.current = event.key === 'ArrowUp' ? 'last' : 'first'
            setMenuOpen(true)
          }
        }}
      >
        <EllipsisVertical size={22} strokeWidth={1.75} aria-hidden="true" />
      </button>
      {menuOpen && <div ref={menuRef} id={menuId} className="chandra-overflow-menu" role="menu" aria-label="More options" onKeyDown={menuKeyDown}>
        <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setAboutOpen(true) }}><Info size={18} strokeWidth={1.75} aria-hidden="true" />About Chandra</button>
        <a href="/privacy.html" role="menuitem" onClick={() => setMenuOpen(false)}><ShieldCheck size={18} strokeWidth={1.75} aria-hidden="true" />Privacy policy</a>
      </div>}
    </div>
    {aboutOpen && createPortal(
      <dialog
        ref={dialogRef}
        className="chandra-about-dialog"
        aria-labelledby={titleId}
        aria-describedby={introId}
        onClose={() => setAboutOpen(false)}
        onKeyDown={event => {
          if (event.key !== 'Tab') return
          const controls = [...event.currentTarget.querySelectorAll('button:not([disabled]), a[href]')]
          const first = controls[0], last = controls[controls.length - 1]
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
        }}
        onClick={event => {
          const bounds = event.currentTarget.getBoundingClientRect()
          if (event.target === event.currentTarget && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) event.currentTarget.close()
        }}
      >
        <div className="chandra-about-heading"><h2 id={titleId}>About Chandra</h2><button type="button" className="chandra-about-close" onClick={() => dialogRef.current.close()} aria-label="Close About Chandra"><X size={18} strokeWidth={1.75} aria-hidden="true" /></button></div>
        <div className="chandra-about-content">
          <div className="chandra-about-brand"><img src="/icons/chandra-mark-topbar-96.png" width="48" height="48" alt="" /><div><h3>Chandra</h3><p>Indian Moon Tracker</p></div></div>
          <p className="chandra-about-intro" id={introId}>Your daily Hindu almanac, moon timings and festival calendar, calculated for your city.</p>
          <dl className="chandra-about-facts">
            <div><dt>App</dt><dd>Chandra</dd></div>
            <div><dt>Version</dt><dd>1.0.0 MVP</dd></div>
            <div><dt>Data source</dt><dd>Astronomy Engine<small>Sun and Moon positions</small></dd></div>
            <div><dt>Calculations</dt><dd>On-device, no API<small>Based on your selected city and Panchang system</small></dd></div>
          </dl>
          <p className="chandra-about-calculations">Daily Pancha Anga uses your city’s local sunrise. Timings are shown in IST; sidereal positions use Lahiri ayanamsha.</p>
          <a className="chandra-about-learn" href="/learn/panchang-basics#pancha-anga" onClick={event => {
            if (onLearn) { event.preventDefault(); setAboutOpen(false); onLearn('pancha-anga') }
            else dialogRef.current.close()
          }}><BookOpen size={18} strokeWidth={1.75} aria-hidden="true" />Learn Panchang basics<ExternalLink size={16} strokeWidth={1.75} aria-hidden="true" /></a>
        </div>
      </dialog>, document.body
    )}
  </>
}
