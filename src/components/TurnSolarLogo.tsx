export function TurnSolarLogo({ width = 160 }: { width?: number }) {
  const h = Math.round(width * 0.36)
  return (
    <svg width={width} height={h} viewBox="0 0 440 160" xmlns="http://www.w3.org/2000/svg">
      <text x="0" y="115" fontFamily="Arial, Helvetica, sans-serif" fontSize="90" fontWeight="700" letterSpacing="-2" fill="white">
        turn<tspan fill="#7DBF2E">solar</tspan>
      </text>
      <circle cx="390" cy="48" r="10" fill="#7DBF2E"/>
      <line x1="390" y1="28" x2="390" y2="22" stroke="#7DBF2E" strokeWidth="3" strokeLinecap="round"/>
      <line x1="390" y1="68" x2="390" y2="74" stroke="#7DBF2E" strokeWidth="3" strokeLinecap="round"/>
      <line x1="370" y1="48" x2="364" y2="48" stroke="#7DBF2E" strokeWidth="3" strokeLinecap="round"/>
      <line x1="410" y1="48" x2="416" y2="48" stroke="#7DBF2E" strokeWidth="3" strokeLinecap="round"/>
      <line x1="376" y1="34" x2="372" y2="30" stroke="#7DBF2E" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="404" y1="62" x2="408" y2="66" stroke="#7DBF2E" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="404" y1="34" x2="408" y2="30" stroke="#7DBF2E" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="376" y1="62" x2="372" y2="66" stroke="#7DBF2E" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )
}
