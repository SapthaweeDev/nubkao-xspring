import React from 'react';

interface TeamStepLogoProps {
  size?: number;
  className?: string;
  variant?: 'default' | 'light' | 'dark';
}

export function TeamStepLogo({ size = 40, className = '', variant = 'default' }: TeamStepLogoProps) {
  const colors = {
    default: {
      primary: '#4338ca',
      secondary: '#312e81',
      accent: '#6366f1',
    },
    light: {
      primary: '#ffffff',
      secondary: '#e0e7ff',
      accent: '#c7d2fe',
    },
    dark: {
      primary: '#1e1b4b',
      secondary: '#312e81',
      accent: '#4338ca',
    },
  };

  const colorScheme = colors[variant];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background circle */}
      <circle cx="50" cy="50" r="48" fill={colorScheme.primary} opacity="0.1" />
      
      {/* Team circle pattern - representing team members */}
      <circle cx="50" cy="30" r="3" fill={colorScheme.accent} opacity="0.4" />
      <circle cx="40" cy="35" r="3" fill={colorScheme.accent} opacity="0.4" />
      <circle cx="60" cy="35" r="3" fill={colorScheme.accent} opacity="0.4" />
      
      {/* Main footstep icon - left foot */}
      <g transform="translate(35, 45)">
        {/* Heel */}
        <ellipse cx="5" cy="18" rx="6" ry="8" fill={colorScheme.primary} />
        {/* Ball of foot */}
        <ellipse cx="5" cy="8" rx="9" ry="7" fill={colorScheme.primary} />
        {/* Toes */}
        <circle cx="2" cy="2" r="2.5" fill={colorScheme.primary} />
        <circle cx="7" cy="1" r="2.5" fill={colorScheme.primary} />
        <circle cx="12" cy="2" r="2.5" fill={colorScheme.primary} />
        <circle cx="16" cy="4" r="2" fill={colorScheme.primary} />
      </g>
      
      {/* Main footstep icon - right foot (slightly behind) */}
      <g transform="translate(48, 52)" opacity="0.7">
        {/* Heel */}
        <ellipse cx="5" cy="18" rx="6" ry="8" fill={colorScheme.secondary} />
        {/* Ball of foot */}
        <ellipse cx="5" cy="8" rx="9" ry="7" fill={colorScheme.secondary} />
        {/* Toes */}
        <circle cx="2" cy="2" r="2.5" fill={colorScheme.secondary} />
        <circle cx="7" cy="1" r="2.5" fill={colorScheme.secondary} />
        <circle cx="12" cy="2" r="2.5" fill={colorScheme.secondary} />
        <circle cx="16" cy="4" r="2" fill={colorScheme.secondary} />
      </g>
      
      {/* Decorative arc - representing progress/tracking */}
      <path
        d="M 25 75 Q 50 65 75 75"
        stroke={colorScheme.accent}
        strokeWidth="2"
        fill="none"
        opacity="0.5"
        strokeLinecap="round"
      />
      
      {/* Small dots representing steps/progress */}
      <circle cx="35" cy="72" r="1.5" fill={colorScheme.accent} opacity="0.6" />
      <circle cx="50" cy="67" r="1.5" fill={colorScheme.accent} opacity="0.6" />
      <circle cx="65" cy="72" r="1.5" fill={colorScheme.accent} opacity="0.6" />
    </svg>
  );
}

// Thumbnail version - larger, more detailed for preview images
export function TeamStepThumbnail() {
  return (
    <div className="w-full h-full flex items-center justify-center" 
         style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%)' }}>
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-48 h-48 rounded-full bg-white opacity-5 blur-3xl"></div>
        </div>
        
        {/* Main logo */}
        <div className="relative">
          <TeamStepLogo size={120} variant="light" />
        </div>
        
        {/* App name */}
        <div className="text-center mt-4">
          <h1 className="text-white text-2xl font-bold tracking-tight">ระบบนับก้าวทีม</h1>
          <p className="text-indigo-200 text-sm mt-1">ช้ากว่าเต่า ก็พวกเรานี่แหละ</p>
        </div>
      </div>
      
      {/* Decorative circles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: `${20 + (i * 13 % 40)}px`,
              height: `${20 + (i * 13 % 40)}px`,
              left: `${(i * 23 % 100)}%`,
              top: `${(i * 31 % 100)}%`,
              opacity: 0.03 + (i % 5) * 0.02,
            }}
          />
        ))}
      </div>
    </div>
  );
}
