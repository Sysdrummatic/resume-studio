import React, { ButtonHTMLAttributes } from 'react';

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
          background: 'var(--portal-button-primary-bg)',
          color: 'var(--portal-on-accent)',
          border: '1px solid var(--portal-button-primary-border)',
          boxShadow: 'var(--portal-button-primary-shadow)',
        };
      case 'secondary':
        return {
          background: 'var(--portal-card-bg-muted)',
          color: 'var(--text)',
          border: '1px solid var(--portal-border)',
        };
      case 'ghost':
        return {
          background: 'var(--portal-control-bg)',
          color: 'var(--text)',
          border: '1px solid var(--portal-control-border)',
          boxShadow: 'var(--portal-control-shadow)',
        };
      case 'danger':
        return {
          background: 'var(--portal-danger-bg)',
          color: 'var(--portal-danger-text)',
          border: '1px solid var(--portal-danger-border)',
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
