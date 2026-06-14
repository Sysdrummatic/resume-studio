import React from 'react';

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
      case 'h1': return { fontSize: 'var(--font-size-2xl)', fontWeight: 700, letterSpacing: 'var(--tracking-tight)', lineHeight: 'var(--leading-tight)' };
      case 'h2': return { fontSize: 'var(--font-size-xl)', fontWeight: 700, letterSpacing: 'var(--tracking-snug)', lineHeight: 'var(--leading-snug)' };
      case 'h3': return { fontSize: 'var(--font-size-lg)', fontWeight: 600, letterSpacing: 'var(--tracking-normal)', lineHeight: 'var(--leading-normal)' };
      case 'small': return { fontSize: 'var(--font-size-sm)', lineHeight: 'var(--leading-relaxed)' };
      case 'caption': return { fontSize: 'var(--font-size-xs)', letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase' as const };
      case 'body':
      default: return { fontSize: 'var(--font-size-base)', letterSpacing: 'var(--tracking-normal)', lineHeight: 'var(--leading-relaxed)' };
    }
  };

  const getColorStyle = () => {
    if (theme === 'app') {
      return muted ? 'var(--muted)' : 'inherit';
    }
    if (theme === 'dark') {
      return muted ? 'var(--text-dark-muted)' : 'var(--text-dark-primary)';
    } else {
      return muted ? 'var(--text-light-muted)' : 'var(--text-light-primary)';
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
