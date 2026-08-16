/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const ProfileContext = createContext()

const PROFILE_KEY = 'chandra-profile'

const defaultProfile = {
  name: '',
  dob: '',
  birthTime: '',
  birthPlace: '',
  birthState: '',
  birthLat: null,
  birthLon: null,
  sameAsCurrentLocation: true,
}

const normalizeProfile = (profile = {}) => ({
  ...defaultProfile,
  ...profile,
  name: profile.name || '',
  dob: profile.dob || '',
  birthTime: profile.birthTime || '',
  birthPlace: profile.birthPlace || '',
  birthState: profile.birthState || '',
  birthLat: Number.isFinite(profile.birthLat) ? profile.birthLat : null,
  birthLon: Number.isFinite(profile.birthLon) ? profile.birthLon : null,
  sameAsCurrentLocation: profile.sameAsCurrentLocation !== false,
})

const isProfileComplete = (profile) => Boolean(
  profile?.dob &&
  profile?.birthTime &&
  profile?.birthPlace &&
  Number.isFinite(profile?.birthLat) &&
  Number.isFinite(profile?.birthLon)
)

export const useProfile = () => useContext(ProfileContext)

export const ProfileProvider = ({ children }) => {
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem(PROFILE_KEY)
      return saved ? normalizeProfile(JSON.parse(saved)) : defaultProfile
    } catch {
      return defaultProfile
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
    } catch {
      // Local storage may be unavailable in private browsing or restricted webviews.
    }
  }, [profile])

  const profileComplete = useMemo(() => isProfileComplete(profile), [profile])

  const saveProfile = (nextProfile) => {
    setProfile(normalizeProfile(nextProfile))
  }

  const updateProfile = (key, value) => {
    setProfile(prev => normalizeProfile({ ...prev, [key]: value }))
  }

  const clearProfile = () => {
    setProfile(defaultProfile)
  }

  return (
    <ProfileContext.Provider value={{ profile, profileComplete, saveProfile, updateProfile, clearProfile }}>
      {children}
    </ProfileContext.Provider>
  )
}
