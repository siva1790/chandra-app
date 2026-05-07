/**
 * analytics.js — thin wrapper around GA4 gtag for Chandra.
 *
 * All calls are silent no-ops if gtag hasn't loaded (e.g. ad blockers),
 * so nothing in the app will break if analytics is unavailable.
 *
 * Events tracked:
 *   page_view          — tab switch (Today / Calendar / Panchang / Settings)
 *   subscribe          — user completes email sign-up  { city }
 *   unsubscribe        — user removes their subscription
 *   notification_enabled  — push permission granted    { city }
 *   notification_disabled — master push toggle off
 *   city_changed       — user picks a city in Settings { city_name }
 */

const g = (...args) => {
  if (typeof window.gtag === 'function') window.gtag(...args)
}

/**
 * Track a tab / screen view.
 * @param {string} pageTitle  e.g. 'Today', 'Calendar', 'Panchang', 'Settings'
 */
export const trackPageView = (pageTitle) => {
  g('event', 'page_view', {
    page_title:    pageTitle,
    page_location: window.location.href,
  })
}

/**
 * Track a custom event.
 * @param {string} eventName  GA4 event name (snake_case)
 * @param {object} params     Optional key/value parameters
 */
export const trackEvent = (eventName, params = {}) => {
  g('event', eventName, params)
}
