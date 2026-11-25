import { useId, useLayoutEffect, useRef, useState } from 'react'
import { Ellipsis } from 'lucide-react'

function fitTwoRows(widths, available, gap, moreWidth) {
  let rowWidth = 0
  let secondRowStart = null
  let count = 0

  for (const width of widths) {
    const chip = Math.min(width, available)
    const nextWidth = rowWidth ? rowWidth + gap + chip : chip
    if (nextWidth <= available) {
      rowWidth = nextWidth
    } else {
      if (secondRowStart !== null) break
      secondRowStart = count
      rowWidth = chip
    }
    count += 1
  }

  if (count === widths.length) return count

  // Make room for the disclosure at the end of the second row.
  while (count > secondRowStart && rowWidth + gap + moreWidth > available) {
    count -= 1
    rowWidth -= Math.min(widths[count], available) + gap
  }
  return count
}

export default function EventFilters({ filters, priorityCount, filter, onChange }) {
  const groupRef = useRef(null)
  const rulerRef = useRef(null)
  const moreRef = useRef(null)
  const extraId = useId()
  const [fittingCount, setFittingCount] = useState(filters.length)
  const [expanded, setExpanded] = useState(false)

  useLayoutEffect(() => {
    const group = groupRef.current
    const ruler = rulerRef.current
    const measure = () => {
      const available = group.getBoundingClientRect().width
      if (!available) return
      const widths = Array.from(ruler.children, chip => chip.getBoundingClientRect().width)
      const moreWidth = widths.pop()
      const gap = Number.parseFloat(getComputedStyle(group).columnGap)
      setFittingCount(fitTwoRows(widths, available, gap, moreWidth))
    }
    const observer = new ResizeObserver(measure)
    observer.observe(group)
    observer.observe(ruler)
    measure()
    return () => observer.disconnect()
  }, [filters])

  const visibleCount = Math.max(priorityCount, fittingCount)
  const remaining = filters.slice(visibleCount)
  const extraSelection = remaining.find(([id]) => id === filter)?.[1]
  const moreLabel = expanded ? 'Show fewer filters' : 'More filters'
  const renderFilter = ([id, label]) => (
    <button key={id} type="button" className="events-filter-chip" aria-pressed={filter === id}
      onClick={() => onChange(id)}>{label}</button>
  )

  const handleKeyDown = event => {
    if (event.key !== 'Escape' || !expanded || !moreRef.current?.getClientRects().length) return
    event.preventDefault()
    setExpanded(false)
    moreRef.current.focus()
  }

  return (
    <div ref={groupRef} className="events-filters" data-wrap-priority={fittingCount < priorityCount || undefined}
      role="group" aria-label="Filter events" onKeyDown={handleKeyDown}>
      {filters.slice(0, visibleCount).map(renderFilter)}
      {remaining.length > 0 && (
        <>
          <button ref={moreRef} type="button" className="events-filter-chip events-filter-more"
            aria-expanded={expanded} aria-controls={extraId}
            aria-label={!expanded && extraSelection ? `${moreLabel}, ${extraSelection} selected` : moreLabel}
            data-active={!expanded && Boolean(extraSelection) || undefined}
            onClick={() => setExpanded(open => !open)}>
            <Ellipsis size={20} aria-hidden="true" />
          </button>
          <div id={extraId} className="events-filter-extra" data-expanded={expanded || undefined}>
            {remaining.map(renderFilter)}
          </div>
        </>
      )}
      <div className="events-filter-measure" aria-hidden="true">
        <div ref={rulerRef} className="events-filter-ruler">
          {filters.map(([id, label]) => <span key={id} className="events-filter-chip">{label}</span>)}
          <span className="events-filter-chip events-filter-more"><Ellipsis size={20} /></span>
        </div>
      </div>
    </div>
  )
}
