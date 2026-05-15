interface PlaceholderImageProps {
  label: string;
  className?: string;
}

export default function PlaceholderImage({
  label,
  className = "",
}: PlaceholderImageProps) {
  return (
    <svg
      viewBox="0 0 600 500"
      className={`w-full block ${className}`}
      style={{ borderRadius: 4 }}
    >
      <defs>
        <linearGradient id="stoneGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3a332c" />
          <stop offset="50%" stopColor="#2a2419" />
          <stop offset="100%" stopColor="#1f1a14" />
        </linearGradient>
        <filter id="grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="4"
          />
          <feColorMatrix type="saturate" values="0" />
          <feBlend in="SourceGraphic" mode="multiply" />
        </filter>
      </defs>
      <rect width="600" height="500" fill="url(#stoneGrad)" />
      <rect
        width="600"
        height="500"
        fill="rgba(0,0,0,0.12)"
        filter="url(#grain)"
      />
      {/* Simulated carved elements */}
      <g opacity="0.35" stroke="#c8a96e" strokeWidth="1.5" fill="none">
        {/* E01 - profile head */}
        <path d="M 140 80 Q 160 50 200 55 Q 240 60 250 90 Q 255 120 240 140 Q 220 160 200 155 Q 180 150 170 130 Q 160 110 140 80 Z" />
        <circle cx="210" cy="85" r="5" />
        <path d="M 235 100 Q 250 95 260 105" />
        {/* E02 - three dots */}
        <circle cx="380" cy="120" r="8" />
        <circle cx="375" cy="165" r="8" />
        <circle cx="385" cy="210" r="8" />
        {/* E03 - lower block */}
        <rect x="100" y="310" width="320" height="130" rx="4" />
        <path d="M 130 340 L 390 340" />
        <path d="M 130 380 Q 260 370 390 380" />
        <path d="M 160 410 L 360 410" />
      </g>
      <text
        x="300"
        y="484"
        textAnchor="middle"
        fill="#b8ac98"
        fontFamily="'Cinzel', serif"
        fontSize="11"
        letterSpacing="2"
        opacity="0.6"
      >
        {label}
      </text>
    </svg>
  );
}
