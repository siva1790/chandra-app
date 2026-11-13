import { PUBLIC_PANCHANG_CITIES } from '../publicPanchangCities.js'

export default function CityPageLinks({ currentSlug }) {
  return <nav aria-label="City Panchang pages" className="rounded-card border border-white/10 bg-chandra-bg-surface p-4">
    <p className="text-xs font-semibold uppercase tracking-widest text-chandra-gold">Panchang by city</p>
    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0">
      {PUBLIC_PANCHANG_CITIES.map(city => <a key={city.slug} href={city.path} aria-current={city.slug === currentSlug ? 'page' : undefined} className={`flex min-h-[44px] items-center text-sm ${city.slug === currentSlug ? 'font-semibold text-chandra-gold' : 'text-chandra-focus'}`}>{city.name}</a>)}
    </div>
  </nav>
}
