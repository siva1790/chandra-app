const variants = {
  standard: 'border-white/10 bg-chandra-bg-surface',
  highlighted: 'border-chandra-gold/35 bg-chandra-bg-surface',
  elevated: 'border-white/10 bg-chandra-bg-elevated',
  alert: 'border-chandra-error/45 bg-chandra-error/20',
}

const Card = ({
  as: Component = 'section',
  variant = 'standard',
  className = '',
  children,
  ...props
}) => (
  <Component
    className={[
      'rounded-2xl border p-4',
      variants[variant] || variants.standard,
      className,
    ].filter(Boolean).join(' ')}
    {...props}
  >
    {children}
  </Component>
)

export default Card
