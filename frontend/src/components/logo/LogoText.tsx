/**
 * LogoText Component
 * 
 * Text component for the HealthTrack logo.
 * Provides consistent typography and spacing.
 * 
 * @component
 */

import React from 'react';
import clsx from 'clsx';

export type LogoTextSize = 'small' | 'default' | 'large' | 'xlarge';

interface LogoTextProps {
  /**
   * Size variant matching the icon size
   * @default 'default'
   */
  size?: LogoTextSize;
  
  /**
   * Custom text content
   */
  text?: string;
  
  /**
   * Custom className for additional styling
   */
  className?: string;
  
  /**
   * Text color variant
   * @default 'default'
   */
  variant?: 'default' | 'light' | 'dark';
}

/**
 * Size mapping for text variants - matched to icon sizes
 */
const TEXT_SIZE_MAP: Record<LogoTextSize, string> = {
  small: 'text-lg',      // Matches text-xl icon
  default: 'text-2xl',   // Matches text-3xl icon
  large: 'text-4xl',     // Matches text-5xl icon
  xlarge: 'text-6xl',    // Matches text-7xl icon
};

/**
 * Color variant mapping - using the same blue as the heart icon (#3B82F6)
 */
const COLOR_VARIANT_MAP = {
  default: 'text-blue-500', // Same as heart icon default
  light: 'text-blue-400',
  dark: 'text-blue-600',
};

export const LogoText: React.FC<LogoTextProps> = ({
  size = 'default',
  text = 'Vitals',
  className = '',
  variant = 'default',
}) => {
  const textSizeClass = TEXT_SIZE_MAP[size];
  const colorClass = COLOR_VARIANT_MAP[variant];
  
  return (
    <span
      className={clsx(
        'font-bold tracking-tight',
        textSizeClass,
        colorClass,
        className
      )}
      aria-label={text}
    >
      {text}
    </span>
  );
};