import { cities } from './cities.js'

// GPS selects the nearest supported city; calculations use that city's coordinates.
export function getNearestCity(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error('Invalid location coordinates')
  const radians = value => value * Math.PI / 180
  const distance = city => {
    const a = Math.sin(radians(city.lat - latitude) / 2) ** 2 +
      Math.cos(radians(latitude)) * Math.cos(radians(city.lat)) * Math.sin(radians(city.lon - longitude) / 2) ** 2
    return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)))
  }
  return cities.reduce((nearest, city) => distance(city) < distance(nearest) ? city : nearest)
}
