import { cities } from './cities.js'

// Explicit rollout list. Other app cities remain available in Settings.
export const PUBLIC_PANCHANG_CITIES = [
  ['bengaluru', 'Bengaluru', 'Bengaluru (Bangalore)'],
  ['chennai', 'Chennai'],
  ['pune', 'Pune'],
  ['hyderabad', 'Hyderabad'],
  ['bhopal', 'Bhopal'],
].map(([slug, name, displayName = name]) => {
  const city = cities.find(value => value.name === name)
  if (!city) throw new Error(`Missing app coordinates for ${name}`)
  return Object.freeze({ ...city, slug, displayName, path: `/panchang/${slug}` })
})

export const getPublicPanchangCity = slug => PUBLIC_PANCHANG_CITIES.find(city => city.slug === slug)
export const getPublicPanchangCityFromPath = pathname =>
  PUBLIC_PANCHANG_CITIES.find(city => [city.path, `${city.path}/`, `${city.path}/index.html`].includes(pathname))
