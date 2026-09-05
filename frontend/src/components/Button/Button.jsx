import React from 'react';
import './Button.css';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon = null,
  iconPosition = 'left',
  disabled = false,
  onClick,
  type = 'button',
  ariaLabel,
  className = '',
  ...rest
}) {
  return (
    <button
      type={type}
      className={`btn btn--${variant} btn--${size} ${className}`}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      {...rest}
    >
      {Icon && iconPosition === 'left' && (
        <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} className="btn__icon btn__icon--left" aria-hidden="true" />
      )}
      <span className="btn__text">{children}</span>
      {Icon && iconPosition === 'right' && (
        <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} className="btn__icon btn__icon--right" aria-hidden="true" />
      )}
    </button>
  );
}
