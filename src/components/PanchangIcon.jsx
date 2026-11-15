// Shared Panchang mark on the same 24×24 grid as the surrounding Lucide icons.
const PanchangIcon = ({ size = 24, color = 'currentColor', strokeWidth = 1.75, className = '', ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden={props['aria-label'] || props['aria-labelledby'] ? undefined : true}
    focusable="false"
    className={`chandra-panchang-icon ${className}`.trim()}
    {...props}
  >
    <path d="M3 19.5V5a3 3 0 0 1 3-3h15v15H5.5a2.5 2.5 0 0 0 0 5H19v-5" />
    <path d="M12 6h3.5M12 6v7H8.5M8.5 6v3.5h7V13" strokeWidth={strokeWidth * 5 / 7} />
  </svg>
)

export default PanchangIcon
