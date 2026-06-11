"use client";

interface MayflyIconProps {
  size?: number;
  color?: string;
  className?: string;
}

export default function MayflyIcon({ size = 40, color = "white", className = "" }: MayflyIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Body */}
      <ellipse cx="50" cy="55" rx="5" ry="22" fill={color} />
      {/* Head */}
      <circle cx="50" cy="31" r="6" fill={color} />
      {/* Left wing */}
      <ellipse cx="28" cy="36" rx="22" ry="10" fill={color} opacity="0.9" transform="rotate(-15 28 36)" />
      {/* Right wing */}
      <ellipse cx="72" cy="36" rx="22" ry="10" fill={color} opacity="0.9" transform="rotate(15 72 36)" />
      {/* Antennae */}
      <line x1="47" y1="26" x2="37" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="53" y1="26" x2="63" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      {/* Legs */}
      <line x1="46" y1="46" x2="32" y2="52" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="46" y1="50" x2="30" y2="58" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="54" y1="46" x2="68" y2="52" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="54" y1="50" x2="70" y2="58" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      {/* Tails */}
      <line x1="47" y1="77" x2="42" y2="93" stroke={color} strokeWidth="1" strokeLinecap="round" />
      <line x1="53" y1="77" x2="58" y2="93" stroke={color} strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}
