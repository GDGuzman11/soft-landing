import { CSSProperties, ReactNode } from 'react';
import { BASE_RADIUS, BASE_SIZE } from './tokens';

export interface WidgetFrameProps {
  background: string;
  scale?: number;
  onTap?: () => void;
  children: ReactNode;
  style?: CSSProperties;
  ariaLabel?: string;
}

export function WidgetFrame({
  background,
  scale = 1,
  onTap,
  children,
  style,
  ariaLabel,
}: WidgetFrameProps) {
  const size = BASE_SIZE * scale;
  const radius = BASE_RADIUS * scale;

  return (
    <div
      role={onTap ? 'button' : undefined}
      aria-label={ariaLabel}
      onClick={onTap}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${radius}px`,
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
