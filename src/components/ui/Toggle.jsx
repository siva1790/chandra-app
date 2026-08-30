const Toggle = ({ on, onToggle, label, disabled = false, size = 'md' }) => {
  const compact = size === 'sm'
  const trackClass = compact ? 'h-5 w-9 rounded-[10px]' : 'h-[26px] w-11 rounded-[13px]'
  const knobClass = compact
    ? `h-4 w-4 ${on ? 'left-[15px]' : 'left-0.5'}`
    : `h-5 w-5 ${on ? 'left-[19px]' : 'left-[3px]'}`

  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      className={[
        'relative inline-flex shrink-0 items-center p-0 transition-colors',
        'border-[1.5px] border-white/15',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chandra-focus',
        'disabled:cursor-not-allowed disabled:opacity-45',
        on ? 'bg-chandra-gold' : 'bg-[#2A3050]',
        trackClass,
      ].join(' ')}
    >
      <span
        aria-hidden="true"
        className={[
          'absolute top-1/2 block -translate-y-1/2 rounded-full bg-chandra-text-primary shadow-[0_1px_4px_rgba(0,0,0,0.45)]',
          'transition-[left] duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
          knobClass,
        ].join(' ')}
      />
    </button>
  )
}

export default Toggle
