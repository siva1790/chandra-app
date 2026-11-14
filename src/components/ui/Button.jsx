const variants = {
  primary: 'bg-chandra-gold text-chandra-text-inverse hover:bg-chandra-gold-hover active:bg-chandra-gold-active',
  secondary: 'bg-chandra-indigo-cta text-chandra-text-primary hover:bg-chandra-indigo-hover active:bg-chandra-indigo-active',
  ghost: 'border border-chandra-gold/50 text-chandra-gold hover:bg-chandra-gold/10 active:bg-chandra-gold/15',
  quiet: 'border border-white/10 bg-chandra-bg-elevated text-chandra-text-secondary hover:border-white/20 hover:text-chandra-text-primary active:bg-chandra-bg-surface',
  danger: 'bg-chandra-error text-chandra-text-primary hover:brightness-110 active:brightness-95',
}

const sizes = {
  sm: 'min-h-[44px] px-3 py-2 text-control',
  md: 'min-h-[44px] px-4 py-2.5 text-control',
  lg: 'min-h-[48px] px-5 py-3 text-control',
}

const shapes = {
  control: 'rounded-control',
  pill: 'rounded-pill',
  circle: 'rounded-circle',
  icon: 'rounded-icon',
}

const Button = ({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  shape = 'control',
  className = '',
  children,
  type,
  ...props
}) => (
  <Component
    type={Component === 'button' ? (type || 'button') : undefined}
    className={[
      'inline-flex items-center justify-center gap-2 font-semibold transition-all',
      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chandra-focus',
      'disabled:cursor-not-allowed disabled:bg-chandra-bg-elevated disabled:text-chandra-text-disabled disabled:opacity-60',
      variants[variant] || variants.primary,
      sizes[size] || sizes.md,
      shapes[shape] || shapes.control,
      className,
    ].filter(Boolean).join(' ')}
    {...props}
  >
    {children}
  </Component>
)

export default Button
