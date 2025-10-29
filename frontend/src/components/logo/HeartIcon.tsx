/**
 * HeartIcon Component
 * 
 * Uses Font Awesome heart-pulse icon for a clean, professional medical logo.
 * 
 * @component
 * @example
 * <HeartIcon size="default" />
 */

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeartbeat } from '@fortawesome/free-solid-svg-icons';

export type HeartIconSize = 'small' | 'default' | 'large' | 'xlarge';

interface HeartIconProps {
  /**
   * Size variant of the heart icon
   * @default 'default'
   */
  size?: HeartIconSize;
  
  /**
   * Custom className for additional styling
   */
  className?: string;
  
  /**
   * Custom heart color (default: blue)
   */
  heartColor?: string;
}

// Use font-size classes for Font Awesome icons instead of width/height
const SIZE_MAP: Record<HeartIconSize, string> = {
  small: 'text-xl',      // 20px
  default: 'text-3xl',   // 30px
  large: 'text-5xl',     // 48px
  xlarge: 'text-7xl',    // 72px
};

export const HeartIcon: React.FC<HeartIconProps> = ({
  size = 'default',
  className = '',
  heartColor = '#3B82F6',
}) => {
  const sizeClass = SIZE_MAP[size];

  return (
    <FontAwesomeIcon 
      icon={faHeartbeat}
      className={`${sizeClass} ${className}`}
      style={{ color: heartColor }}
      aria-label="Heart with ECG pulse"
    />
  );
};