import { useState, useEffect } from 'react'
import { useSubscription } from '../SubscriptionContext'
import { useSettings } from '../SettingsContext'

const SubscribeSheet = ({ open, onClose }) => {
  const { subscription, subscribe, update, unsubscribe } = useSubscription()
  const { settings } = useSettings()

  // ── Subscribe form state ──
  const [name, setName]     = useState('')
  const [mobile, setMobile] = useState('')
  const [email, setEmail]   = useState('')
  const [error, setError]   = useState('')
  const [success, setSuccess] = useState(false)

  // ── Edit mode state ──
  const [isEditing, setIsEditing]     = useState(false)
  const [editName, setEditName]       = useState('')
  const [editMobile, setEditMobile]   = useState('')
  const [editEmail, setEditEmail]     = useState('')
  const [editError, setEditError]     = useState('')
  const [editSaved, setEditSaved]     = useState(false)

  // ── Unsubscribe confirmation ──
  const [confirmUnsub, setConfirmUnsub] = useState(false)

  // Reset transient UI state each time the sheet closes
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setError('')
        setSuccess(false)
        setIsEditing(false)
        setConfirmUnsub(false)
        setEditError('')
        setEditSaved(false)
      }, 320)
      return () => clearTimeout(t)
    }
  }, [open])

  // ── Validation ──
  const validate = (mob, eml) => {
    if (!mob && !eml) return 'Please enter a mobile number or email address.'
    if (mob && !/^[0-9]{10}$/.test(mob)) return 'Enter a valid 10-digit mobile number.'
    if (eml && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eml)) return 'Enter a valid email address.'
    return ''
  }

  // ── Handlers ──
  const handleSubscribe = () => {
    const err = validate(mobile, email)
    if (err) { setError(err); return }
    subscribe(name.trim(), mobile.trim(), email.trim(), settings.city)
    setSuccess(true)
    setTimeout(() => {
      onClose()
    }, 2200)
  }

  const startEdit = () => {
    setEditName(subscription?.name   || '')
    setEditMobile(subscription?.mobile || '')
    setEditEmail(subscription?.email  || '')
    setEditError('')
    setEditSaved(false)
    setIsEditing(true)
  }

  const handleSaveEdit = () => {
    const err = validate(editMobile, editEmail)
    if (err) { setEditError(err); return }
    update(editName.trim(), editMobile.trim(), editEmail.trim(), settings.city)
    setIsEditing(false)
    setEditSaved(true)
  }

  const handleUnsubscribe = () => {
    unsubscribe()
    setConfirmUnsub(false)
    onClose()
  }

  const fmt = (iso) =>
    new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
    })

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black z-40 transition-opacity duration-300 ${
          open ? 'opacity-60 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* ── Bottom sheet ── */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-gray-950 rounded-t-3xl border-t border-gray-800
          transition-transform duration-300 ease-out ${open ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-700 rounded-full" />
        </div>

        <div className="px-6 pb-12 pt-3 max-h-[88vh] overflow-y-auto">

          {/* ══════════════════════════════
              SUBSCRIBE VIEW (not yet subscribed)
          ══════════════════════════════ */}
          {!subscription && !success && (
            <>
              <h2 className="text-white text-xl font-bold mb-1">🔔 Get Festival Alerts</h2>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                Subscribe to receive upcoming festival reminders and early access to new features.
              </p>

              <div className="flex flex-col gap-4">

                {/* Name */}
                <div>
                  <label className="text-gray-400 text-xs mb-1.5 block">
                    Name <span className="text-gray-600">— optional</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 focus:border-yellow-600 focus:outline-none placeholder-gray-500"
                  />
                </div>

                {/* Mobile */}
                <div>
                  <label className="text-gray-400 text-xs mb-1.5 block">Mobile number</label>
                  <input
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={mobile}
                    onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 focus:border-yellow-600 focus:outline-none placeholder-gray-500"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="text-gray-400 text-xs mb-1.5 block">Email address</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 focus:border-yellow-600 focus:outline-none placeholder-gray-500"
                  />
                </div>

                {/* City (read-only from Settings) */}
                <div className="bg-gray-900 rounded-xl px-4 py-3 flex items-center gap-3 border border-gray-800">
                  <span>📍</span>
                  <div>
                    <p className="text-gray-500 text-xs">City — from your Settings</p>
                    <p className="text-white text-sm font-medium">{settings.city}</p>
                  </div>
                </div>

                {error && (
                  <p className="text-red-400 text-sm">{error}</p>
                )}

                <p className="text-gray-600 text-xs text-center leading-relaxed">
                  Enter at least a mobile number or email. We never share your details.
                </p>

                <button
                  onClick={handleSubscribe}
                  className="w-full bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-bold py-4 rounded-2xl transition-all text-sm"
                >
                  Subscribe
                </button>
              </div>
            </>
          )}

          {/* ══════════════════════════════
              SUCCESS STATE
          ══════════════════════════════ */}
          {success && (
            <div className="py-12 text-center">
              <p className="text-5xl mb-4">🎉</p>
              <p className="text-white text-xl font-bold mb-2">You're subscribed!</p>
              <p className="text-gray-400 text-sm leading-relaxed">
                We'll send you festival reminders and feature updates.
              </p>
            </div>
          )}

          {/* ══════════════════════════════
              DETAILS VIEW (already subscribed)
          ══════════════════════════════ */}
          {subscription && !success && (
            <>
              {/* Header */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-white text-xl font-bold">Your Subscription</h2>
                  <p className="text-green-400 text-xs mt-1">
                    ✓ Active since {fmt(subscription.subscribedAt)}
                  </p>
                </div>
                {!isEditing && !confirmUnsub && (
                  <button
                    onClick={startEdit}
                    className="text-yellow-400 text-sm font-medium px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all"
                  >
                    Edit
                  </button>
                )}
              </div>

              {editSaved && !isEditing && (
                <p className="text-green-400 text-sm mb-4">✓ Details updated</p>
              )}

              {/* ── Read-only details ── */}
              {!isEditing && (
                <div className="flex flex-col mb-6 bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                  {subscription.name && (
                    <DetailRow label="Name" value={subscription.name} />
                  )}
                  {subscription.mobile && (
                    <DetailRow label="Mobile" value={subscription.mobile} />
                  )}
                  {subscription.email && (
                    <DetailRow label="Email" value={subscription.email} />
                  )}
                  <DetailRow label="City" value={subscription.city} />
                </div>
              )}

              {/* ── Edit form ── */}
              {isEditing && (
                <div className="flex flex-col gap-4 mb-6">
                  <div>
                    <label className="text-gray-400 text-xs mb-1.5 block">Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 focus:border-yellow-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1.5 block">Mobile</label>
                    <input
                      type="tel"
                      value={editMobile}
                      onChange={e => setEditMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 focus:border-yellow-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1.5 block">Email</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={e => setEditEmail(e.target.value)}
                      className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 focus:border-yellow-600 focus:outline-none"
                    />
                  </div>
                  {editError && <p className="text-red-400 text-sm">{editError}</p>}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-300 text-sm hover:bg-gray-800 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="flex-1 py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-bold text-sm transition-all"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}

              {/* ── Unsubscribe ── */}
              {!isEditing && (
                !confirmUnsub ? (
                  <button
                    onClick={() => setConfirmUnsub(true)}
                    className="w-full py-3 rounded-xl border border-red-900 text-red-400 text-sm hover:bg-red-950 transition-all"
                  >
                    Unsubscribe
                  </button>
                ) : (
                  <div className="bg-red-950 border border-red-800 rounded-2xl p-5">
                    <p className="text-red-300 text-sm font-semibold mb-1">
                      Remove your subscription?
                    </p>
                    <p className="text-red-400 text-xs mb-5 leading-relaxed">
                      You'll stop receiving festival alerts. We'll process the removal within 24 hours.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setConfirmUnsub(false)}
                        className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-300 text-sm hover:bg-gray-800 transition-all"
                      >
                        Keep it
                      </button>
                      <button
                        onClick={handleUnsubscribe}
                        className="flex-1 py-3 rounded-xl bg-red-700 hover:bg-red-600 text-white font-bold text-sm transition-all"
                      >
                        Yes, remove me
                      </button>
                    </div>
                  </div>
                )
              )}
            </>
          )}

        </div>
      </div>
    </>
  )
}

const DetailRow = ({ label, value }) => (
  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 last:border-0">
    <span className="text-gray-500 text-sm">{label}</span>
    <span className="text-white text-sm font-medium">{value}</span>
  </div>
)

export default SubscribeSheet
