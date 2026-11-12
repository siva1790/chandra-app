// Compatibility exports for the original Bengaluru pilot.
export * from './cityPanchang.js'
import { getCityPanchang } from './cityPanchang.js'
export const BENGALURU = Object.freeze({ city: 'Bengaluru', lat: 12.9716, lon: 77.5946 })
export const BENGALURU_PATH = '/panchang/bengaluru'
export const getBengaluruPanchang = (dateKey) => getCityPanchang('bengaluru', dateKey)
