import { useState, useEffect, useRef } from 'react'
import { useSubscription } from '../SubscriptionContext'
import { useSettings } from '../SettingsContext'
import { cities } from '../cities'
import { trackEvent } from '../analytics'

const SubscribeSheet = ({ open, onClose }) => {
  const sheetRef = useRef(null)
  const { subscription, subscribe, update, unsubscribe } = useSubscription()
  const { settings } = useSettings()

  // ── Subscribe form state ──
  const [name, setName]   = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // ── Subscribe city picker ──
  const [subCity, setSubCity] = useState(settings.city)
  const [subLat, setSubLat]   = useState(settings.lat)
  const [subLon, setSubLon]   = useState(settings.lon)
  const [citySearch, setCitySearch]       = useState('')
  const [showCityList, setShowCityList]   = useState(false)

  // ── Edit mode state ──
  const [isEditing, setIsEditing]   = useState(false)
  const [editName, setEditName]     = useState('')
  const [editEmail, setEditEmail]   = useState('')
  const [editError, setEditError]   = useState('')
  const [editSaved, setEditSaved]   = useState(false)

  // ── Edit city picker ──
  const [editCity, setEditCity]           = useState('')
  const [editLat, setEditLat]             = useState(0)
  const [editLon, setEditLon]             = useState(0)
  const [editCitySearch, setEditCitySearch]     = useState('')
  const [showEditCityList, setShowEditCityList] = useState(false)

  // ── Unsubscribe confirmation ──
  const [confirmUnsub, setConfirmUnsub] = useState(false)

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Focus first interactive element when sheet opens
  useEffect(() => {
    if (open && sheetRef.current) {
      const first = sheetRef.current.querySelector('button, [href], input, [tabindex]')
      first?.focus()
    }
  }, [open])

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
        setCitySearch('')
        setShowCityList(false)
        setEditCitySearch('')
        setShowEditCityList(false)
      }, 320)
      return () => clearTimeout(t)
    } else {
      // Reset subscribe city to current settings city each time sheet opens
      setSubCity(settings.city)
      setSubLat(settings.lat)
      setSubLon(settings.lon)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── City filter helpers ──
  const filteredCities = cities.filter(c =>
    c.name.toLowerCase().includes(citySearch.toLowerCase()) ||
    c.state.toLowerCase().includes(citySearch.toLowerCase())
  )
  const filteredEditCities = cities.filter(c =>
    c.name.toLowerCase().includes(editCitySearch.toLowerCase()) ||
    c.state.toLowerCase().includes(editCitySearch.toLowerCase())
  )

  // ── Validation ──
  const validate = (eml) => {
    if (!eml) return 'Please enter your email address.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eml)) return 'Enter a valid email address.'
    return ''
  }

  // ── Handlers ──
  const handleSubscribe = async () => {
    const err = validate(email)
    if (err) { setError(err); return }
    try {
      await subscribe(
        name.trim(),
        email.trim(),
        subCity,
        subLat,
        subLon,
        settings.calendarSystem
      )
      trackEvent('subscribe', { city: subCity })
      setSuccess(true)
      setTimeout(() => onClose(), 2200)
    } catch (e) {
      setError('Could not save your subscription: ' + (e?.message || 'unknown error'))
    }
  }

  const startEdit = () => {
    setEditName(subscription?.name  || '')
    setEditEmail(subscription?.email || '')
    setEditCity(subscription?.city  || settings.city)
    setEditLat(subscription?.lat    || settings.lat)
    setEditLon(subscription?.lon    || settings.lon)
    setEditCitySearch('')
    setEditError('')
    setEditSaved(false)
    setIsEditing(true)
  }

  const handleSaveEdit = () => {
    const err = validate(editEmail)
    if (err) { setEditError(err); return }
    update(editName.trim(), editEmail.trim(), editCity, editLat, editLon, subscription?.emailFrequency || 'all')
    setIsEditing(false)
    setEditSaved(true)
  }

  const handleUnsubscribe = () => {
    trackEvent('unsubscribe')
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
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="subscribe-sheet-title"
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
              <h2 id="subscribe-sheet-title" className="text-white text-xl font-bold mb-1">Get Festival Updates</h2>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                Sign up to receive festival guides, stories, puja timings and moonrise times
                personalised for your city — coming soon to your inbox.
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
                    className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 focus:border-[#8EA8FF] focus-visible:ring-2 focus-visible:ring-[#8EA8FF]/40 focus:outline-none placeholder-gray-500"
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
                    className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 focus:border-[#8EA8FF] focus-visible:ring-2 focus-visible:ring-[#8EA8FF]/40 focus:outline-none placeholder-gray-500"
                  />
                </div>

                {/* City picker */}
                <div>
                  <label className="text-gray-400 text-xs mb-1.5 block">City</label>
                  <input
                    type="text"
                    placeholder={`📍 ${subCity} — tap to change`}
                    value={citySearch}
                    onChange={e => { setCitySearch(e.target.value); setShowCityList(true) }}
                    onFocus={() => setShowCityList(true)}
                    className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 focus:border-[#8EA8FF] focus-visible:ring-2 focus-visible:ring-[#8EA8FF]/40 focus:outline-none placeholder-gray-400"
                  />
                  {showCityList && citySearch.length > 0 && (
                    <div className="mt-1 bg-gray-800 rounded-xl border border-gray-700 max-h-40 overflow-y-auto">
                      {filteredCities.length > 0 ? filteredCities.map((city, i) => (
                        <button
                          key={i}
                          onMouseDown={() => {
                            setSubCity(city.name); setSubLat(city.lat); setSubLon(city.lon)
                            setCitySearch(''); setShowCityList(false)
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-gray-700 transition-all border-b border-gray-700 last:border-0"
                        >
                          <p className="text-white text-sm font-medium">{city.name}</p>
                          <p className="text-gray-400 text-xs">{city.state}</p>
                        </button>
                      )) : (
                        <p className="text-gray-500 text-sm px-4 py-3">No cities found</p>
                      )}
                    </div>
                  )}
                </div>

                {error && (
                  <p className="text-red-400 text-sm">{error}</p>
                )}

                <p className="text-gray-600 text-xs text-center leading-relaxed">
                  We never share your details. Unsubscribe anytime.
                </p>

                <button
                  onClick={handleSubscribe}
                  className="w-full bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-bold py-4 rounded-2xl transition-all text-sm"
                >
                  Subscribe
                </button>

                <p className="text-gray-600 text-xs text-center -mt-2">
                  Want push notifications instead? Enable them in{' '}
                  <span className="text-yellow-600">Settings → Push Notifications</span>
                </p>
              </div>
            </>
          )}

          {/* ══════════════════════════════
              SUCCESS STATE
          ══════════════════════════════ */}
          {success && (
            <div className="py-12 text-center">
              <p className="text-5xl mb-4">🎉</p>
              <p className="text-white text-xl font-bold mb-2">You're on the list!</p>
              <p className="text-gray-400 text-sm leading-relaxed">
                We'll send festival guides and personalised timings for {subCity} when email updates launch.
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
                  <DetailRow label="Email" value={subscription.email} />
                  <DetailRow label="City" value={subscription.city} />
                  <DetailRow
                    label="Frequency"
                    value={
                      subscription.emailFrequency === 'major' ? 'Major festivals only' :
                      subscription.emailFrequency === 'monthly' ? 'Monthly digest' :
                      'All festivals'
                    }
                  />
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
                      className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 focus:border-[#8EA8FF] focus-visible:ring-2 focus-visible:ring-[#8EA8FF]/40 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1.5 block">Email</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={e => setEditEmail(e.target.value)}
                      className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 focus:border-[#8EA8FF] focus-visible:ring-2 focus-visible:ring-[#8EA8FF]/40 focus:outline-none"
                    />
                  </div>
                  {/* Edit city picker */}
                  <div>
                    <label className="text-gray-400 text-xs mb-1.5 block">City</label>
                    <input
                      type="text"
                      placeholder={`📍 ${editCity} — tap to change`}
                      value={editCitySearch}
                      onChange={e => { setEditCitySearch(e.target.value); setShowEditCityList(true) }}
                      onFocus={() => setShowEditCityList(true)}
                      className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 focus:border-[#8EA8FF] focus-visible:ring-2 focus-visible:ring-[#8EA8FF]/40 focus:outline-none placeholder-gray-400"
                    />
                    {showEditCityList && editCitySearch.length > 0 && (
                      <div className="mt-1 bg-gray-800 rounded-xl border border-gray-700 max-h-40 overflow-y-auto">
                        {filteredEditCities.length > 0 ? filteredEditCities.map((city, i) => (
                          <button
                            key={i}
                            onMouseDown={() => {
                              setEditCity(city.name); setEditLat(city.lat); setEditLon(city.lon)
                              setEditCitySearch(''); setShowEditCityList(false)
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-700 transition-all border-b border-gray-700 last:border-0"
                          >
                            <p className="text-white text-sm font-medium">{city.name}</p>
                            <p className="text-gray-400 text-xs">{city.state}</p>
                          </button>
                        )) : (
                          <p className="text-gray-500 text-sm px-4 py-3">No cities found</p>
                        )}
                      </div>
                    )}
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
                      You'll be removed from our festival updates list.
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
