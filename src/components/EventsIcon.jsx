export default function EventsIcon({ size = 24, strokeWidth = 1.75, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M8 2v4m8-4v4M3 9h18M12 12l1 2.5 2.5 1-2.5 1L12 19l-1-2.5-2.5-1 2.5-1Z" />
    </svg>
  )
}
