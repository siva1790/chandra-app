const Input = ({
  id,
  label,
  className = '',
  labelClassName = '',
  hideLabel = false,
  ...props
}) => (
  <div>
    {label && (
      <label
        htmlFor={id}
        className={[
          hideLabel ? 'sr-only' : 'mb-2 block text-sm font-medium text-chandra-text-secondary',
          labelClassName,
        ].filter(Boolean).join(' ')}
      >
        {label}
      </label>
    )}
    <input
      id={id}
      className={[
        'min-h-[44px] w-full rounded-xl border border-white/10 bg-chandra-bg-elevated px-4 py-3 text-sm text-chandra-text-primary placeholder:text-chandra-text-disabled',
        'focus:border-chandra-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-chandra-focus/40',
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    />
  </div>
)

export default Input
