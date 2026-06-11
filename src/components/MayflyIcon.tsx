"use client";

interface Props {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function MayflyIcon({ size = 40, color = "white", className = "", style }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      {/* Left wing — large oval, swept back */}
      <ellipse cx="62" cy="80" rx="58" ry="28" fill={color}
        transform="rotate(-18 62 80)" />
      {/* Right wing — large oval, swept back */}
      <ellipse cx="138" cy="80" rx="58" ry="28" fill={color}
        transform="rotate(18 138 80)" />

      {/* Thorax / body join */}
      <circle cx="100" cy="82" r="10" fill={color} />
      {/* Head */}
      <circle cx="100" cy="68" r="8" fill={color} />

      {/* Abdomen — elongated teardrop */}
      <ellipse cx="100" cy="128" rx="10" ry="38" fill={color} />
      {/* Abdomen tip taper */}
      <ellipse cx="100" cy="158" rx="5" ry="10" fill={color} />

      {/* Left antenna */}
      <line x1="95" y1="62" x2="78" y2="38" stroke={color} strokeWidth="3" strokeLinecap="round" />
      {/* Right antenna */}
      <line x1="105" y1="62" x2="122" y2="38" stroke={color} strokeWidth="3" strokeLinecap="round" />

      {/* Legs — 3 pairs radiating from thorax */}
      <line x1="91"  y1="86" x2="64"  y2="102" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="89"  y1="90" x2="58"  y2="112" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="90"  y1="95" x2="62"  y2="120" stroke={color} strokeWidth="2"   strokeLinecap="round" />
      <line x1="109" y1="86" x2="136" y2="102" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="111" y1="90" x2="142" y2="112" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="110" y1="95" x2="138" y2="120" stroke={color} strokeWidth="2"   strokeLinecap="round" />
    </svg>
  );
}
