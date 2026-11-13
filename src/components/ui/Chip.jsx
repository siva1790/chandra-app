const variants = {
  tithi: 'border-[#5DA9E9]/30 bg-[#5DA9E9]/15 text-[#8EC8F5]',
  nakshatra: 'border-chandra-focus/25 bg-chandra-focus/10 text-chandra-focus',
  festival: 'border-chandra-success/30 bg-chandra-success/15 text-[#7ECFA6]',
  eclipse: 'border-chandra-warning/30 bg-chandra-warning/15 text-[#F0B060]',
}

const Chip = ({ variant = 'tithi', className = '', children, ...props }) => (
  <span
    className={[
      'inline-flex items-center gap-1 rounded-pill border px-2.5 py-1 text-xs font-medium',
      variants[variant] || variants.tithi,
      className,
    ].filter(Boolean).join(' ')}
    {...props}
  >
    {children}
  </span>
)

export default Chip
