import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
  textClassName?: string;
}

const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  className = '', 
  showText = true, 
  textClassName = '' 
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* SVG Logo */}
      <div className={`${sizeClasses[size]} flex-shrink-0`}>
        <svg 
          viewBox="0 0 200 200" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <defs>
            <linearGradient id="triangleGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{stopColor: '#1E88E5', stopOpacity: 1}} />
              <stop offset="100%" style={{stopColor: '#0D47A1', stopOpacity: 1}} />
            </linearGradient>
            <linearGradient id="triangleGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{stopColor: '#42A5F5', stopOpacity: 1}} />
              <stop offset="100%" style={{stopColor: '#1976D2', stopOpacity: 1}} />
            </linearGradient>
            <linearGradient id="boltGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{stopColor: '#FFA726', stopOpacity: 1}} />
              <stop offset="100%" style={{stopColor: '#FB8C00', stopOpacity: 1}} />
            </linearGradient>
          </defs>
          
          {/* Main triangle shape */}
          <path 
            d="M50 30 L150 30 L170 60 L170 140 L150 170 L50 170 L30 140 L30 60 Z" 
            fill="url(#triangleGradient1)" 
          />
          
          {/* Inner triangle */}
          <path 
            d="M60 50 L140 50 L155 70 L155 130 L140 150 L60 150 L45 130 L45 70 Z" 
            fill="url(#triangleGradient2)" 
          />
          
          {/* Lightning bolt */}
          <path 
            d="M90 60 L120 60 L105 90 L125 90 L110 140 L85 100 L105 100 L90 60 Z" 
            fill="url(#boltGradient)" 
          />
          
          {/* Highlights for 3D effect */}
          <path 
            d="M50 30 L150 30 L170 60 L150 50 L60 50 L45 70 L30 60 Z" 
            fill="rgba(255,255,255,0.3)" 
          />
          <path 
            d="M30 60 L30 140 L45 130 L45 70 Z" 
            fill="rgba(255,255,255,0.2)" 
          />
        </svg>
      </div>
      
      {/* Text */}
      {showText && (
        <span className={`font-bold text-gray-900 ${textSizeClasses[size]} ${textClassName}`}>
          AmpTrack
        </span>
      )}
    </div>
  );
};

export default Logo; 