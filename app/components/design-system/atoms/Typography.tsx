import React from 'react';
import { colors } from '../../../styles/colors';

type TypographyVariant = 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'caption';

export interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  variant?: TypographyVariant;
  as?: React.ElementType;
  theme?: 'app' | 'dark' | 'light';
  muted?: boolean;
}

export const Typography: React.FC<TypographyProps> = ({
  variant = 'body',
  as,
  theme = 'app',
  muted = false,
  children,
  style,
  ...props
}) => {
  const Component = as || (['h1', 'h2', 'h3'].includes(variant) ? variant : 'p') as React.ElementType;

  const getVariantStyles = () => {
    switch (variant) {
      case 'h1': return { fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.05em', lineHeight: 1.1 };
      case 'h2': return { fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.2 };
      case 'h3': return { fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.3 };
      case 'small': return { fontSize: '0.85rem', lineHeight: 1.5 };
      case 'caption': return { fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase' as const };
      case 'body':
      default: return { fontSize: '1rem', lineHeight: 1.6 };
    }
  };

  const getColorStyle = () => {
    if (theme === 'app') {
      return muted ? 'var(--muted)' : 'inherit';
    }
    if (theme === 'dark') {
      return muted ? colors.text.darkApp.muted : colors.text.darkApp.primary;
    } else {
      return muted ? colors.text.lightDoc.muted : colors.text.lightDoc.primary;
    }
  };

  return (
    <Component
      style={{
        margin: 0,
        color: getColorStyle(),
        ...getVariantStyles(),
        ...style,
      }}
      {...props}
    >
      {children}
    </Component>
  );
};
