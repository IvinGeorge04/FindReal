import React from 'react';
import './Card.css';

export default function Card({
  children,
  title,
  subtitle,
  icon: Icon = null,
  headerAction = null,
  footer = null,
  variant = 'surface',
  elevation = 'md',
  className = '',
  as: Component = 'div',
  ...rest
}) {
  return (
    <Component 
      className={`card-box card-box--${variant} card-box--elevation-${elevation} ${className}`}
      {...rest}
    >
      {(title || subtitle || Icon || headerAction) && (
        <div className="card-box__header">
          <div className="card-box__title-group">
            {Icon && (
              <div className="card-box__icon-wrapper" aria-hidden="true">
                <Icon size={18} className="card-box__icon" />
              </div>
            )}
            <div>
              {title && <h3 className="card-box__title">{title}</h3>}
              {subtitle && <p className="card-box__subtitle">{subtitle}</p>}
            </div>
          </div>
          {headerAction && <div className="card-box__action">{headerAction}</div>}
        </div>
      )}

      <div className="card-box__body">{children}</div>

      {footer && <div className="card-box__footer">{footer}</div>}
    </Component>
  );
}
