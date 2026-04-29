import { CSSProperties, ReactNode } from 'react';
import { BASE_RADIUS } from './tokens';

export const MEDIUM_W = 329;
export const MEDIUM_H = 155;

export interface MediumWidgetFrameProps {
  background: string;
  scale?: number;
  onTap?: () => void;
  children: ReactNode;
  style?: CSSProperties;
  ariaLabel?: string;
}

export function MediumWidgetFrame({
  background,
  scale = 1,
  onTap,
  children,
  style,
  ariaLabel,
}: MediumWidgetFrameProps) {
  return (
    <div
      role={onTap ? 'button' : undefined}
      aria-label={ariaLabel}
      onClick={onTap}
      style={{
        width: `${MEDIUM_W * scale}px`,
        height: `${MEDIUM_H * scale}px`,
        borderRadius: `${BASE_RADIUS * scale}px`,
        backgroundColor: background,
        position: 'relative',
        overflow: 'hidden',
        cursor: onTap ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
