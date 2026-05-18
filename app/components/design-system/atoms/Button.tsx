import React, { ButtonHTMLAttributes } from 'react';
import { colors } from '../../../styles/colors';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon,
  style,
  ...props 
}) => {
  // Te style docelowo zastąpimy klasami Tailwind (np. bg-brand-primary),
  // ale do czasu pełnej migracji używamy inline-styles z Color Hub
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.secondary})`,
          color: '#ffffff',
          border: `1px solid ${colors.brand.primary}`,
        };
      case 'ghost':
        return {
          background: colors.dark.glassBgLight,
          color: colors.text.darkApp.primary,
          border: `1px solid ${colors.dark.glassBorder}`,
        };
      case 'danger':
        return {
          background: 'rgba(180, 30, 30, 0.15)',
          color: colors.semantic.error.text,
          border: `1px solid ${colors.semantic.error.border}`,
        };
      default:
        return {};
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm': return { padding: '6px 12px', fontSize: '14px' };
      case 'lg': return { padding: '12px 24px', fontSize: '18px' };
      default: return { padding: '10px 16px', fontSize: '16px' };
    }
  };

  return (
    <button
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        borderRadius: '12px', // ze skali radius.button
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        opacity: props.disabled ? 0.6 : 1,
        fontFamily: 'inherit',
        fontWeight: 600,
        ...getVariantStyles(),
        ...getSizeStyles(),
        ...style,
      }}
      {...props}
    >
      {icon && <span style={{ display: 'flex' }}>{icon}</span>}
      {children}
    </button>
  );
};
