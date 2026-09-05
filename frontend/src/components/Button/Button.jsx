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
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;

  const renderIcon = (pos) => {
    if (!Icon || iconPosition !== pos) return null;

    if (React.isValidElement(Icon)) {
      return React.cloneElement(Icon, {
        className: `btn__icon btn__icon--${pos} ${Icon.props.className || ''}`.trim(),
        'aria-hidden': 'true',
      });
    }

    if (typeof Icon === 'function' || (typeof Icon === 'object' && Icon !== null)) {
      const Component = Icon;
      return <Component size={iconSize} className={`btn__icon btn__icon--${pos}`} aria-hidden="true" />;
    }

    return null;
  };

  return (
    <button
      type={type}
      className={`btn btn--${variant} btn--${size} ${className}`}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      {...rest}
    >
      {renderIcon('left')}
      <span className="btn__text">{children}</span>
      {renderIcon('right')}
    </button>
  );
}
