/**
 * Logo Component
 * 
 * Main logo component for HealthTrack application.
 * Combines the heart icon with ECG waveform and optional text.
 * 
 * This component follows a modular architecture:
 * - HeartIcon: The heart symbol with ECG line
 * - LogoText: The text portion (if included)
 * - Logo: Main component that orchestrates both
 * 
 * @component
 * @example
 * // Basic usage
 * <Logo />
 * 
 * // With custom size
 * <Logo size="large" showText={true} />
 * 
 * // Icon only
 * <Logo showText={false} />
 */

import React from 'react';
import clsx from 'clsx';
import { HeartIcon, HeartIconSize } from './logo/HeartIcon';
import { LogoText, LogoTextSize } from './logo/LogoText';

export type LogoSize = 'small' | 'default' | 'large' | 'xl';

interface LogoProps {
  /**
   * Size variant for the entire logo
   * @default 'default'
   */
  size?: LogoSize;
  
  /**
   * Whether to display the text alongside the icon
   * @default true
   */
  showText?: boolean;
  
  /**
   * Custom text content (overrides default "HealthTrack")
   */
  text?: string;
  
  /**
   * Layout direction
   * @default 'horizontal'
   */
  direction?: 'horizontal' | 'vertical';
  
  /**
   * Gap between icon and text
   * @default 'default'
   */
  gap?: 'small' | 'default' | 'large';
  
  /**
   * Custom className for the container
   */
  className?: string;
  
  /**
   * Custom heart fill color
   */
  heartColor?: string;
  
  /**
   * Custom ECG line color
   */
  ecgLineColor?: string;
  
  /**
   * Text color variant
   */
  textVariant?: 'default' | 'light' | 'dark';
}

/**
 * Gap spacing mapping
 */
const GAP_MAP = {
  small: 'gap-1',
  default: 'gap-1',
  large: 'gap-2',
};

/**
 * Direction layout mapping
 */
const DIRECTION_MAP = {
  horizontal: 'flex-row items-center',
  vertical: 'flex-col items-center',
};

export default function Logo({
  size = 'large',
  showText = true,
  text,
  direction = 'horizontal',
  gap = 'default',
  className = '',
  heartColor,
  ecgLineColor,
  textVariant = 'default',
}: LogoProps) {
  const gapClass = GAP_MAP[gap];
  const directionClass = DIRECTION_MAP[direction];
  const iconSize = size as HeartIconSize;
  const textSize = size as LogoTextSize;

  return (
    <div
      className={clsx(
        'flex',
        directionClass,
        gapClass,
        className
      )}
      role="banner"
      aria-label="Vitals Logo"
    >
      {/* Heart Icon with ECG Waveform */}
      <HeartIcon
        size={iconSize}
        heartColor={heartColor}
      />
      
      {/* Optional Text */}
      {showText && (
        <LogoText
          size={textSize}
          text={text}
          variant={textVariant}
        />
      )}
    </div>
  );
}
