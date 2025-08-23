import React from "react"

const Logo = ({ size = "80", className = "" }) => {
  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <img 
        src="/logo.png" 
        alt="Alliance CropCraft Limited" 
        className={`rounded-full object-cover shadow-sm border-1 border-white`}
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    </div>
  )
}

// Fallback SVG Logo Component (if image fails to load)
export const SVGLogo = ({ size = "80", className = "" }) => (
  <div className={`inline-flex items-center justify-center ${className}`}>
    <svg width={size} height={size} viewBox="0 0 80 80" className="animate-logo-glow">
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="25%" stopColor="#16a34a" />
          <stop offset="50%" stopColor="#15803d" />
          <stop offset="75%" stopColor="#14532d" />
          <stop offset="100%" stopColor="#365314" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <circle cx="40" cy="40" r="38" fill="url(#logoGradient)" filter="url(#glow)" />
      {/* Farm Elements */}
      <g transform="translate(40,40)">
        {/* Wheat stalks */}
        <path d="M-12,-15 L-12,15 M-8,-15 L-8,15 M-4,-15 L-4,15" stroke="#fbbf24" strokeWidth="2" opacity="0.8"/>
        <path d="M-14,-15 L-10,-15 M-14,-10 L-10,-10 M-14,-5 L-10,-5 M-14,0 L-10,0 M-14,5 L-10,5 M-14,10 L-10,10" stroke="#fbbf24" strokeWidth="1" opacity="0.6"/>
        
        {/* Barn/House */}
        <polygon points="4,-10 12,-5 12,10 4,10" fill="#dc2626" opacity="0.9"/>
        <polygon points="4,-10 8,-15 12,-10 12,-5 4,-5" fill="#b91c1c"/>
        
        {/* Tree */}
        <circle cx="18" cy="5" r="6" fill="#16a34a" opacity="0.8"/>
        <rect x="17" y="8" width="2" height="8" fill="#92400e" opacity="0.8"/>
      </g>
    </svg>
  </div>
)

export default Logo